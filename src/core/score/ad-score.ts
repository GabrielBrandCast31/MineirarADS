import type { AdScore, ScoreFactor, ScoreFactorKey } from "@/core/types/score";
import { bandOf } from "@/core/types/score";
import {
  AD_SCORE_VERSION,
  FACTOR_LABEL,
  FACTOR_WEIGHTS,
  SCORE_REFERENCES as REF,
} from "./factors";

/**
 * Sinais observáveis que alimentam o score. Todos vêm de dados públicos
 * ou de contagens próprias — nenhum é estimativa de performance.
 */
export interface AdScoreInput {
  /** Dias entre início e fim (ou hoje, se ativo). */
  activeDays: number;
  isActive: boolean;
  /** Criativos distintos dentro do próprio anúncio. */
  creativeCount: number;
  /** Variações de corpo de texto retornadas para o mesmo arquivo. */
  bodyVariationCount: number;
  /** Formatos distintos entre os criativos do anúncio. */
  distinctFormats: number;
  /** Proporções distintas entre os criativos (1:1, 9:16, ...). */
  distinctAspectRatios: number;
  /** Plataformas de veiculação declaradas. */
  platformCount: number;
  /** Outros anúncios do mesmo agrupamento de oferta. */
  relatedAdsCount: number;
  /** Dias de atividade da oferta como um todo. */
  offerActiveDays: number;
  /** Anúncios ainda ativos na mesma oferta. */
  offerActiveAds: number;
  /** Dias desde a última vez que a coleta confirmou o anúncio. */
  daysSinceLastSeen: number;
  /** Snapshots de monitoramento que confirmaram a veiculação. */
  monitoringObservations: number;
}

export const EMPTY_SCORE_INPUT: AdScoreInput = {
  activeDays: 0,
  isActive: false,
  creativeCount: 1,
  bodyVariationCount: 1,
  distinctFormats: 1,
  distinctAspectRatios: 1,
  platformCount: 1,
  relatedAdsCount: 0,
  offerActiveDays: 0,
  offerActiveAds: 0,
  daysSinceLastSeen: 0,
  monitoringObservations: 0,
};

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

/** Curva côncava: ganhos rápidos no início, saturação suave no teto. */
function ramp(value: number, ceiling: number, curve = 0.7): number {
  if (ceiling <= 0) return 0;
  return clamp01(Math.pow(clamp01(value / ceiling), curve));
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------- fatores -- */

function longevity(i: AdScoreInput): Omit<ScoreFactor, "key" | "label" | "weight" | "points"> {
  const raw = ramp(i.activeDays, REF.longevityCeilingDays);
  return {
    raw,
    detail: `${plural(i.activeDays, "dia", "dias")} de veiculação${
      i.isActive ? " e segue ativo" : " (encerrado)"
    }.`,
  };
}

function variations(i: AdScoreInput): Omit<ScoreFactor, "key" | "label" | "weight" | "points"> {
  const total =
    Math.max(1, i.creativeCount) +
    Math.max(0, i.bodyVariationCount - 1) +
    i.relatedAdsCount;
  const raw = ramp(total, REF.variationsCeiling, 0.8);
  const parts = [plural(i.creativeCount, "criativo", "criativos")];
  if (i.bodyVariationCount > 1) parts.push(`${i.bodyVariationCount} versões de copy`);
  if (i.relatedAdsCount > 0) parts.push(`${i.relatedAdsCount} anúncios irmãos na oferta`);
  return { raw, detail: parts.join(", ") + "." };
}

function persistence(i: AdScoreInput): Omit<ScoreFactor, "key" | "label" | "weight" | "points"> {
  // Três componentes: estar no ar, ter sido visto recentemente e ter histórico.
  const live = i.isActive ? 1 : 0.35;
  const freshness =
    i.daysSinceLastSeen <= REF.staleAfterDays
      ? 1
      : clamp01(1 - (i.daysSinceLastSeen - REF.staleAfterDays) / 30);
  const history = ramp(i.monitoringObservations, 8, 0.6);
  const raw = clamp01(live * 0.5 + freshness * 0.3 + history * 0.2);

  const detail = i.isActive
    ? i.monitoringObservations > 0
      ? `Ativo e confirmado ${plural(i.monitoringObservations, "vez", "vezes")} pelo monitoramento.`
      : "Ativo na última coleta, ainda sem histórico de monitoramento."
    : `Encerrado; última confirmação há ${plural(i.daysSinceLastSeen, "dia", "dias")}.`;
  return { raw, detail };
}

function creativeDiversity(
  i: AdScoreInput,
): Omit<ScoreFactor, "key" | "label" | "weight" | "points"> {
  const formats = ramp(i.distinctFormats, 3, 0.6);
  const ratios = ramp(i.distinctAspectRatios, 3, 0.6);
  const platforms = ramp(i.platformCount, REF.platformCeiling, 0.6);
  const raw = clamp01(formats * 0.4 + ratios * 0.25 + platforms * 0.35);
  return {
    raw,
    detail: `${plural(i.distinctFormats, "formato", "formatos")}, ${plural(
      i.distinctAspectRatios,
      "proporção",
      "proporções",
    )} e ${plural(i.platformCount, "plataforma", "plataformas")}.`,
  };
}

function recurrence(i: AdScoreInput): Omit<ScoreFactor, "key" | "label" | "weight" | "points"> {
  const months = Math.max(1, i.offerActiveDays / 30);
  const adsPerMonth = (i.relatedAdsCount + 1) / months;
  const cadence = ramp(adsPerMonth, REF.recurrencePerMonthCeiling, 0.7);
  const stillRunning = ramp(i.offerActiveAds, 5, 0.6);
  const raw = clamp01(cadence * 0.6 + stillRunning * 0.4);
  return {
    raw,
    detail:
      i.offerActiveDays > 0
        ? `A oferta renova cerca de ${adsPerMonth.toFixed(1)} anúncios/mês e mantém ${plural(
            i.offerActiveAds,
            "anúncio ativo",
            "anúncios ativos",
          )}.`
        : "Sem histórico suficiente da oferta para medir recorrência.",
  };
}

const CALCULATORS: Record<
  ScoreFactorKey,
  (i: AdScoreInput) => Omit<ScoreFactor, "key" | "label" | "weight" | "points">
> = {
  longevity,
  variations,
  persistence,
  creativeDiversity,
  recurrence,
};

const FACTOR_ORDER: ScoreFactorKey[] = [
  "longevity",
  "variations",
  "persistence",
  "creativeDiversity",
  "recurrence",
];

/* --------------------------------------------------------------- score -- */

/**
 * Calcula o Ad Score.
 *
 * Determinístico e puro: mesmos sinais, mesmo resultado. Nenhuma chamada de
 * IA participa daqui — a explicação também é montada por regra, para que o
 * usuário possa auditar cada ponto.
 */
export function computeAdScore(input: AdScoreInput, now: Date = new Date()): AdScore {
  const factors: ScoreFactor[] = FACTOR_ORDER.map((key) => {
    const weight = FACTOR_WEIGHTS[key];
    const computed = CALCULATORS[key](input);
    return {
      key,
      label: FACTOR_LABEL[key],
      weight,
      raw: Number(computed.raw.toFixed(4)),
      points: Number((computed.raw * weight * 100).toFixed(2)),
      detail: computed.detail,
    };
  });

  const value = Math.round(factors.reduce((sum, f) => sum + f.points, 0));

  return {
    value,
    version: AD_SCORE_VERSION,
    band: bandOf(value),
    factors,
    explanation: explainScore(value, factors, input),
    computedAt: now.toISOString(),
  };
}

/**
 * Monta a resposta para "por que esse anúncio recebeu esse score?".
 * Usa os dois fatores de maior contribuição e cita os números observados.
 */
export function explainScore(
  value: number,
  factors: ScoreFactor[],
  input: AdScoreInput,
): string {
  const ranked = [...factors].sort((a, b) => b.points - a.points);
  const top = ranked[0];
  const second = ranked[1];
  if (!top) return `Score ${value}/100.`;

  const reasons: string[] = [];
  if (top.key === "longevity") {
    reasons.push(`permanecer ativo por ${input.activeDays} dias`);
  } else {
    reasons.push(top.detail.replace(/\.$/, "").toLowerCase());
  }
  if (second && second.points >= top.points * 0.45) {
    if (second.key === "variations") {
      const total = input.creativeCount + input.relatedAdsCount;
      reasons.push(`reunir ${total} peças relacionadas`);
    } else {
      reasons.push(second.detail.replace(/\.$/, "").toLowerCase());
    }
  }

  const weakest = ranked[ranked.length - 1];
  const gap =
    weakest && weakest.raw < 0.35
      ? ` O que mais limita a nota é "${weakest.label.toLowerCase()}": ${weakest.detail.toLowerCase()}`
      : "";

  return `Este anúncio recebeu ${value}/100 principalmente por ${reasons.join(
    " e ",
  )}.${gap}`;
}

/** Score consolidado de uma oferta: média ponderada pelo tempo ativo. */
export function computeOfferScore(adScores: Array<{ value: number; activeDays: number }>): number {
  if (adScores.length === 0) return 0;
  const totalWeight = adScores.reduce((s, a) => s + Math.max(1, a.activeDays), 0);
  const weighted = adScores.reduce(
    (s, a) => s + a.value * Math.max(1, a.activeDays),
    0,
  );
  const base = weighted / totalWeight;
  // Bônus por volume de anúncios simultâneos na mesma oferta (até +8 pontos).
  const volumeBonus = Math.min(8, Math.log2(1 + adScores.length) * 2.6);
  return Math.min(100, Math.round(base + volumeBonus));
}
