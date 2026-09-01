import type { SessionContext } from "@/core/types/workspace";
import { getRepositories } from "@/data";
import type { LogEntryInput } from "@/data/types";

/**
 * Log de aplicação. Grava no repositório (visível em /admin/logs) e no stdout,
 * para que a observabilidade não dependa do banco estar de pé.
 */
export async function log(
  entry: Omit<LogEntryInput, "workspaceId" | "userId">,
  ctx?: SessionContext | null,
): Promise<void> {
  const full: LogEntryInput = {
    ...entry,
    workspaceId: ctx?.workspace.id ?? null,
    userId: ctx?.user.id ?? null,
  };

  const prefix = `[${entry.scope}]`;
  if (entry.level === "error") console.error(prefix, entry.message, entry.context ?? "");
  else if (entry.level === "warn") console.warn(prefix, entry.message, entry.context ?? "");

  try {
    await getRepositories().logs.append(full);
  } catch (error) {
    // Falha ao registrar log nunca pode derrubar a operação principal.
    console.error("[logging] falha ao gravar log", error);
  }
}

export function errorContext(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack?.slice(0, 800) };
  }
  return { value: String(error) };
}
