import type {
  CopyAnalysis,
  EmotionTrigger,
  HookType,
} from "@/core/types/analysis";
import { derived, inferred, observed } from "@/core/types/provenance";
import {
  lines,
  normalize,
  sentences,
  stripEmojis,
} from "@/core/text/normalize";
import {
  ANGLE_LEXICON,
  CTA_VERBS,
  EMOTION_LEXICON,
  MECHANISM_MARKERS,
  OBJECTION_MARKERS,
  PROBLEM_MARKERS,
  PROMISE_MARKERS,
  PROOF_MARKERS,
} from "./lexicon";
import { computeCopyMetrics } from "./metrics";

export const HEURISTIC_ENGINE = "heuristic:v1";

const hits = (flat: string, terms: string[]): string[] =>
  terms.filter((t) => flat.includes(t));

/* ---------------------------------------------------------------- hook -- */

/** Primeira unidade de texto — linha ou sentença, o que vier antes. */
export function extractHook(text: string): string | null {
  const firstLine = lines(text)[0];
  const firstSentence = sentences(text)[0];
  const candidate =
    firstLine && firstLine.length <= 140 ? firstLine : (firstSentence ?? firstLine ?? null);
  if (!candidate) return null;
  const clean = stripEmojis(candidate).trim();
  return clean.length > 0 ? clean.slice(0, 180) : candidate.slice(0, 180);
}

export function classifyHook(hook: string | null): { type: HookType; confidence: number } {
  if (!hook) return { type: "indefinido", confidence: 0.2 };
  const flat = normalize(hook);

  if (hook.includes("?")) return { type: "pergunta", confidence: 0.92 };
  if (/^\s*\d+([.,]\d+)?\s*(%|mil|milhoes|x)\b/.test(flat) || /\d+\s?%/.test(flat)) {
    return { type: "estatistica", confidence: 0.72 };
  }
  if (/^(nao|nunca|pare|esqueca|chega de|deixe de)\b/.test(flat)) {
    return { type: "negacao", confidence: 0.78 };
  }
  if (CTA_VERBS.some((v) => flat.startsWith(v))) {
    return { type: "comando", confidence: 0.7 };
  }
  if (/^(eu |quando eu|em \d{4}|ha \d+ anos|era |minha |meu )/.test(flat)) {
    return { type: "historia", confidence: 0.62 };
  }
  if (hits(flat, PROMISE_MARKERS).length > 0) {
    return { type: "beneficio_direto", confidence: 0.6 };
  }
  if (/^(a verdade|ninguem|todo mundo|pare de acreditar|isso e mentira)/.test(flat)) {
    return { type: "afirmacao_polemica", confidence: 0.66 };
  }
  return { type: "indefinido", confidence: 0.3 };
}

/* ------------------------------------------------------------ elementos -- */

function findSentenceWith(text: string, markers: string[]): string | null {
  const sents = sentences(text);
  for (const sentence of sents) {
    const flat = normalize(sentence);
    if (markers.some((m) => flat.includes(m))) return sentence.trim().slice(0, 220);
  }
  return null;
}

function collectSentencesWith(text: string, markers: string[], limit: number): string[] {
  const found: string[] = [];
  for (const sentence of sentences(text)) {
    const flat = normalize(sentence);
    if (markers.some((m) => flat.includes(m))) found.push(sentence.trim().slice(0, 200));
    if (found.length >= limit) break;
  }
  return found;
}

export function detectEmotions(text: string): EmotionTrigger[] {
  const flat = normalize(text);
  const scored = (Object.keys(EMOTION_LEXICON) as EmotionTrigger[])
    .map((emotion) => ({ emotion, score: hits(flat, EMOTION_LEXICON[emotion]).length }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((s) => s.emotion);
}

/** Ângulos de comunicação presentes — usado nos insights agregados. */
export function detectAngles(text: string): string[] {
  const flat = normalize(text);
  return Object.entries(ANGLE_LEXICON)
    .map(([angle, terms]) => ({ angle, score: hits(flat, terms).length }))
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((a) => a.angle);
}

/**
 * Especificidade 0..1: quanto a copy usa elementos concretos
 * (números, prazos, preços, nomes próprios) em vez de adjetivos vagos.
 */
export function computeSpecificity(text: string): number {
  const m = computeCopyMetrics(text);
  if (m.wordCount === 0) return 0;
  const numberDensity = Math.min(1, m.numberCount / Math.max(4, m.wordCount / 12));
  const properNouns = (text.match(/\b[A-ZÀ-Ú][a-zà-ú]{2,}/g) ?? []).length;
  const properDensity = Math.min(1, properNouns / Math.max(4, m.wordCount / 10));
  const concreteBits = [m.hasPriceMention, m.hasUrgencyWindow].filter(Boolean).length / 2;
  return Number(
    Math.min(1, numberDensity * 0.45 + properDensity * 0.3 + concreteBits * 0.25).toFixed(2),
  );
}

/** Estrutura narrativa reconhecida, na ordem em que aparece no texto. */
export function detectStructure(text: string): string[] {
  const blocks = sentences(text);
  const structure: string[] = [];
  const push = (label: string): void => {
    if (structure[structure.length - 1] !== label) structure.push(label);
  };

  blocks.forEach((sentence, index) => {
    const flat = normalize(sentence);
    if (index === 0) {
      push("hook");
      return;
    }
    if (hits(flat, PROBLEM_MARKERS).length) push("problema");
    else if (hits(flat, PROOF_MARKERS).length) push("prova");
    else if (hits(flat, MECHANISM_MARKERS).length) push("mecanismo");
    else if (hits(flat, OBJECTION_MARKERS).length) push("objeção");
    else if (CTA_VERBS.some((v) => flat.includes(v))) push("cta");
    else if (hits(flat, PROMISE_MARKERS).length) push("promessa");
    else push("desenvolvimento");
  });

  return structure;
}

export function extractCtaSentence(text: string): string | null {
  const sents = sentences(text);
  for (let i = sents.length - 1; i >= 0; i -= 1) {
    const sentence = sents[i]!;
    const flat = normalize(sentence);
    if (CTA_VERBS.some((v) => flat.includes(v))) return sentence.trim().slice(0, 200);
  }
  return null;
}

/* ------------------------------------------------------------- análise -- */

export interface CopyAnalysisInput {
  adId: string;
  workspaceId: string | null;
  bodyText: string | null;
  headline: string | null;
  linkDescription?: string | null;
  ctaLabel?: string | null;
}

/**
 * Análise de copy 100% determinística. É o baseline: roda sem custo,
 * sem rede e sem risco de alucinação. Um `AIProvider` pode substituí-la ou
 * enriquecê-la, mas a interface deve continuar marcando o que é inferência.
 */
export function analyzeCopyHeuristic(
  input: CopyAnalysisInput,
  now: Date = new Date(),
): CopyAnalysis {
  const text = [input.headline, input.bodyText, input.linkDescription]
    .filter(Boolean)
    .join("\n");

  const hook = extractHook(input.bodyText ?? input.headline ?? "");
  const { type: hookType, confidence: hookConfidence } = classifyHook(hook);
  const emotions = detectEmotions(text);
  const structure = detectStructure(input.bodyText ?? "");
  const metrics = computeCopyMetrics(input.bodyText ?? text);

  return {
    id: `copy_${input.adId}`,
    adId: input.adId,
    workspaceId: input.workspaceId,
    engine: HEURISTIC_ENGINE,

    hook: hook
      ? observed(hook, "ad_creative_body")
      : inferred(null, HEURISTIC_ENGINE, 0.2, "Sem texto suficiente para identificar o gancho."),
    hookType: inferred(hookType, HEURISTIC_ENGINE, hookConfidence),
    problem: inferred(
      findSentenceWith(text, PROBLEM_MARKERS),
      HEURISTIC_ENGINE,
      0.55,
      "Trecho com marcadores de dor.",
    ),
    promise: inferred(findSentenceWith(text, PROMISE_MARKERS), HEURISTIC_ENGINE, 0.5),
    mechanism: inferred(findSentenceWith(text, MECHANISM_MARKERS), HEURISTIC_ENGINE, 0.45),
    benefits: inferred(collectSentencesWith(text, PROMISE_MARKERS, 4), HEURISTIC_ENGINE, 0.45),
    proof: inferred(collectSentencesWith(text, PROOF_MARKERS, 4), HEURISTIC_ENGINE, 0.5),
    objections: inferred(collectSentencesWith(text, OBJECTION_MARKERS, 4), HEURISTIC_ENGINE, 0.5),
    cta: input.ctaLabel
      ? observed(input.ctaLabel, "ad_creative_cta")
      : inferred(extractCtaSentence(text), HEURISTIC_ENGINE, 0.55),
    specificity: derived(
      computeSpecificity(text),
      HEURISTIC_ENGINE,
      "Densidade de números, nomes próprios, preço e prazo.",
    ),
    structure: inferred(structure, HEURISTIC_ENGINE, 0.4),
    emotions: inferred(emotions, HEURISTIC_ENGINE, emotions.length ? 0.6 : 0.2),
    dominantEmotion: inferred(emotions[0] ?? null, HEURISTIC_ENGINE, emotions.length ? 0.55 : 0.15),

    metrics,
    createdAt: now.toISOString(),
  };
}
