import { tokenize } from "./normalize";

export interface KeywordScore {
  term: string;
  count: number;
  /** Peso relativo dentro do corpus (0..1). */
  weight: number;
}

/**
 * Extrai termos relevantes (unigramas + bigramas) de um conjunto de textos.
 * Implementação intencionalmente simples: frequência com bônus para bigramas,
 * que capturam bem nomes de oferta ("implante dentario", "energia solar").
 */
export function extractKeywords(texts: string[], limit = 12): KeywordScore[] {
  const counts = new Map<string, number>();

  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`;
      counts.set(bigram, (counts.get(bigram) ?? 0) + 1.6);
    }
  }

  const entries = [...counts.entries()]
    .filter(([term, count]) => count > 1 || term.includes(" "))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  const max = entries[0]?.[1] ?? 1;
  return entries.map(([term, count]) => ({
    term,
    count: Math.round(count),
    weight: Number((count / max).toFixed(3)),
  }));
}

/** Termo mais representativo — usado para nomear ofertas automaticamente. */
export function dominantTerm(texts: string[]): string | null {
  const keywords = extractKeywords(texts, 6);
  const bigram = keywords.find((k) => k.term.includes(" "));
  return bigram?.term ?? keywords[0]?.term ?? null;
}
