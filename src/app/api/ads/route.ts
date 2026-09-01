import { z } from "zod";
import { apiHandler, readQuery } from "@/lib/api/handler";
import { parseSearchParams } from "@/components/ads/search-params";
import { getRepositories } from "@/data";

const querySchema = z.record(z.string(), z.string()).optional();

/**
 * GET /api/ads
 *
 * Lê o catálogo já coletado. Não dispara mineração — para isso use
 * `POST /api/search`, que consome cota.
 */
export const GET = apiHandler(async ({ request, session }) => {
  const raw = readQuery(request, querySchema) ?? {};
  const params = parseSearchParams(raw);
  const page = await getRepositories().catalog.queryAds(session, params);

  return {
    items: page.items,
    total: page.total,
    nextCursor: page.nextCursor,
  };
});
