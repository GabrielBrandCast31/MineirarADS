import { ForbiddenError, NotFoundError } from "@/data/types";
import { FeatureLockedError, QuotaExceededError } from "@/server/services/quota";
import { AICapabilityError, AIProviderError } from "@/providers/ai";
import { ProviderNotImplementedError } from "@/providers/ads";

/**
 * Retorno padronizado de Server Action.
 *
 * Ações nunca lançam para o cliente: erro vira dado, com mensagem já em
 * português e um `code` que a interface pode usar para reagir (ex.: abrir o
 * modal de upgrade quando a cota estoura).
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: ActionErrorCode };

export type ActionErrorCode =
  | "quota"
  | "feature_locked"
  | "forbidden"
  | "not_found"
  | "provider"
  | "unknown";

export const success = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export function failure(error: unknown): ActionResult<never> {
  if (error instanceof QuotaExceededError) {
    return { ok: false, error: error.message, code: "quota" };
  }
  if (error instanceof FeatureLockedError) {
    return { ok: false, error: error.message, code: "feature_locked" };
  }
  if (error instanceof ForbiddenError) {
    return { ok: false, error: error.message, code: "forbidden" };
  }
  if (error instanceof NotFoundError) {
    return { ok: false, error: error.message, code: "not_found" };
  }
  if (
    error instanceof ProviderNotImplementedError ||
    error instanceof AIProviderError ||
    error instanceof AICapabilityError
  ) {
    return { ok: false, error: error.message, code: "provider" };
  }
  console.error("[action] erro não tratado", error);
  return {
    ok: false,
    error: error instanceof Error ? error.message : "Algo deu errado. Tente novamente.",
    code: "unknown",
  };
}
