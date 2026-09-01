import type {
  AdClassification,
  CopyAnalysis,
  CreativeAnalysis,
  GeneratedHook,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import {
  AIProviderError,
  type AICapabilities,
  type AIProvider,
  type AnalyzeCopyInput,
  type AnalyzeCreativeInput,
  type ClassifyAdInput,
  type GenerateHooksInput,
  type GenerateInsightsInput,
  type TranscribeInput,
} from "./AIProvider";

/**
 * Ponto de extensão para OpenAI (ou qualquer outro fornecedor).
 *
 * Deliberadamente não implementado: a plataforma não deve carregar código de
 * integração que ninguém exercita. Para implementar:
 *
 *  1. `npm install openai`;
 *  2. use `client.responses.parse()` com os mesmos esquemas de
 *     `./schemas.ts` — eles são agnósticos de fornecedor;
 *  3. mantenha o contrato: preencha apenas campos `inferred`, nunca
 *     sobrescreva métricas calculadas pelo núcleo;
 *  4. registre o provider em `./index.ts` e libere o valor no enum de
 *     `AI_PROVIDER` em `src/lib/env.ts`.
 *
 * O mesmo roteiro vale para Gemini ou um modelo local via endpoint próprio.
 */
export class OpenAIAIProvider implements AIProvider {
  readonly name = "openai";

  readonly capabilities: AICapabilities = {
    llm: true,
    vision: true,
    transcription: true,
    model: null,
  };

  private notImplemented(operation: string): never {
    throw new AIProviderError(
      this.name,
      `"${operation}" não implementado. Veja as instruções em src/providers/ai/OpenAIAIProvider.ts.`,
    );
  }

  async analyzeCopy(_input: AnalyzeCopyInput): Promise<CopyAnalysis> {
    this.notImplemented("analyzeCopy");
  }
  async analyzeCreative(_input: AnalyzeCreativeInput): Promise<CreativeAnalysis> {
    this.notImplemented("analyzeCreative");
  }
  async generateInsights(_input: GenerateInsightsInput): Promise<InsightReport> {
    this.notImplemented("generateInsights");
  }
  async generateHooks(_input: GenerateHooksInput): Promise<GeneratedHook[]> {
    this.notImplemented("generateHooks");
  }
  async classifyAd(_input: ClassifyAdInput): Promise<AdClassification> {
    this.notImplemented("classifyAd");
  }
  async transcribeVideo(_input: TranscribeInput): Promise<Transcription> {
    this.notImplemented("transcribeVideo");
  }
}
