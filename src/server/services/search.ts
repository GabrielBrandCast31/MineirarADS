import type { AdEnriched } from "@/core/types/ad";
import type { SessionContext } from "@/core/types/workspace";
import type { SearchAdsParams } from "@/core/types/search";
import { DEFAULT_SEARCH_PARAMS } from "@/core/types/search";
import { getRepositories } from "@/data";
import { getAdProvider } from "@/providers/ads";
import { assertQuota } from "./quota";
import { errorContext, log } from "./logging";

export interface MineResult {
  items: AdEnriched[];
  total: number;
  nextCursor: string | null;
  provider: string;
  /** Filtros que a fonte não conseguiu aplicar. Exibidos ao usuário. */
  warnings: string[];
  degraded: boolean;
  durationMs: number;
  searchId: string | null;
}

/**
 * Mineração de anúncios — o fluxo central do produto.
 *
 * Pipeline:
 *   cota -> provider externo -> upsert no catálogo -> consulta enriquecida
 *        -> registro da busca -> consumo -> log
 *
 * A consulta final sai sempre do catálogo (e não do provider) para que score,
 * ordenação e filtros derivados tenham exatamente o mesmo comportamento
 * independentemente da fonte.
 */
export async function mineAds(
  ctx: SessionContext,
  rawParams: SearchAdsParams,
): Promise<MineResult> {
  const params: SearchAdsParams = { ...DEFAULT_SEARCH_PARAMS, ...rawParams };
  const started = Date.now();
  const repositories = getRepositories();
  const warnings: string[] = [];
  let providerName = "catalog";
  let degraded = false;

  await assertQuota(ctx, "searches");

  // 1) Coleta na fonte. Falha aqui não impede a leitura do que já foi coletado.
  try {
    const provider = getAdProvider();
    providerName = provider.name;
    const fetched = await provider.searchAds(params);
    warnings.push(...fetched.warnings);
    degraded = fetched.degraded;

    if (fetched.items.length > 0) {
      await repositories.catalog.upsertBatch(ctx, { ads: fetched.items });
    }
  } catch (error) {
    degraded = true;
    warnings.push(
      "A fonte externa não respondeu. Mostrando o que já havia sido coletado anteriormente.",
    );
    await log(
      {
        level: "error",
        scope: "search",
        message: "Falha ao consultar o provider de anúncios",
        context: { params, ...errorContext(error) },
      },
      ctx,
    );
  }

  // 2) Leitura enriquecida do catálogo: score, ordenação e filtros derivados.
  const page = await repositories.catalog.queryAds(ctx, params);
  const durationMs = Date.now() - started;

  // 3) Histórico + consumo. Só a primeira página conta como busca nova.
  let searchId: string | null = null;
  if (!params.cursor) {
    const record = await repositories.searches.record(
      ctx,
      {
        params,
        provider: providerName,
        resultCount: page.total,
        durationMs,
        status: degraded ? "partial" : "ok",
        errorMessage: null,
      },
      page.items.map((ad) => ad.id),
    );
    searchId = record.id;
    await repositories.usage.increment(ctx, "searches");
    await log(
      {
        level: "info",
        scope: "search",
        message: `Mineração "${params.query ?? ""}" retornou ${page.total} anúncios`,
        context: { params, durationMs, provider: providerName },
      },
      ctx,
    );
  }

  return {
    items: page.items,
    total: page.total,
    nextCursor: page.nextCursor,
    provider: providerName,
    warnings,
    degraded,
    durationMs,
    searchId,
  };
}

/** Sugestões para o autocomplete da barra de mineração. */
export async function suggestSearchTerms(prefix: string): Promise<string[]> {
  try {
    return await getAdProvider().suggestTerms(prefix, 8);
  } catch {
    return [];
  }
}
