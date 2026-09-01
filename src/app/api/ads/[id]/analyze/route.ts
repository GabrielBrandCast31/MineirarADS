import { z } from "zod";
import { NotFoundError } from "@/data/types";
import { apiHandler, readJson } from "@/lib/api/handler";
import { getRepositories } from "@/data";
import { analyzeAdCopy, analyzeAdCreatives } from "@/server/services/analysis";

const bodySchema = z.object({
  target: z.enum(["copy", "creative", "both"]).default("copy"),
  force: z.boolean().default(false),
});

/** POST /api/ads/[id]/analyze */
export const POST = apiHandler<{ id: string }>(
  async ({ request, session, params }) => {
    const { target, force } = await readJson(request, bodySchema);
    const ad = await getRepositories().catalog.getAd(session, params.id);
    if (!ad) throw new NotFoundError("Anúncio", params.id);

    const copy =
      target === "copy" || target === "both"
        ? await analyzeAdCopy(session, ad, { force })
        : null;
    const creatives =
      target === "creative" || target === "both"
        ? await analyzeAdCreatives(session, ad, { force })
        : null;

    return { copy, creatives };
  },
  { limit: 40, windowSeconds: 60 },
);
