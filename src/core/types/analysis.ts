import type { AdFormat, CallToAction, ISODateTime } from "./common";
import type { Evidence } from "./provenance";

/* ------------------------------------------------------------------ copy -- */

/** Gatilhos emocionais classificados na copy. */
export type EmotionTrigger =
  | "curiosidade" | "medo" | "desejo" | "urgencia"
  | "prova_social" | "autoridade" | "transformacao" | "pertencimento";

export const EMOTION_LABEL: Record<EmotionTrigger, string> = {
  curiosidade: "Curiosidade",
  medo: "Medo",
  desejo: "Desejo",
  urgencia: "Urgência",
  prova_social: "Prova social",
  autoridade: "Autoridade",
  transformacao: "Transformação",
  pertencimento: "Pertencimento",
};

/** Formato do gancho de abertura. */
export type HookType =
  | "pergunta" | "afirmacao_polemica" | "estatistica" | "historia"
  | "beneficio_direto" | "negacao" | "comando" | "indefinido";

export const HOOK_LABEL: Record<HookType, string> = {
  pergunta: "Pergunta",
  afirmacao_polemica: "Afirmação polêmica",
  estatistica: "Dado / estatística",
  historia: "História",
  beneficio_direto: "Benefício direto",
  negacao: "Negação / quebra de crença",
  comando: "Comando",
  indefinido: "Indefinido",
};

export interface CopyAnalysis {
  id: string;
  adId: string;
  workspaceId: string | null;
  /** Quem produziu: `heuristic:v1`, `ai:anthropic:claude-sonnet-5`... */
  engine: string;

  hook: Evidence<string | null>;
  hookType: Evidence<HookType>;
  problem: Evidence<string | null>;
  promise: Evidence<string | null>;
  mechanism: Evidence<string | null>;
  benefits: Evidence<string[]>;
  proof: Evidence<string[]>;
  objections: Evidence<string[]>;
  cta: Evidence<string | null>;
  /** 0..1 — quão concreta é a copy (números, prazos, nomes). */
  specificity: Evidence<number>;
  /** Ex.: ["hook", "problema", "prova", "oferta", "cta"] */
  structure: Evidence<string[]>;
  emotions: Evidence<EmotionTrigger[]>;
  dominantEmotion: Evidence<EmotionTrigger | null>;

  /** Métricas puramente observáveis do texto. */
  metrics: CopyMetrics;
  createdAt: ISODateTime;
}

export interface CopyMetrics {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  emojiCount: number;
  questionCount: number;
  exclamationCount: number;
  uppercaseWordCount: number;
  numberCount: number;
  hasWhatsappMention: boolean;
  hasPriceMention: boolean;
  hasUrgencyWindow: boolean;
  /** Índice de legibilidade adaptado ao português (0..100, maior = mais fácil). */
  readability: number;
}

/* -------------------------------------------------------------- criativo -- */

export interface CreativeAnalysis {
  id: string;
  creativeId: string;
  adId: string;
  workspaceId: string | null;
  engine: string;
  format: AdFormat;

  aspectRatio: Evidence<string | null>;
  durationSeconds: Evidence<number | null>;
  hasPerson: Evidence<boolean | null>;
  hasOnScreenText: Evidence<boolean | null>;
  hasCaptions: Evidence<boolean | null>;
  hasProduct: Evidence<boolean | null>;
  textDensity: Evidence<"baixa" | "media" | "alta" | null>;
  visualHeadline: Evidence<string | null>;
  visualCta: Evidence<string | null>;
  /** Descrição dos primeiros segundos — só para vídeo. */
  openingBeats: Evidence<string | null>;
  visualStructure: Evidence<string[]>;
  createdAt: ISODateTime;
}

/* ---------------------------------------------------------- transcrição -- */

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
  /** Rótulo estrutural inferido: hook, problema, prova, oferta, cta... */
  role: string | null;
}

export interface Transcription {
  id: string;
  creativeId: string;
  adId: string;
  workspaceId: string | null;
  engine: string;
  language: string;
  fullText: string;
  segments: TranscriptSegment[];
  summary: Evidence<string | null>;
  hookSegment: Evidence<TranscriptSegment | null>;
  ctaSegment: Evidence<TranscriptSegment | null>;
  durationSeconds: number | null;
  createdAt: ISODateTime;
}

/* -------------------------------------------------------------- insights -- */

export interface InsightItem {
  label: string;
  /** Contagem absoluta de anúncios do conjunto que apresentam o padrão. */
  count: number;
  /** 0..1 */
  share: number;
  examples: string[];
}

export interface InsightReport {
  id: string;
  workspaceId: string | null;
  engine: string;
  /** Quantos anúncios entraram na análise. */
  sampleSize: number;
  hooks: InsightItem[];
  ctas: InsightItem[];
  angles: InsightItem[];
  promises: InsightItem[];
  objections: InsightItem[];
  formats: InsightItem[];
  copyStructures: InsightItem[];
  visualPatterns: InsightItem[];
  /** Frases prontas para leitura — cada uma marcada como observada ou inferida. */
  headlines: Array<Evidence<string>>;
  opportunities: Array<Evidence<string>>;
  createdAt: ISODateTime;
}

export interface GeneratedHook {
  text: string;
  hookType: HookType;
  rationale: string;
}

export interface AdClassification {
  niche: Evidence<string>;
  funnelStage: Evidence<"topo" | "meio" | "fundo">;
  audience: Evidence<string>;
  suggestedCta: Evidence<CallToAction>;
}
