import type { CopyMetrics } from "@/core/types/analysis";
import { countEmojis, normalize, sentences, tokenize } from "@/core/text/normalize";
import { PRICE_RE, URGENCY_WINDOW, WHATSAPP_MARKERS } from "./lexicon";

const containsAny = (haystack: string, needles: string[]): boolean =>
  needles.some((n) => haystack.includes(n));

/**
 * Métricas puramente observáveis do texto — nada aqui é interpretação.
 * Servem tanto para a UI quanto como entrada das heurísticas.
 */
export function computeCopyMetrics(text: string | null | undefined): CopyMetrics {
  const raw = (text ?? "").trim();
  const flat = normalize(raw);
  const words = tokenize(raw, { keepStopwords: true });
  const sents = sentences(raw);

  const uppercaseWords = raw
    .split(/\s+/)
    .filter((w) => w.length >= 3 && w === w.toUpperCase() && /[A-ZÀ-Ú]/.test(w));

  return {
    charCount: raw.length,
    wordCount: words.length,
    sentenceCount: sents.length,
    emojiCount: countEmojis(raw),
    questionCount: (raw.match(/\?/g) ?? []).length,
    exclamationCount: (raw.match(/!/g) ?? []).length,
    uppercaseWordCount: uppercaseWords.length,
    numberCount: (raw.match(/\d+([.,]\d+)?/g) ?? []).length,
    hasWhatsappMention: containsAny(flat, WHATSAPP_MARKERS),
    hasPriceMention: PRICE_RE.test(raw),
    hasUrgencyWindow: containsAny(flat, URGENCY_WINDOW),
    readability: readabilityPtBr(words, sents),
  };
}

/**
 * Índice de legibilidade adaptado do Flesch para o português
 * (fórmula de Martins et al.). 0..100 — quanto maior, mais fácil.
 */
function readabilityPtBr(words: string[], sents: string[]): number {
  if (words.length === 0 || sents.length === 0) return 0;
  const syllables = words.reduce((sum, w) => sum + countSyllablesPt(w), 0);
  const asl = words.length / sents.length;
  const asw = syllables / words.length;
  const score = 248.835 - 1.015 * asl - 84.6 * asw;
  return Math.round(Math.min(100, Math.max(0, score)));
}

/** Aproximação de contagem silábica: grupos vocálicos. */
export function countSyllablesPt(word: string): number {
  const groups = normalize(word).match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}
