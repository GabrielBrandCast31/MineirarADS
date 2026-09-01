import type {
  AdClassification,
  CopyAnalysis,
  CreativeAnalysis,
  GeneratedHook,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import type { Ad } from "@/core/types/ad";
import type { Creative } from "@/core/types/creative";

/**
 * Camada de IA — desacoplada do resto da aplicação.
 *
 * Contrato de honestidade (requisito de produto, não de engenharia):
 * um `AIProvider` só pode preencher campos marcados como `inferred`.
 * Contagens, datas, dias ativos, métricas de texto e o Ad Score são
 * calculados deterministicamente pelo núcleo e **nunca** passam pelo modelo.
 * Um provider que sobrescreva um `observed` está quebrando o contrato.
 */
export interface AIProvider {
  readonly name: string;
  readonly capabilities: AICapabilities;

  analyzeCopy(input: AnalyzeCopyInput): Promise<CopyAnalysis>;
  analyzeCreative(input: AnalyzeCreativeInput): Promise<CreativeAnalysis>;
  generateInsights(input: GenerateInsightsInput): Promise<InsightReport>;
  generateHooks(input: GenerateHooksInput): Promise<GeneratedHook[]>;
  classifyAd(input: ClassifyAdInput): Promise<AdClassification>;
  transcribeVideo(input: TranscribeInput): Promise<Transcription>;
}

export interface AICapabilities {
  /** Usa um modelo de linguagem (custo por chamada). */
  llm: boolean;
  /** Consegue interpretar imagens. */
  vision: boolean;
  /** Consegue transcrever áudio/vídeo. */
  transcription: boolean;
  /** Modelo em uso, para registro em `usage` e exibição na interface. */
  model: string | null;
}

/* ------------------------------------------------------------- entradas -- */

export interface AnalyzeCopyInput {
  ad: Pick<
    Ad,
    "id" | "bodyText" | "headline" | "linkDescription" | "callToAction" | "bodyVariations"
  >;
  workspaceId: string | null;
  /** Rótulo do CTA já traduzido, quando disponível. */
  ctaLabel?: string | null;
  /** Nicho/categoria do anunciante — ajuda o modelo a contextualizar. */
  category?: string | null;
}

export interface AnalyzeCreativeInput {
  creative: Creative;
  adId: string;
  workspaceId: string | null;
  ctaLabel?: string | null;
  /** Copy do anúncio — contexto útil mesmo para análise visual. */
  bodyText?: string | null;
}

export interface GenerateInsightsInput {
  workspaceId: string | null;
  ads: Ad[];
  analyses: CopyAnalysis[];
  /** Termo que originou o conjunto — aparece no relatório. */
  query?: string | null;
}

export interface GenerateHooksInput {
  workspaceId: string | null;
  /** Anúncios de referência: o modelo se inspira nos padrões, sem copiar. */
  referenceAds: Array<Pick<Ad, "headline" | "bodyText">>;
  offerName: string;
  audience?: string | null;
  count?: number;
}

export interface ClassifyAdInput {
  ad: Pick<Ad, "id" | "headline" | "bodyText" | "callToAction">;
  category?: string | null;
}

export interface TranscribeInput {
  creative: Pick<Creative, "id" | "sourceUrl" | "storagePath" | "durationSeconds">;
  adId: string;
  workspaceId: string | null;
  language?: string;
}

/* --------------------------------------------------------------- erros --- */

export class AICapabilityError extends Error {
  constructor(provider: string, capability: keyof AICapabilities) {
    super(
      `[${provider}] Este provider de IA não suporta "${capability}". Selecione outro em AI_PROVIDER.`,
    );
    this.name = "AICapabilityError";
  }
}

export class AIProviderError extends Error {
  constructor(provider: string, message: string, public override readonly cause?: unknown) {
    super(`[${provider}] ${message}`);
    this.name = "AIProviderError";
  }
}
