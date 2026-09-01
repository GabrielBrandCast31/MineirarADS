import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import type { Repositories } from "./types";
import {
  MemoryAnalysisRepository,
  MemoryLibraryRepository,
  MemoryLogRepository,
  MemoryMonitoringRepository,
  MemorySearchRepository,
  MemoryUsageRepository,
  MemoryWorkspaceRepository,
} from "./memory/workspace-data";
import { MemoryCatalogRepository } from "./memory/catalog";
import { buildSupabaseRepositories } from "./supabase";

export * from "./types";

let cached: Repositories | null = null;

function buildMemoryRepositories(): Repositories {
  return {
    driver: "memory",
    catalog: new MemoryCatalogRepository(),
    library: new MemoryLibraryRepository(),
    monitoring: new MemoryMonitoringRepository(),
    analysis: new MemoryAnalysisRepository(),
    searches: new MemorySearchRepository(),
    usage: new MemoryUsageRepository(),
    logs: new MemoryLogRepository(),
    workspaces: new MemoryWorkspaceRepository(),
  };
}

/**
 * Camada de dados.
 *
 * `DATA_DRIVER=memory`   -> repositórios em memória sobre o dataset mockado.
 * `DATA_DRIVER=supabase` -> Postgres via Supabase, com RLS.
 *
 * Escolher o driver é a única coisa que muda. Nenhum serviço, rota ou
 * componente conhece a implementação concreta.
 */
export function getRepositories(): Repositories {
  if (cached) return cached;
  const env = serverEnv();

  if (env.DATA_DRIVER === "supabase") {
    if (!isSupabaseConfigured()) {
      console.warn(
        "[data] DATA_DRIVER=supabase mas as chaves do Supabase não estão configuradas. Usando o driver em memória.",
      );
      const fallback = buildMemoryRepositories();
      cached = fallback;
      return fallback;
    }
    const repositories = buildSupabaseRepositories();
    cached = repositories;
    return repositories;
  }

  const repositories = buildMemoryRepositories();
  cached = repositories;
  return repositories;
}

/** Usado em testes. */
export function setRepositories(repositories: Repositories | null): void {
  cached = repositories;
}
