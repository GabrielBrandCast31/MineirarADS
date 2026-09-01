import { NotFoundError } from "@/data/types";
import { apiHandler } from "@/lib/api/handler";
import { getRepositories } from "@/data";

/** GET /api/ads/[id] */
export const GET = apiHandler<{ id: string }>(async ({ session, params }) => {
  const ad = await getRepositories().catalog.getAd(session, params.id);
  if (!ad) throw new NotFoundError("Anúncio", params.id);
  return ad;
});
