import type { AdEnriched } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { OfferEnriched } from "@/core/types/offer";
import type { SessionContext } from "@/core/types/workspace";
import { FORMAT_LABEL } from "@/core/constants/meta";
import { detectAngles } from "@/core/copy/heuristics";
import { normalize } from "@/core/text/normalize";
import { getRepositories } from "@/data";

const DAY = 86_400_000;
const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

export interface SeriesPoint {
  label: string;
  value: number;
}

export interface AdvertiserProfile {
  advertiser: Advertiser;
  ads: AdEnriched[];
  offers: OfferEnriched[];
  activeOverTime: SeriesPoint[];
  creativesOverTime: SeriesPoint[];
  formatMix: SeriesPoint[];
  firstAdAt: string | null;
  lastAdAt: string | null;
  monitored: boolean;
}

/**
 * Perfil consolidado do anunciante.
 *
 * As séries mensais são reconstruídas a partir das janelas de veiculação
 * observadas (início/fim de cada anúncio) — não há histórico diário na fonte,
 * então este é o nível de granularidade honesto.
 */
export async function loadAdvertiserProfile(
  ctx: SessionContext,
  advertiserId: string,
): Promise<AdvertiserProfile | null> {
  const repositories = getRepositories();
  const advertiser = await repositories.catalog.getAdvertiser(ctx, advertiserId);
  if (!advertiser) return null;

  const [ads, offers, monitoredIds] = await Promise.all([
    repositories.catalog.listAdsByAdvertiser(ctx, advertiserId, 400),
    repositories.catalog.listOffersByAdvertiser(ctx, advertiserId),
    repositories.monitoring.monitoredEntityIds(ctx, "advertiser"),
  ]);

  const months = buildMonthBuckets(12);
  const activeOverTime = months.map((month) => ({
    label: month.label,
    value: ads.filter((ad) => overlapsMonth(ad, month)).length,
  }));
  const creativesOverTime = months.map((month) => ({
    label: month.label,
    value: ads
      .filter((ad) => new Date(ad.startedAt) >= month.start && new Date(ad.startedAt) < month.end)
      .reduce((sum, ad) => sum + ad.creatives.length, 0),
  }));

  const formatCounts = new Map<string, number>();
  for (const ad of ads) {
    const label = FORMAT_LABEL[ad.format];
    formatCounts.set(label, (formatCounts.get(label) ?? 0) + 1);
  }

  const startTimes = ads.map((ad) => new Date(ad.startedAt).getTime());
  const lastTimes = ads.map((ad) => new Date(ad.lastSeenAt).getTime());

  return {
    advertiser,
    ads,
    offers,
    activeOverTime,
    creativesOverTime,
    formatMix: [...formatCounts.entries()].map(([label, value]) => ({ label, value })),
    firstAdAt: startTimes.length ? new Date(Math.min(...startTimes)).toISOString() : null,
    lastAdAt: lastTimes.length ? new Date(Math.max(...lastTimes)).toISOString() : null,
    monitored: monitoredIds.has(advertiserId),
  };
}

export interface OfferPattern {
  label: string;
  share: number;
  count: number;
}

export interface OfferProfile {
  offer: OfferEnriched;
  ads: AdEnriched[];
  formatMix: SeriesPoint[];
  ctaMix: SeriesPoint[];
  timeline: SeriesPoint[];
  patterns: OfferPattern[];
  monitored: boolean;
}

/** Perfil da oferta, com os padrões calculados por regra sobre os anúncios. */
export async function loadOfferProfile(
  ctx: SessionContext,
  offerId: string,
): Promise<OfferProfile | null> {
  const repositories = getRepositories();
  const offer = await repositories.catalog.getOffer(ctx, offerId);
  if (!offer) return null;

  const [ads, monitoredIds] = await Promise.all([
    repositories.catalog.listAdsByOffer(ctx, offerId, 300),
    repositories.monitoring.monitoredEntityIds(ctx, "offer"),
  ]);

  const formatCounts = new Map<string, number>();
  const ctaCounts = new Map<string, number>();
  for (const ad of ads) {
    formatCounts.set(FORMAT_LABEL[ad.format], (formatCounts.get(FORMAT_LABEL[ad.format]) ?? 0) + 1);
    if (ad.callToAction) ctaCounts.set(ad.callToAction, (ctaCounts.get(ad.callToAction) ?? 0) + 1);
  }

  const months = buildMonthBuckets(12);
  const timeline = months.map((month) => ({
    label: month.label,
    value: ads.filter((ad) => overlapsMonth(ad, month)).length,
  }));

  return {
    offer,
    ads,
    formatMix: [...formatCounts.entries()].map(([label, value]) => ({ label, value })),
    ctaMix: [...ctaCounts.entries()].map(([label, value]) => ({ label, value })),
    timeline,
    patterns: computePatterns(ads),
    monitored: monitoredIds.has(offerId),
  };
}

/**
 * Padrões observados na oferta.
 *
 * São contagens sobre o texto e os criativos coletados — cada linha é
 * verificável. Nada aqui é gerado por IA.
 */
function computePatterns(ads: AdEnriched[]): OfferPattern[] {
  if (ads.length === 0) return [];
  const total = ads.length;
  const counts = new Map<string, number>();
  const bump = (label: string): void => {
    counts.set(label, (counts.get(label) ?? 0) + 1);
  };

  for (const ad of ads) {
    const text = [ad.headline, ad.bodyText].filter(Boolean).join(" ");
    const flat = normalize(text);

    if (ad.format === "video") bump("usam vídeo");
    if (ad.format === "carousel") bump("usam carrossel");
    if (text.includes("?")) bump("abrem com pergunta ou trazem pergunta no texto");
    if (/whatsapp|whats|zap/.test(flat)) bump("direcionam para WhatsApp");
    if (/gratis|gratuita|gratuito|sem custo/.test(flat)) bump("oferecem algo gratuito");
    if (/garantia|reembolso|risco zero/.test(flat)) bump("prometem garantia");
    if (/\d/.test(text)) bump("usam número na copy");
    if (ad.creatives.some((creative) => (creative.height ?? 0) > (creative.width ?? 1))) {
      bump("têm criativo vertical");
    }
    for (const angle of detectAngles(text).slice(0, 2)) bump(`exploram o ângulo "${angle}"`);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: count / total }))
    .filter((pattern) => pattern.share >= 0.15)
    .sort((a, b) => b.share - a.share)
    .slice(0, 8);
}

/* ------------------------------------------------------------- helpers ---- */

interface MonthBucket {
  label: string;
  start: Date;
  end: Date;
}

function buildMonthBuckets(count: number, now: Date = new Date()): MonthBucket[] {
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { label: MONTH_LABEL.format(start).replace(".", ""), start, end };
  });
}

function overlapsMonth(ad: AdEnriched, month: MonthBucket): boolean {
  const started = new Date(ad.startedAt).getTime();
  const ended = ad.endedAt ? new Date(ad.endedAt).getTime() : Date.now();
  return started < month.end.getTime() && ended >= month.start.getTime() - DAY;
}
