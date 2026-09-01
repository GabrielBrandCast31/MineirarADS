import type { Ad } from "@/core/types/ad";
import type {
  CopyAnalysis,
  InsightItem,
  InsightReport,
} from "@/core/types/analysis";
import { HOOK_LABEL } from "@/core/types/analysis";
import { derived, inferred } from "@/core/types/provenance";
import { CTA_LABEL, FORMAT_LABEL } from "@/core/constants/meta";
import { aspectRatioOf } from "@/core/types/creative";
import { detectAngles } from "@/core/copy/heuristics";
import { extractKeywords } from "@/core/text/keywords";
import { normalize } from "@/core/text/normalize";
import { OBJECTION_MARKERS } from "@/core/copy/lexicon";

export const INSIGHTS_ENGINE = "heuristic:v1";

interface Counter {
  count: number;
  examples: string[];
}

class Tally {
  private readonly map = new Map<string, Counter>();

  add(label: string, example?: string | null): void {
    const entry = this.map.get(label) ?? { count: 0, examples: [] };
    entry.count += 1;
    if (example && entry.examples.length < 3 && !entry.examples.includes(example)) {
      entry.examples.push(example.slice(0, 160));
    }
    this.map.set(label, entry);
  }

  top(total: number, limit = 8): InsightItem[] {
    return [...this.map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([label, entry]) => ({
        label,
        count: entry.count,
        share: total > 0 ? Number((entry.count / total).toFixed(3)) : 0,
        examples: entry.examples,
      }));
  }
}

export interface InsightInput {
  workspaceId: string | null;
  ads: Ad[];
  /** Análises de copy correspondentes. Ausentes são simplesmente ignoradas. */
  analyses: CopyAnalysis[];
}

/**
 * Gera o relatório de insights de um conjunto de anúncios.
 *
 * Todo número aqui é contagem sobre dados observados. As frases de leitura
 * (`headlines`) são marcadas como `derived`; as recomendações
 * (`opportunities`) como `inferred`, porque envolvem juízo.
 */
export function buildInsightReport(
  input: InsightInput,
  now: Date = new Date(),
): InsightReport {
  const { ads, analyses } = input;
  const total = ads.length;
  const byAdId = new Map(analyses.map((a) => [a.adId, a]));

  const hooks = new Tally();
  const ctas = new Tally();
  const angles = new Tally();
  const promises = new Tally();
  const objections = new Tally();
  const formats = new Tally();
  const structures = new Tally();
  const visuals = new Tally();

  const promiseTexts: string[] = [];
  let videoCount = 0;
  let verticalCount = 0;
  let proofCount = 0;
  let questionHookCount = 0;
  let whatsappCount = 0;
  let priceCount = 0;
  let urgencyCount = 0;

  for (const ad of ads) {
    formats.add(FORMAT_LABEL[ad.format], ad.headline);
    if (ad.callToAction) ctas.add(CTA_LABEL[ad.callToAction], ad.headline);
    if (ad.format === "video") videoCount += 1;

    for (const creative of ad.creatives) {
      const ratio = aspectRatioOf(creative);
      if (ratio) {
        visuals.add(`Proporção ${ratio}`, ad.headline);
        if (ratio === "9:16" || ratio === "4:5") verticalCount += 1;
      }
      if (creative.durationSeconds != null) {
        visuals.add(durationBucket(creative.durationSeconds));
      }
      if (creative.format === "carousel") visuals.add("Carrossel com múltiplos cards");
    }

    const text = [ad.headline, ad.bodyText, ad.linkDescription].filter(Boolean).join(" ");
    for (const angle of detectAngles(text).slice(0, 3)) angles.add(angle, ad.headline);

    const flat = normalize(text);
    for (const marker of OBJECTION_MARKERS) {
      if (flat.includes(marker)) objections.add(`"${marker}"`, ad.bodyText);
    }

    const analysis = byAdId.get(ad.id);
    if (analysis) {
      hooks.add(HOOK_LABEL[analysis.hookType.value], analysis.hook.value);
      if (analysis.hookType.value === "pergunta") questionHookCount += 1;
      if (analysis.proof.value.length > 0) proofCount += 1;
      if (analysis.metrics.hasWhatsappMention) whatsappCount += 1;
      if (analysis.metrics.hasPriceMention) priceCount += 1;
      if (analysis.metrics.hasUrgencyWindow) urgencyCount += 1;
      if (analysis.promise.value) promiseTexts.push(analysis.promise.value);
      const signature = analysis.structure.value.slice(0, 4).join(" → ");
      if (signature) structures.add(signature, analysis.hook.value);
    }
  }

  for (const keyword of extractKeywords(promiseTexts, 8)) {
    promises.add(keyword.term, promiseTexts.find((t) => normalize(t).includes(keyword.term)));
  }

  const pct = (n: number): number => (total > 0 ? Math.round((n / total) * 100) : 0);

  const headlines = [
    derived(
      `Nos ${total} anúncios analisados, ${pct(questionHookCount)}% abrem com uma pergunta e ${pct(
        proofCount,
      )}% apresentam algum elemento de prova.`,
      INSIGHTS_ENGINE,
    ),
    derived(
      `${pct(videoCount)}% usam vídeo e ${verticalCount} criativos estão em formato vertical.`,
      INSIGHTS_ENGINE,
    ),
    derived(
      `${pct(whatsappCount)}% direcionam a conversa para WhatsApp; ${pct(
        priceCount,
      )}% mencionam preço e ${pct(urgencyCount)}% usam janela de urgência explícita.`,
      INSIGHTS_ENGINE,
    ),
  ];

  return {
    id: `insight_${now.getTime()}`,
    workspaceId: input.workspaceId,
    engine: INSIGHTS_ENGINE,
    sampleSize: total,
    hooks: hooks.top(total),
    ctas: ctas.top(total),
    angles: angles.top(total),
    promises: promises.top(total),
    objections: objections.top(total),
    formats: formats.top(total),
    copyStructures: structures.top(total),
    visualPatterns: visuals.top(total),
    headlines,
    opportunities: findOpportunities({
      total,
      videoCount,
      verticalCount,
      proofCount,
      questionHookCount,
      whatsappCount,
      priceCount,
      urgencyCount,
      objectionCount: objections.top(total).length,
    }),
    createdAt: now.toISOString(),
  };
}

interface OpportunitySignals {
  total: number;
  videoCount: number;
  verticalCount: number;
  proofCount: number;
  questionHookCount: number;
  whatsappCount: number;
  priceCount: number;
  urgencyCount: number;
  objectionCount: number;
}

/**
 * Lacunas do conjunto. São **inferências**: apontam ângulos pouco explorados
 * pela concorrência analisada, não garantia de resultado.
 */
function findOpportunities(s: OpportunitySignals): InsightReport["opportunities"] {
  const out: InsightReport["opportunities"] = [];
  if (s.total === 0) return out;
  const share = (n: number): number => n / s.total;

  if (share(s.videoCount) < 0.3) {
    out.push(
      inferred(
        `Apenas ${Math.round(share(s.videoCount) * 100)}% do conjunto usa vídeo — há espaço para testar VSL curta enquanto os concorrentes seguem em imagem.`,
        INSIGHTS_ENGINE,
        0.55,
      ),
    );
  }
  if (share(s.proofCount) < 0.35) {
    out.push(
      inferred(
        "Prova social aparece em menos de um terço dos anúncios. Depoimento ou antes/depois tende a ser um diferencial nesse recorte.",
        INSIGHTS_ENGINE,
        0.5,
      ),
    );
  }
  if (share(s.questionHookCount) > 0.6) {
    out.push(
      inferred(
        "A maioria abre com pergunta — o padrão está saturado. Testar hook de negação ou dado numérico pode gerar contraste.",
        INSIGHTS_ENGINE,
        0.5,
      ),
    );
  }
  if (share(s.priceCount) < 0.2) {
    out.push(
      inferred(
        "Quase ninguém expõe preço ou condição de pagamento. Anúncio com ancoragem de preço pode qualificar melhor o lead.",
        INSIGHTS_ENGINE,
        0.45,
      ),
    );
  }
  if (s.objectionCount === 0) {
    out.push(
      inferred(
        "Nenhuma objeção é tratada explicitamente no conjunto. Endereçar dor, prazo ou risco na copy é uma lacuna aberta.",
        INSIGHTS_ENGINE,
        0.5,
      ),
    );
  }
  if (share(s.verticalCount) < 0.4) {
    out.push(
      inferred(
        "Poucos criativos verticais — o inventário de Reels/Stories parece subaproveitado por esses anunciantes.",
        INSIGHTS_ENGINE,
        0.45,
      ),
    );
  }
  return out.slice(0, 5);
}

function durationBucket(seconds: number): string {
  if (seconds <= 15) return "Vídeo até 15s";
  if (seconds <= 30) return "Vídeo de 16 a 30s";
  if (seconds <= 60) return "Vídeo de 31 a 60s";
  return "Vídeo acima de 60s";
}

/** Usado no card "por que isso importa" — mantém a leitura honesta. */
export const INSIGHT_DISCLAIMER =
  "Os percentuais acima são contagens sobre os anúncios coletados. Não indicam performance: a Meta não divulga resultados de campanha.";
