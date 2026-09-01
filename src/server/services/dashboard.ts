import type { AdEnriched } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { OfferEnriched } from "@/core/types/offer";
import type { MonitoringEvent } from "@/core/types/monitoring";
import type { SearchRecord } from "@/core/types/search";
import type { SessionContext } from "@/core/types/workspace";
import { getRepositories } from "@/data";

export interface DashboardMetric {
  key: string;
  label: string;
  value: number;
  /** Variação percentual contra o período anterior; `null` quando não aplicável. */
  delta: number | null;
  hint: string;
}

export interface DashboardData {
  metrics: DashboardMetric[];
  topAds: AdEnriched[];
  topOffers: OfferEnriched[];
  activeAdvertisers: Advertiser[];
  latestDiscoveries: AdEnriched[];
  recentEvents: MonitoringEvent[];
  recentSearches: SearchRecord[];
  /** Série semanal de anúncios que entraram no ar. */
  discoveryTrend: Array<{ label: string; value: number }>;
  /** Distribuição de score em faixas. */
  scoreDistribution: Array<{ label: string; value: number }>;
  formatMix: Array<{ label: string; value: number }>;
}

const WEEK = 7 * 86_400_000;

/**
 * Agrega tudo o que o dashboard mostra em uma única chamada.
 *
 * Fica no servidor de propósito: a página é um Server Component e não deve
 * fazer seis requisições em cascata a partir do browser.
 */
export async function loadDashboard(ctx: SessionContext): Promise<DashboardData> {
  const repositories = getRepositories();
  const now = new Date();

  const [everything, topOffers, advertisers, monitors, events, searches, savedAds, savedOffers] =
    await Promise.all([
      repositories.catalog.queryAds(ctx, { status: "all", sort: "score", limit: 96 }),
      repositories.catalog.listTopOffers(ctx, 6),
      repositories.catalog.listAdvertisers(ctx, { limit: 6 }),
      repositories.monitoring.listMonitors(ctx),
      repositories.monitoring.listEvents(ctx, { limit: 8 }),
      repositories.searches.listRecent(ctx, 6),
      repositories.library.savedEntityIds(ctx, "ad"),
      repositories.library.savedEntityIds(ctx, "offer"),
    ]);

  const [activeOnly, latest] = await Promise.all([
    repositories.catalog.queryAds(ctx, { status: "active", limit: 1 }),
    repositories.catalog.queryAds(ctx, { status: "all", sort: "newest", limit: 6 }),
  ]);

  const sample = everything.items;

  const metrics: DashboardMetric[] = [
    {
      key: "found",
      label: "Anúncios encontrados",
      value: everything.total,
      delta: null,
      hint: "Total de anúncios já coletados e visíveis neste workspace.",
    },
    {
      key: "active",
      label: "Anúncios ativos",
      value: activeOnly.total,
      delta:
        everything.total > 0
          ? Number(((activeOnly.total / everything.total) * 100).toFixed(0))
          : null,
      hint: "Ainda veiculando na última coleta.",
    },
    {
      key: "monitored",
      label: "Anúncios monitorados",
      value: monitors.length,
      delta: null,
      hint: "Alvos com snapshots periódicos ativos.",
    },
    {
      key: "opportunities",
      label: "Top oportunidades",
      value: sample.filter((ad) => ad.score.value >= 80).length,
      delta: null,
      hint: "Score 80+ — persistência e volume de criativos acima da média.",
    },
    {
      key: "advertisers",
      label: "Páginas analisadas",
      value: (await repositories.catalog.listAdvertisers(ctx, { limit: 1000 })).length,
      delta: null,
      hint: "Anunciantes distintos no catálogo.",
    },
    {
      key: "saved",
      label: "Itens salvos",
      value: savedAds.size + savedOffers.size,
      delta: null,
      hint: "Anúncios e ofertas guardados nas suas coleções.",
    },
  ];

  return {
    metrics,
    topAds: sample.slice(0, 6),
    topOffers,
    activeAdvertisers: advertisers,
    latestDiscoveries: latest.items,
    recentEvents: events,
    recentSearches: searches,
    discoveryTrend: buildTrend(sample, now),
    scoreDistribution: buildScoreDistribution(sample),
    formatMix: buildFormatMix(sample),
  };
}

function buildTrend(ads: AdEnriched[], now: Date): Array<{ label: string; value: number }> {
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const end = now.getTime() - i * WEEK;
    return { start: end - WEEK, end, value: 0 };
  }).reverse();

  for (const ad of ads) {
    const started = new Date(ad.startedAt).getTime();
    const bucket = buckets.find((b) => started >= b.start && started < b.end);
    if (bucket) bucket.value += 1;
  }

  return buckets.map((bucket) => ({
    label: new Date(bucket.start).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    value: bucket.value,
  }));
}

function buildScoreDistribution(ads: AdEnriched[]): Array<{ label: string; value: number }> {
  const bands = [
    { label: "0–39", min: 0, max: 39 },
    { label: "40–64", min: 40, max: 64 },
    { label: "65–84", min: 65, max: 84 },
    { label: "85–100", min: 85, max: 100 },
  ];
  return bands.map((band) => ({
    label: band.label,
    value: ads.filter((ad) => ad.score.value >= band.min && ad.score.value <= band.max).length,
  }));
}

function buildFormatMix(ads: AdEnriched[]): Array<{ label: string; value: number }> {
  const counts = new Map<string, number>();
  for (const ad of ads) counts.set(ad.format, (counts.get(ad.format) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));
}
