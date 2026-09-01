/**
 * Proveniência da informação.
 *
 * Regra de produto (não negociável): a interface precisa deixar explícito
 * o que foi **coletado** da fonte, o que foi **calculado** deterministicamente
 * e o que é **interpretação**. Nenhuma inferência pode ser exibida com o mesmo
 * peso visual de um dado observado.
 */
export type Provenance =
  /** Veio direto da fonte pública (Meta Ad Library, página do anunciante). */
  | "observed"
  /** Calculado por regra determinística a partir de dados observados. */
  | "derived"
  /** Interpretação — heurística ou LLM. Pode estar errada. */
  | "inferred";

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  observed: "Dado observado",
  derived: "Cálculo",
  inferred: "Inferência",
};

export const PROVENANCE_HINT: Record<Provenance, string> = {
  observed: "Coletado diretamente da fonte pública.",
  derived: "Calculado por regra determinística sobre dados observados.",
  inferred: "Interpretação automática. Confira antes de decidir.",
};

/** Um valor carregando sua origem. */
export interface Evidence<T> {
  value: T;
  provenance: Provenance;
  /** Identificação da fonte: `meta_ad_library`, `ad_score_v1`, `ai:anthropic`... */
  source?: string;
  /** 0..1 — só faz sentido para `inferred`. */
  confidence?: number;
  /** Justificativa curta exibível ao usuário. */
  note?: string;
}

export function observed<T>(value: T, source = "meta_ad_library"): Evidence<T> {
  return { value, provenance: "observed", source };
}

export function derived<T>(value: T, source: string, note?: string): Evidence<T> {
  return { value, provenance: "derived", source, ...(note ? { note } : {}) };
}

export function inferred<T>(
  value: T,
  source: string,
  confidence: number,
  note?: string,
): Evidence<T> {
  return {
    value,
    provenance: "inferred",
    source,
    confidence: Math.min(1, Math.max(0, confidence)),
    ...(note ? { note } : {}),
  };
}
