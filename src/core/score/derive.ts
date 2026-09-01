import type { Ad } from "@/core/types/ad";
import { activeDaysOf } from "@/core/types/ad";
import { aspectRatioOf } from "@/core/types/creative";
import type { OfferStats } from "@/core/types/offer";
import type { AdScoreInput } from "./ad-score";
import { EMPTY_SCORE_INPUT } from "./ad-score";

export interface ScoreContext {
  offerStats?: Pick<OfferStats, "activeDays" | "activeAds" | "totalAds"> | null;
  monitoringObservations?: number;
  now?: Date;
}

/**
 * Traduz um `Ad` + contexto de oferta nos sinais do score.
 * Fica separado do cálculo para que o algoritmo permaneça testável com
 * entradas sintéticas.
 */
export function deriveScoreInput(ad: Ad, ctx: ScoreContext = {}): AdScoreInput {
  const now = ctx.now ?? new Date();
  const activeDays = activeDaysOf(ad, now);
  const formats = new Set(ad.creatives.map((c) => c.format));
  const ratios = new Set(
    ad.creatives.map((c) => aspectRatioOf(c)).filter((r): r is string => Boolean(r)),
  );
  const daysSinceLastSeen = Math.max(
    0,
    Math.floor((now.getTime() - new Date(ad.lastSeenAt).getTime()) / 86_400_000),
  );
  const relatedAdsCount = Math.max(0, (ctx.offerStats?.totalAds ?? 1) - 1);

  return {
    ...EMPTY_SCORE_INPUT,
    activeDays,
    isActive: ad.status === "active",
    creativeCount: Math.max(1, ad.creatives.length),
    bodyVariationCount: Math.max(1, ad.bodyVariations.length),
    distinctFormats: Math.max(1, formats.size),
    distinctAspectRatios: Math.max(1, ratios.size),
    platformCount: Math.max(1, ad.platforms.length),
    relatedAdsCount,
    offerActiveDays: ctx.offerStats?.activeDays ?? activeDays,
    offerActiveAds: ctx.offerStats?.activeAds ?? (ad.status === "active" ? 1 : 0),
    daysSinceLastSeen,
    monitoringObservations: ctx.monitoringObservations ?? 0,
  };
}
