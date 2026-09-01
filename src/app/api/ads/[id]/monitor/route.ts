import { NotFoundError } from "@/data/types";
import { apiHandler } from "@/lib/api/handler";
import { getRepositories } from "@/data";
import { startMonitoring } from "@/server/services/monitoring";

/** POST /api/ads/[id]/monitor */
export const POST = apiHandler<{ id: string }>(async ({ session, params }) => {
  const ad = await getRepositories().catalog.getAd(session, params.id);
  if (!ad) throw new NotFoundError("Anúncio", params.id);

  return startMonitoring(session, {
    target: "ad",
    entityId: ad.id,
    label: ad.headline ?? ad.advertiserName,
    thumbnail: ad.creatives[0]?.thumbnailUrl ?? null,
  });
});
