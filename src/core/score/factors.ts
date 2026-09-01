import type { ScoreFactorKey } from "@/core/types/score";

/**
 * Pesos do Ad Score v1. Somam exatamente 1.
 * Alterar pesos exige bump de `AD_SCORE_VERSION` — scores persistidos guardam
 * a versão para que a auditoria e o recálculo sejam possíveis.
 */
export const AD_SCORE_VERSION = "ad_score_v1";

export const FACTOR_WEIGHTS: Record<ScoreFactorKey, number> = {
  longevity: 0.30,
  variations: 0.20,
  persistence: 0.20,
  creativeDiversity: 0.15,
  recurrence: 0.15,
};

export const FACTOR_LABEL: Record<ScoreFactorKey, string> = {
  longevity: "Tempo ativo",
  variations: "Quantidade de variações",
  persistence: "Persistência",
  creativeDiversity: "Diversificação de criativos",
  recurrence: "Recorrência",
};

export const FACTOR_DESCRIPTION: Record<ScoreFactorKey, string> = {
  longevity:
    "Quantos dias o anúncio permanece no ar. Manter veiculação é a decisão mais custosa que um anunciante toma.",
  variations:
    "Variações de copy e de criativo sob a mesma oferta indicam teste ativo e verba dedicada.",
  persistence:
    "Combina veiculação ininterrupta, atividade recente e confirmações de monitoramento.",
  creativeDiversity:
    "Formatos, proporções e plataformas diferentes sugerem produção estruturada, não um impulsionamento pontual.",
  recurrence:
    "Frequência com que o anunciante renova anúncios dentro da mesma oferta ao longo do tempo.",
};

/** Referências usadas na normalização — explícitas para facilitar calibração. */
export const SCORE_REFERENCES = {
  /** Dias de veiculação que saturam o fator de longevidade. */
  longevityCeilingDays: 180,
  /** Nº de variações (copy + criativos + anúncios irmãos) que satura o fator. */
  variationsCeiling: 14,
  /** A partir de quantos dias sem sinal a persistência começa a decair. */
  staleAfterDays: 7,
  /** Nº de plataformas que satura a diversificação de distribuição. */
  platformCeiling: 4,
  /** Anúncios por mês na oferta que saturam a recorrência. */
  recurrencePerMonthCeiling: 4,
} as const;
