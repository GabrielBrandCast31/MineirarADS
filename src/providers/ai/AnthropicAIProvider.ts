import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type {
  AdClassification,
  CopyAnalysis,
  CreativeAnalysis,
  GeneratedHook,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import { derived, inferred, observed } from "@/core/types/provenance";
import { CTA_LABEL } from "@/core/constants/meta";
import { computeCopyMetrics } from "@/core/copy/metrics";
import { analyzeCreativeHeuristic } from "@/core/creative/heuristics";
import { aspectRatioOf } from "@/core/types/creative";
import {
  AICapabilityError,
  AIProviderError,
  type AICapabilities,
  type AIProvider,
  type AnalyzeCopyInput,
  type AnalyzeCreativeInput,
  type ClassifyAdInput,
  type GenerateHooksInput,
  type GenerateInsightsInput,
  type TranscribeInput,
} from "./AIProvider";
import { HeuristicAIProvider } from "./HeuristicAIProvider";
import {
  classificationSchema,
  copyAnalysisSchema,
  creativeAnalysisSchema,
  hooksSchema,
  insightNarrativeSchema,
} from "./schemas";

const SYSTEM_PROMPT = `Você é analista sênior de mídia paga, especialista em copy e criativos de anúncios do mercado brasileiro.

Sua função é LER o material fornecido e devolver uma leitura estruturada.

Regras absolutas:
- Só afirme o que estiver no material. Se algo não estiver presente, devolva string vazia ou lista vazia.
- Nunca invente número, prazo, preço, resultado, faturamento ou ROAS. Esses dados não são públicos.
- Nunca afirme que um anúncio "converte", "vende bem" ou "é vencedor": você não tem acesso a performance.
- Ao citar um trecho, cite literalmente.
- Responda sempre em português do Brasil.
- Preencha "confidence" com honestidade: material curto ou ambíguo pede confiança baixa.`;

/**
 * Provider de IA sobre a Claude API (SDK oficial `@anthropic-ai/sdk`).
 *
 * Divisão de responsabilidade mantida rigorosamente:
 *  - métricas de texto, proporção, duração e Ad Score vêm do núcleo determinístico;
 *  - o modelo preenche apenas os campos interpretativos (`inferred`);
 *  - qualquer falha cai no `HeuristicAIProvider`, para a plataforma nunca parar.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly name = "anthropic";

  readonly capabilities: AICapabilities;

  private readonly client: Anthropic;
  private readonly model: string;
  private readonly fallback = new HeuristicAIProvider();

  constructor(options: { apiKey?: string; model?: string } = {}) {
    if (!options.apiKey) {
      throw new AIProviderError(
        "anthropic",
        "ANTHROPIC_API_KEY ausente. Configure a chave antes de selecionar AI_PROVIDER=anthropic.",
      );
    }
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? "claude-opus-5";
    this.capabilities = {
      llm: true,
      vision: true,
      transcription: false,
      model: this.model,
    };
  }

  private engineTag(): string {
    return `ai:anthropic:${this.model}`;
  }

  /* ------------------------------------------------------------- copy --- */

  async analyzeCopy(input: AnalyzeCopyInput): Promise<CopyAnalysis> {
    const ctaLabel =
      input.ctaLabel ?? (input.ad.callToAction ? CTA_LABEL[input.ad.callToAction] : null);
    // Métricas contadas localmente: o modelo não participa disso.
    const metrics = computeCopyMetrics(input.ad.bodyText ?? input.ad.headline);

    const prompt = [
      input.category ? `Categoria do anunciante: ${input.category}` : null,
      input.ad.headline ? `Título do anúncio: ${input.ad.headline}` : null,
      input.ad.linkDescription ? `Descrição do link: ${input.ad.linkDescription}` : null,
      ctaLabel ? `Botão de CTA: ${ctaLabel}` : null,
      "",
      "Texto principal do anúncio:",
      input.ad.bodyText ?? "(sem texto)",
      input.ad.bodyVariations.length > 1
        ? `\nOutras variações de texto do mesmo anúncio:\n${input.ad.bodyVariations
            .slice(1, 4)
            .map((v, i) => `[${i + 2}] ${v}`)
            .join("\n")}`
        : null,
    ]
      .filter((line) => line !== null)
      .join("\n");

    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
        output_config: { format: zodOutputFormat(copyAnalysisSchema) },
      });

      const parsed = response.parsed_output;
      if (!parsed) throw new AIProviderError(this.name, "Resposta sem saída estruturada.");
      const engine = this.engineTag();
      const confidence = parsed.confidence;
      const orNull = (value: string): string | null => (value.trim().length > 0 ? value : null);

      return {
        id: `copy_${input.ad.id}`,
        adId: input.ad.id,
        workspaceId: input.workspaceId,
        engine,
        hook: parsed.hook ? observed(parsed.hook, "ad_creative_body") : inferred(null, engine, 0.2),
        hookType: inferred(parsed.hook_type, engine, confidence),
        problem: inferred(orNull(parsed.problem), engine, confidence),
        promise: inferred(orNull(parsed.promise), engine, confidence),
        mechanism: inferred(orNull(parsed.mechanism), engine, confidence),
        benefits: inferred(parsed.benefits, engine, confidence),
        proof: inferred(parsed.proof, engine, confidence),
        objections: inferred(parsed.objections, engine, confidence),
        cta: ctaLabel ? observed(ctaLabel, "ad_creative_cta") : inferred(orNull(parsed.cta), engine, confidence),
        specificity: derived(
          specificityFrom(metrics),
          "heuristic:v1",
          "Densidade de números, preço e prazo — calculada localmente.",
        ),
        structure: inferred(parsed.structure, engine, confidence),
        emotions: inferred(parsed.emotions, engine, confidence),
        dominantEmotion: inferred(parsed.dominant_emotion, engine, confidence),
        metrics,
        createdAt: new Date().toISOString(),
      };
    } catch {
      // Falha de IA nunca derruba a análise: cai na heurística.
      return this.fallback.analyzeCopy(input);
    }
  }

  /* --------------------------------------------------------- criativo --- */

  async analyzeCreative(input: AnalyzeCreativeInput): Promise<CreativeAnalysis> {
    const base = analyzeCreativeHeuristic({
      creative: input.creative,
      adId: input.adId,
      workspaceId: input.workspaceId,
      ctaLabel: input.ctaLabel,
    });

    const imageUrl = input.creative.thumbnailUrl ?? input.creative.sourceUrl;
    // Vídeo não é analisável por visão estática: mantemos a leitura honesta.
    if (!imageUrl || input.creative.format === "video") return base;

    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: imageUrl } },
              {
                type: "text",
                text: [
                  "Descreva apenas o que é visível nesta peça publicitária.",
                  input.bodyText ? `Copy do anúncio (contexto): ${input.bodyText.slice(0, 600)}` : "",
                  `Proporção observada: ${aspectRatioOf(input.creative) ?? "desconhecida"}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            ],
          },
        ],
        output_config: { format: zodOutputFormat(creativeAnalysisSchema) },
      });

      const parsed = response.parsed_output;
      if (!parsed) return base;
      const engine = this.engineTag();
      const c = parsed.confidence;
      const orNull = (v: string): string | null => (v.trim().length > 0 ? v : null);

      return {
        ...base,
        engine,
        hasPerson: inferred(parsed.has_person, engine, c),
        hasOnScreenText: inferred(parsed.has_on_screen_text, engine, c),
        hasCaptions: inferred(parsed.has_captions, engine, c),
        hasProduct: inferred(parsed.has_product, engine, c),
        textDensity: inferred(parsed.text_density, engine, c),
        visualHeadline: base.visualHeadline.value
          ? base.visualHeadline
          : inferred(orNull(parsed.visual_headline), engine, c),
        visualCta: base.visualCta.value
          ? base.visualCta
          : inferred(orNull(parsed.visual_cta), engine, c),
        visualStructure: inferred(parsed.visual_structure, engine, c),
      };
    } catch {
      return base;
    }
  }

  /* --------------------------------------------------------- insights --- */

  /**
   * Os números do relatório continuam sendo contagens locais. O modelo só
   * escreve as leituras e as oportunidades a partir desses números.
   */
  async generateInsights(input: GenerateInsightsInput): Promise<InsightReport> {
    const base = await this.fallback.generateInsights(input);

    const summary = [
      `Amostra: ${base.sampleSize} anúncios${input.query ? ` para o termo "${input.query}"` : ""}.`,
      block("Ganchos", base.hooks),
      block("CTAs", base.ctas),
      block("Ângulos", base.angles),
      block("Formatos", base.formats),
      block("Estruturas de copy", base.copyStructures),
      block("Padrões visuais", base.visualPatterns),
      block("Objeções tratadas", base.objections),
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 3072,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              "Abaixo estão contagens reais sobre um conjunto de anúncios coletados da biblioteca pública da Meta.",
              "Escreva leituras usando SOMENTE estes números e aponte ângulos pouco explorados.",
              "Não afirme performance, faturamento ou conversão.",
              "",
              summary,
            ].join("\n"),
          },
        ],
        output_config: { format: zodOutputFormat(insightNarrativeSchema) },
      });

      const parsed = response.parsed_output;
      if (!parsed) return base;
      const engine = this.engineTag();

      return {
        ...base,
        engine,
        headlines: [
          ...base.headlines,
          ...parsed.readings.map((text) => inferred(text, engine, 0.6)),
        ],
        opportunities: parsed.opportunities.map((o) => inferred(o.text, engine, o.confidence)),
      };
    } catch {
      return base;
    }
  }

  /* ------------------------------------------------------------ hooks --- */

  async generateHooks(input: GenerateHooksInput): Promise<GeneratedHook[]> {
    const references = input.referenceAds
      .slice(0, 12)
      .map((ad, i) => `[${i + 1}] ${ad.headline ?? ""}\n${(ad.bodyText ?? "").slice(0, 400)}`)
      .join("\n\n---\n\n");

    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 3072,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              `Oferta: ${input.offerName}`,
              input.audience ? `Público: ${input.audience}` : "",
              "",
              "Anúncios de referência coletados da biblioteca pública:",
              references,
              "",
              `Escreva ${input.count ?? 6} ganchos NOVOS para essa oferta.`,
              "Não copie nem parafraseie os textos acima: use-os apenas para entender o ângulo do mercado.",
              "Não prometa resultado, número ou prazo que não esteja no material.",
              "Em 'rationale', explique em uma frase que padrão do mercado o gancho explora.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        output_config: { format: zodOutputFormat(hooksSchema) },
      });

      const parsed = response.parsed_output;
      if (!parsed) return this.fallback.generateHooks(input);
      return parsed.hooks.map((h) => ({
        text: h.text,
        hookType: h.hook_type,
        rationale: h.rationale,
      }));
    } catch {
      return this.fallback.generateHooks(input);
    }
  }

  /* --------------------------------------------------- classificação --- */

  async classifyAd(input: ClassifyAdInput): Promise<AdClassification> {
    try {
      const response = await this.client.messages.parse({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              input.category ? `Categoria declarada: ${input.category}` : "",
              `Título: ${input.ad.headline ?? "(sem título)"}`,
              `Texto: ${(input.ad.bodyText ?? "(sem texto)").slice(0, 1200)}`,
              "",
              "Classifique nicho, etapa de funil, público provável e CTA mais adequado.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        output_config: { format: zodOutputFormat(classificationSchema) },
      });

      const parsed = response.parsed_output;
      if (!parsed) return this.fallback.classifyAd(input);
      const engine = this.engineTag();
      return {
        niche: inferred(parsed.niche, engine, parsed.confidence),
        funnelStage: inferred(parsed.funnel_stage, engine, parsed.confidence),
        audience: inferred(parsed.audience, engine, parsed.confidence),
        suggestedCta: inferred(parsed.suggested_cta, engine, parsed.confidence),
      };
    } catch {
      return this.fallback.classifyAd(input);
    }
  }

  /**
   * A Claude API não transcreve áudio. Transcrição exige um serviço de STT
   * (ex.: Whisper) atrás de outro provider — ver `docs/TRANSCRICAO.md`.
   */
  async transcribeVideo(_input: TranscribeInput): Promise<Transcription> {
    throw new AICapabilityError(this.name, "transcription");
  }
}

/* ------------------------------------------------------------ utilitários -- */

function block(title: string, items: Array<{ label: string; count: number; share: number }>): string {
  if (items.length === 0) return "";
  const lines = items
    .slice(0, 6)
    .map((i) => `- ${i.label}: ${i.count} (${Math.round(i.share * 100)}%)`)
    .join("\n");
  return `${title}:\n${lines}`;
}

function specificityFrom(metrics: ReturnType<typeof computeCopyMetrics>): number {
  if (metrics.wordCount === 0) return 0;
  const numberDensity = Math.min(1, metrics.numberCount / Math.max(4, metrics.wordCount / 12));
  const concrete = [metrics.hasPriceMention, metrics.hasUrgencyWindow].filter(Boolean).length / 2;
  return Number(Math.min(1, numberDensity * 0.6 + concrete * 0.4).toFixed(2));
}
