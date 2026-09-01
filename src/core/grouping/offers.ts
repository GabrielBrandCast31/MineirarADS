import type { Ad } from "@/core/types/ad";
import { activeDaysOf } from "@/core/types/ad";
import type { AdFormat, CallToAction } from "@/core/types/common";
import type { OfferStats } from "@/core/types/offer";
import { dominantTerm } from "@/core/text/keywords";
import { slugify } from "@/core/text/normalize";
import { computeAdScore, computeOfferScore, deriveScoreInput } from "@/core/score";
import {
  OFFER_MERGE_THRESHOLD,
  adSimilarity,
  landingKey,
  type AdSimilarityFeatures,
} from "./similarity";

const featuresOf = (ad: Ad): AdSimilarityFeatures => ({
  advertiserId: ad.advertiserId,
  text: [ad.headline, ad.bodyText, ad.linkDescription].filter(Boolean).join(" "),
  destinationUrl: ad.destinationUrl,
});

export interface AdCluster {
  /** Assinatura estável do agrupamento. */
  signature: string;
  /** Nome legível proposto para a oferta. */
  name: string;
  advertiserId: string;
  adIds: string[];
}

/**
 * Agrupa anúncios em ofertas.
 *
 * Estratégia: clusterização aglomerativa simples (single-linkage) por
 * anunciante. É O(n²) dentro de cada anunciante — aceitável porque o número de
 * anúncios por página observado na Ad Library é pequeno (dezenas). Se algum dia
 * um anunciante tiver milhares de anúncios, trocar por LSH/minhash aqui, sem
 * tocar no resto do sistema.
 */
export function clusterAdsIntoOffers(ads: Ad[]): AdCluster[] {
  const byAdvertiser = new Map<string, Ad[]>();
  for (const ad of ads) {
    const list = byAdvertiser.get(ad.advertiserId) ?? [];
    list.push(ad);
    byAdvertiser.set(ad.advertiserId, list);
  }

  const clusters: AdCluster[] = [];

  for (const [advertiserId, group] of byAdvertiser) {
    // Ordenar por data de início dá estabilidade ao resultado.
    const sorted = [...group].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );
    const buckets: Ad[][] = [];

    for (const ad of sorted) {
      const features = featuresOf(ad);
      let target: Ad[] | null = null;
      let bestScore = OFFER_MERGE_THRESHOLD;

      for (const bucket of buckets) {
        const score = Math.max(
          ...bucket.map((member) => adSimilarity(features, featuresOf(member))),
        );
        if (score >= bestScore) {
          bestScore = score;
          target = bucket;
        }
      }

      if (target) target.push(ad);
      else buckets.push([ad]);
    }

    for (const bucket of buckets) {
      const name = proposeOfferName(bucket);
      clusters.push({
        signature: offerSignature(advertiserId, bucket),
        name,
        advertiserId,
        adIds: bucket.map((a) => a.id),
      });
    }
  }

  return clusters;
}

/** Assinatura determinística: anunciante + landing (se houver) + termo dominante. */
export function offerSignature(advertiserId: string, ads: Ad[]): string {
  const landing = ads.map((a) => landingKey(a.destinationUrl)).find(Boolean) ?? "";
  const term = dominantTerm(ads.map((a) => `${a.headline ?? ""} ${a.bodyText ?? ""}`)) ?? "oferta";
  return `${advertiserId}:${slugify(`${landing} ${term}`)}`;
}

/** Nome legível: usa headline recorrente quando existir, senão o termo dominante. */
export function proposeOfferName(ads: Ad[]): string {
  const headlineCounts = new Map<string, number>();
  for (const ad of ads) {
    if (!ad.headline) continue;
    const key = ad.headline.trim();
    headlineCounts.set(key, (headlineCounts.get(key) ?? 0) + 1);
  }
  const repeated = [...headlineCounts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])[0];
  if (repeated) return truncateName(repeated[0]);

  const term = dominantTerm(ads.map((a) => `${a.headline ?? ""} ${a.bodyText ?? ""}`));
  if (term) return titleCase(term);
  return truncateName(ads[0]?.headline ?? ads[0]?.bodyText ?? "Oferta sem título");
}

const truncateName = (value: string): string =>
  value.length > 64 ? `${value.slice(0, 61).trimEnd()}…` : value;

const titleCase = (value: string): string =>
  value
    .split(" ")
    .map((word) => (word.length > 2 ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");

/* --------------------------------------------------------- estatísticas -- */

/** Consolida os números de uma oferta a partir dos anúncios que a compõem. */
export function computeOfferStats(ads: Ad[], now: Date = new Date()): OfferStats {
  if (ads.length === 0) {
    return {
      totalAds: 0,
      activeAds: 0,
      totalCreatives: 0,
      activeDays: 0,
      formatBreakdown: {},
      topCallToAction: null,
      score: 0,
    };
  }

  const formatBreakdown: Partial<Record<AdFormat, number>> = {};
  const ctaCounts = new Map<CallToAction, number>();
  let totalCreatives = 0;
  let earliest = Number.POSITIVE_INFINITY;
  let latest = 0;

  for (const ad of ads) {
    formatBreakdown[ad.format] = (formatBreakdown[ad.format] ?? 0) + 1;
    totalCreatives += ad.creatives.length;
    if (ad.callToAction) ctaCounts.set(ad.callToAction, (ctaCounts.get(ad.callToAction) ?? 0) + 1);
    earliest = Math.min(earliest, new Date(ad.startedAt).getTime());
    const end = ad.endedAt ? new Date(ad.endedAt).getTime() : now.getTime();
    latest = Math.max(latest, end);
  }

  const activeDays = Math.max(0, Math.floor((latest - earliest) / 86_400_000));
  const activeAds = ads.filter((a) => a.status === "active").length;

  const offerStatsForScore = { activeDays, activeAds, totalAds: ads.length };
  const adScores = ads.map((ad) => ({
    value: computeAdScore(deriveScoreInput(ad, { offerStats: offerStatsForScore, now }), now).value,
    activeDays: activeDaysOf(ad, now),
  }));

  const topCallToAction =
    [...ctaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalAds: ads.length,
    activeAds,
    totalCreatives,
    activeDays,
    formatBreakdown,
    topCallToAction,
    score: computeOfferScore(adScores),
  };
}
