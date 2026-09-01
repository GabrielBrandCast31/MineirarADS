import type {
  AdClassification,
  CopyAnalysis,
  CreativeAnalysis,
  GeneratedHook,
  HookType,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import { inferred } from "@/core/types/provenance";
import { CTA_LABEL } from "@/core/constants/meta";
import { analyzeCopyHeuristic, classifyHook, HEURISTIC_ENGINE } from "@/core/copy/heuristics";
import { analyzeCreativeHeuristic } from "@/core/creative/heuristics";
import { buildInsightReport } from "@/core/insights/aggregate";
import { extractKeywords } from "@/core/text/keywords";
import { normalize } from "@/core/text/normalize";
import {
  AICapabilityError,
  type AICapabilities,
  type AIProvider,
  type AnalyzeCopyInput,
  type AnalyzeCreativeInput,
  type ClassifyAdInput,
  type GenerateHooksInput,
  type GenerateInsightsInput,
  type TranscribeInput,
} from "./AIProvider";

/**
 * Provider padrão: heurísticas determinísticas.
 *
 * Sem rede, sem custo, sem alucinação. É o baseline que mantém a plataforma
 * inteira funcional antes de qualquer chave de API ser configurada — e o
 * fallback quando o provider de LLM falha.
 */
export class HeuristicAIProvider implements AIProvider {
  readonly name = "heuristic";

  readonly capabilities: AICapabilities = {
    llm: false,
    vision: false,
    transcription: false,
    model: null,
  };

  async analyzeCopy(input: AnalyzeCopyInput): Promise<CopyAnalysis> {
    return analyzeCopyHeuristic({
      adId: input.ad.id,
      workspaceId: input.workspaceId,
      bodyText: input.ad.bodyText,
      headline: input.ad.headline,
      linkDescription: input.ad.linkDescription,
      ctaLabel: input.ctaLabel ?? (input.ad.callToAction ? CTA_LABEL[input.ad.callToAction] : null),
    });
  }

  async analyzeCreative(input: AnalyzeCreativeInput): Promise<CreativeAnalysis> {
    return analyzeCreativeHeuristic({
      creative: input.creative,
      adId: input.adId,
      workspaceId: input.workspaceId,
      ctaLabel: input.ctaLabel,
    });
  }

  async generateInsights(input: GenerateInsightsInput): Promise<InsightReport> {
    return buildInsightReport({
      workspaceId: input.workspaceId,
      ads: input.ads,
      analyses: input.analyses,
    });
  }

  /**
   * Sem LLM não há geração criativa honesta. Em vez de inventar texto,
   * devolvemos os ganchos observados nos anúncios de referência, ordenados
   * por recorrência — útil e verdadeiro.
   */
  async generateHooks(input: GenerateHooksInput): Promise<GeneratedHook[]> {
    const count = input.count ?? 6;
    const seen = new Set<string>();
    const out: GeneratedHook[] = [];

    for (const ad of input.referenceAds) {
      const raw = (ad.headline ?? ad.bodyText ?? "").split("\n")[0]?.trim();
      if (!raw) continue;
      const key = normalize(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        text: raw.slice(0, 160),
        hookType: classifyHook(raw).type,
        rationale: "Gancho observado nos anúncios coletados (não gerado por IA).",
      });
      if (out.length >= count) break;
    }
    return out;
  }

  async classifyAd(input: ClassifyAdInput): Promise<AdClassification> {
    const text = [input.ad.headline, input.ad.bodyText].filter(Boolean).join(" ");
    const keywords = extractKeywords([text], 3);
    const niche = input.category ?? keywords[0]?.term ?? "não identificado";
    const flat = normalize(text);

    const isBottom = /agende|orcamento|comprar|matricula|assine|contrate|whatsapp/.test(flat);
    const isTop = /descubra|voce sabia|entenda|saiba/.test(flat);
    const stage: AdClassification["funnelStage"]["value"] = isBottom
      ? "fundo"
      : isTop
        ? "topo"
        : "meio";

    return {
      niche: inferred(niche, HEURISTIC_ENGINE, 0.4),
      funnelStage: inferred(stage, HEURISTIC_ENGINE, 0.4),
      audience: inferred(
        "não determinado sem IA",
        HEURISTIC_ENGINE,
        0.1,
        "Requer um provider de LLM.",
      ),
      suggestedCta: inferred(
        input.ad.callToAction ?? "LEARN_MORE",
        HEURISTIC_ENGINE,
        0.3,
        "Repete o CTA observado.",
      ),
    };
  }

  async transcribeVideo(_input: TranscribeInput): Promise<Transcription> {
    throw new AICapabilityError(this.name, "transcription");
  }
}

/** Reexportado para uso em fallbacks e testes. */
export const HOOK_TYPES: HookType[] = [
  "pergunta",
  "afirmacao_polemica",
  "estatistica",
  "historia",
  "beneficio_direto",
  "negacao",
  "comando",
  "indefinido",
];
