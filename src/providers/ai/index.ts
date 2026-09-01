import { serverEnv } from "@/lib/env";
import type { AIProvider } from "./AIProvider";
import { AnthropicAIProvider } from "./AnthropicAIProvider";
import { HeuristicAIProvider } from "./HeuristicAIProvider";
import { OpenAIAIProvider } from "./OpenAIAIProvider";

export * from "./AIProvider";
export { HeuristicAIProvider } from "./HeuristicAIProvider";
export { AnthropicAIProvider } from "./AnthropicAIProvider";
export { OpenAIAIProvider } from "./OpenAIAIProvider";

let cached: AIProvider | null = null;

/**
 * Fábrica do provider de IA.
 *
 * Se o provider configurado não puder ser construído (chave ausente, por
 * exemplo), caímos no heurístico e registramos o motivo. A plataforma nunca
 * fica sem análise — ela apenas fica sem a camada de LLM.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const env = serverEnv();

  try {
    switch (env.AI_PROVIDER) {
      case "anthropic":
        cached = new AnthropicAIProvider({
          apiKey: env.ANTHROPIC_API_KEY,
          model: env.ANTHROPIC_MODEL,
        });
        break;
      case "openai":
        cached = new OpenAIAIProvider();
        break;
      default:
        cached = new HeuristicAIProvider();
    }
  } catch (error) {
    console.warn(
      `[ai] Falha ao inicializar o provider "${env.AI_PROVIDER}". Usando heurísticas.`,
      error instanceof Error ? error.message : error,
    );
    cached = new HeuristicAIProvider();
  }

  return cached;
}

export function setAIProvider(provider: AIProvider | null): void {
  cached = provider;
}
