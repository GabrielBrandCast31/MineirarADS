/**
 * Ad Score — estimativa interna 0..100.
 *
 * ATENÇÃO DE PRODUTO: o Ad Score **não** é ROAS, faturamento nem performance.
 * Esses dados não são públicos. O score mede apenas *persistência e
 * investimento observável de produção criativa*: sinais que, empiricamente,
 * acompanham campanhas que o anunciante decidiu manter no ar.
 *
 * Toda exibição do score deve vir acompanhada de `explanation` e do rótulo
 * de proveniência `derived`.
 */

/** Identificador estável de cada fator — usado em UI, testes e persistência. */
export type ScoreFactorKey =
  | "longevity"
  | "variations"
  | "persistence"
  | "creativeDiversity"
  | "recurrence";

export interface ScoreFactor {
  key: ScoreFactorKey;
  label: string;
  /** Peso do fator no total (soma dos pesos = 1). */
  weight: number;
  /** Pontuação normalizada 0..1 antes da ponderação. */
  raw: number;
  /** Contribuição em pontos do total (`raw * weight * 100`). */
  points: number;
  /** Frase curta explicando o que gerou esse valor. */
  detail: string;
}

export interface AdScore {
  /** 0..100, inteiro. */
  value: number;
  /** Versão do algoritmo. Persistida junto para permitir recálculo/auditoria. */
  version: string;
  band: ScoreBand;
  factors: ScoreFactor[];
  /** Explicação em linguagem natural, montada por regra (não por LLM). */
  explanation: string;
  computedAt: string;
}

export type ScoreBand = "frio" | "morno" | "quente" | "escaldante";

export const SCORE_BANDS: Array<{ band: ScoreBand; min: number; label: string; hint: string }> = [
  { band: "frio", min: 0, label: "Frio", hint: "Poucos sinais de persistência." },
  { band: "morno", min: 40, label: "Morno", hint: "Alguma consistência observada." },
  { band: "quente", min: 65, label: "Quente", hint: "Persistência e volume de criativos acima da média." },
  { band: "escaldante", min: 85, label: "Escaldante", hint: "Padrão típico de campanha mantida com investimento contínuo." },
];

export function bandOf(value: number): ScoreBand {
  let current: ScoreBand = "frio";
  for (const b of SCORE_BANDS) if (value >= b.min) current = b.band;
  return current;
}
