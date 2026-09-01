import type { Repositories } from "@/data/types";
import { SupabaseCatalogRepository } from "./catalog";
import {
  SupabaseAnalysisRepository,
  SupabaseLibraryRepository,
  SupabaseLogRepository,
  SupabaseMonitoringRepository,
  SupabaseSearchRepository,
  SupabaseUsageRepository,
  SupabaseWorkspaceRepository,
} from "./workspace-data";

/**
 * Driver Postgres/Supabase da camada de dados.
 *
 * Ativado por `DATA_DRIVER=supabase`. Requer as migrações de
 * `supabase/migrations` aplicadas — inclusive a de RLS, sem a qual o
 * isolamento entre workspaces não existe.
 */
export function buildSupabaseRepositories(): Repositories {
  return {
    driver: "supabase",
    catalog: new SupabaseCatalogRepository(),
    library: new SupabaseLibraryRepository(),
    monitoring: new SupabaseMonitoringRepository(),
    analysis: new SupabaseAnalysisRepository(),
    searches: new SupabaseSearchRepository(),
    usage: new SupabaseUsageRepository(),
    logs: new SupabaseLogRepository(),
    workspaces: new SupabaseWorkspaceRepository(),
  };
}
