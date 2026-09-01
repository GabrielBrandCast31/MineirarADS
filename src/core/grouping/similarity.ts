import { jaccard, normalize, tokenize, trigramSimilarity } from "@/core/text/normalize";

export interface AdSimilarityFeatures {
  advertiserId: string;
  /** Texto concatenado: headline + corpo + descrição do link. */
  text: string;
  /** URL de destino, quando observada. */
  destinationUrl: string | null;
}

/** Host + primeiro segmento do caminho — proxy forte de "mesma oferta". */
export function landingKey(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    return normalize(`${parsed.hostname.replace(/^www\./, "")} ${segment}`);
  } catch {
    return null;
  }
}

/**
 * Similaridade entre dois anúncios (0..1).
 *
 * Combina três sinais: tokens em comum, trigramas de caracteres (tolera
 * variações morfológicas) e coincidência da página de destino. Anúncios de
 * anunciantes diferentes nunca são considerados a mesma oferta.
 */
export function adSimilarity(a: AdSimilarityFeatures, b: AdSimilarityFeatures): number {
  if (a.advertiserId !== b.advertiserId) return 0;

  const tokensA = new Set(tokenize(a.text));
  const tokensB = new Set(tokenize(b.text));
  const tokenScore = jaccard(tokensA, tokensB);
  const charScore = trigramSimilarity(a.text, b.text);

  const keyA = landingKey(a.destinationUrl);
  const keyB = landingKey(b.destinationUrl);
  const landingScore = keyA && keyB ? (keyA === keyB ? 1 : 0) : 0;
  const landingWeight = keyA && keyB ? 0.35 : 0;

  const textWeight = 1 - landingWeight;
  return Number(
    (
      (tokenScore * 0.6 + charScore * 0.4) * textWeight +
      landingScore * landingWeight
    ).toFixed(4),
  );
}

/** Acima deste valor dois anúncios entram na mesma oferta. */
export const OFFER_MERGE_THRESHOLD = 0.38;
