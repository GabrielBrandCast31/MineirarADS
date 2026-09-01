import type { Ad, AdEnriched } from "@/core/types/ad";
import { activeDaysOf } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { Offer } from "@/core/types/offer";
import { computeAdScore, deriveScoreInput } from "@/core/score";

export interface EnrichContext {
  advertiser: Pick<Advertiser, "name" | "avatarUrl"> | null;
  offer: Pick<Offer, "name" | "stats"> | null;
  monitoringObservations?: number;
  saved?: boolean;
  monitored?: boolean;
  now?: Date;
}

/**
 * Ponto único onde um `Ad` cru vira o objeto consumido pela interface.
 * Repositórios diferentes (memória, Supabase) e providers diferentes
 * convergem aqui — o score nunca é calculado em dois lugares.
 */
export function enrichAd(ad: Ad, ctx: EnrichContext): AdEnriched {
  const now = ctx.now ?? new Date();
  const offerStats = ctx.offer?.stats ?? null;
  const score = computeAdScore(
    deriveScoreInput(ad, {
      offerStats,
      monitoringObservations: ctx.monitoringObservations ?? 0,
      now,
    }),
    now,
  );

  return {
    ...ad,
    advertiserName: ctx.advertiser?.name ?? "Anunciante desconhecido",
    advertiserAvatarUrl: ctx.advertiser?.avatarUrl ?? null,
    offerName: ctx.offer?.name ?? null,
    activeDays: activeDaysOf(ad, now),
    relatedAdsCount: Math.max(0, (offerStats?.totalAds ?? 1) - 1),
    score,
    saved: ctx.saved ?? false,
    monitored: ctx.monitored ?? false,
  };
}
