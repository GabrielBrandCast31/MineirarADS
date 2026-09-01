import { serverEnv } from "./env";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Rate limit por janela fixa, em memória.
 *
 * Suficiente para uma instância única. Em produção com múltiplas instâncias,
 * troque o `Map` por Redis (`INCR` + `EXPIRE`) — a interface abaixo não muda.
 *
 * Isto protege a nossa API. Não tem relação com limites de terceiros: a
 * plataforma respeita os limites da Meta usando a API oficial dentro da cota
 * concedida, nunca contornando-os.
 */
const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit(key: string, options: { limit?: number; windowSeconds?: number } = {}): RateLimitResult {
  const env = serverEnv();
  const limit = options.limit ?? env.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = (options.windowSeconds ?? env.RATE_LIMIT_WINDOW_SECONDS) * 1000;
  const now = Date.now();

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    if (buckets.size > 10_000) pruneExpired(now);
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt, limit };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    limit,
  };
}

/** Evita crescimento indefinido do mapa em processos longos. */
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
