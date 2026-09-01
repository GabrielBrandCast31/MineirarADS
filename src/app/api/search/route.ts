import { z } from "zod";
import { apiHandler, readJson } from "@/lib/api/handler";
import { mineAds } from "@/server/services/search";

const bodySchema = z.object({
  query: z.string().max(200).optional(),
  countries: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive", "unknown", "all"]).optional(),
  formats: z.array(z.enum(["image", "video", "carousel", "dco", "unknown"])).optional(),
  platforms: z
    .array(z.enum(["facebook", "instagram", "messenger", "audience_network", "threads"]))
    .optional(),
  advertiser: z.string().max(120).optional(),
  datePreset: z.enum(["7d", "30d", "90d", "180d", "custom", "any"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minActiveDays: z.number().int().min(0).max(365).optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  sort: z
    .enum(["relevance", "score", "active_days_desc", "newest", "oldest", "creatives_desc"])
    .optional(),
  limit: z.number().int().min(1).max(96).optional(),
  cursor: z.string().nullable().optional(),
});

/**
 * POST /api/search
 *
 * Dispara a mineração: consulta o provider externo, ingere no catálogo e
 * devolve a página enriquecida. Consome a cota `searches`.
 */
export const POST = apiHandler(
  async ({ request, session }) => {
    const body = await readJson(request, bodySchema);
    // A validação acima já restringiu os valores; o cast alinha os literais.
    const result = await mineAds(session, body as Parameters<typeof mineAds>[1]);

    return {
      items: result.items,
      total: result.total,
      nextCursor: result.nextCursor,
      provider: result.provider,
      warnings: result.warnings,
      degraded: result.degraded,
      durationMs: result.durationMs,
      searchId: result.searchId,
    };
  },
  // Mineração é cara: limite mais apertado que o padrão.
  { limit: 30, windowSeconds: 60 },
);
