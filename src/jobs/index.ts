import type { SessionContext } from "@/core/types/workspace";
import { serverEnv } from "@/lib/env";
import { buildJobHandlers } from "./handlers";
import { InMemoryJobQueue } from "./memory-queue";
import { RedisJobQueue } from "./redis-queue";
import type { JobQueue } from "./types";

export * from "./types";

let cached: JobQueue | null = null;
let contextResolver: ((workspaceId: string) => Promise<SessionContext | null>) | null = null;

/**
 * Registra como o worker obtém um contexto de sessão a partir do workspace.
 *
 * A camada de jobs não sabe autenticar; quem sabe é a aplicação. Este ponto de
 * injeção mantém a fila livre de dependência de auth.
 */
export function setJobContextResolver(
  resolver: (workspaceId: string) => Promise<SessionContext | null>,
): void {
  contextResolver = resolver;
  cached = null;
}

export function getJobQueue(): JobQueue {
  if (cached) return cached;
  const env = serverEnv();

  const handlers = buildJobHandlers(
    contextResolver ?? (async () => null),
  );

  cached =
    env.JOB_DRIVER === "redis"
      ? new RedisJobQueue(env.REDIS_URL ?? "redis://localhost:6379", handlers)
      : new InMemoryJobQueue(handlers);

  return cached;
}
