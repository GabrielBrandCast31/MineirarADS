import type { Ad } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { AdFormat, CountryCode, Platform } from "@/core/types/common";
import type { Creative } from "@/core/types/creative";
import type { Offer } from "@/core/types/offer";
import { adLibraryUrlFor } from "@/core/constants/meta";
import { computeOfferStats } from "@/core/grouping/offers";
import { slugify } from "@/core/text/normalize";
import { avatarDataUrl } from "@/lib/avatar";
import {
  CTA_LINES,
  EMOJI_POOL,
  HEADLINE_VARIANTS,
  NICHES,
  OBJECTION_LINES,
  PROOF_LINES,
  URGENCY_LINES,
  type NicheTemplate,
  type OfferTemplate,
} from "./content";
import { Rng } from "./rng";

export interface MockDataset {
  advertisers: Advertiser[];
  offers: Offer[];
  ads: Ad[];
  /** Instante de referência usado na geração — mantém os cálculos coerentes. */
  generatedAt: Date;
  index: {
    advertiserById: Map<string, Advertiser>;
    offerById: Map<string, Offer>;
    adById: Map<string, Ad>;
    adsByOfferId: Map<string, Ad[]>;
    adsByAdvertiserId: Map<string, Ad[]>;
    offersByAdvertiserId: Map<string, Offer[]>;
    /** Termos de busca -> ids de anúncio, para busca por palavra-chave. */
    searchTerms: Map<string, Set<string>>;
  };
}

const DEFAULT_SEED = 20260831;
const DAY = 86_400_000;

const PLATFORM_MIXES: Platform[][] = [
  ["facebook", "instagram"],
  ["facebook", "instagram", "messenger"],
  ["facebook", "instagram", "messenger", "audience_network"],
  ["instagram"],
  ["facebook"],
];

const COUNTRY_MIXES: CountryCode[][] = [["BR"], ["BR"], ["BR"], ["BR", "PT"], ["PT"], ["US"]];

/* ------------------------------------------------------------- criativos -- */

interface Dimensions {
  width: number;
  height: number;
}

const DIMENSION_POOL: Record<AdFormat, Dimensions[]> = {
  image: [
    { width: 1080, height: 1080 },
    { width: 1080, height: 1350 },
    { width: 1200, height: 628 },
  ],
  video: [
    { width: 1080, height: 1920 },
    { width: 1080, height: 1080 },
    { width: 1080, height: 1350 },
  ],
  carousel: [{ width: 1080, height: 1080 }],
  dco: [{ width: 1080, height: 1080 }],
  unknown: [{ width: 1080, height: 1080 }],
};

function buildCreatives(
  rng: Rng,
  adId: string,
  format: AdFormat,
  offer: OfferTemplate,
  createdAt: Date,
): Creative[] {
  const count = format === "carousel" ? rng.int(3, 6) : format === "video" ? rng.int(1, 2) : rng.int(1, 3);
  const dims = rng.pick(DIMENSION_POOL[format]);

  return Array.from({ length: count }, (_, position) => {
    const seed = `${adId}-${position}`;
    const isVideo = format === "video";
    return {
      id: `cre_${seed}`,
      adId,
      format: format === "carousel" ? "image" : format,
      sourceUrl: `https://picsum.photos/seed/${seed}/${dims.width}/${dims.height}`,
      storagePath: null,
      thumbnailUrl: `https://picsum.photos/seed/${seed}/${Math.round(dims.width / 2)}/${Math.round(
        dims.height / 2,
      )}`,
      width: dims.width,
      height: dims.height,
      durationSeconds: isVideo ? rng.int(8, 96) : null,
      position,
      title: rng.bool(0.7) ? rng.pick(offer.headlines) : null,
      linkDescription: rng.bool(0.4) ? `${offer.name} • Avaliação sem custo` : null,
      linkUrl: `https://${offer.domain}/${offer.path}`,
      createdAt: createdAt.toISOString(),
    } satisfies Creative;
  });
}

/* ------------------------------------------------------------------ copy -- */

function buildBody(rng: Rng, offer: OfferTemplate): string {
  const blocks: string[] = [];
  blocks.push(rng.pick(offer.hooks));
  blocks.push(rng.pick(offer.problems));
  blocks.push(rng.pick(offer.mechanisms));

  if (rng.bool(0.62)) {
    blocks.push(rng.pick(PROOF_LINES).replace("{n}", String(rng.int(3, 40) * 100)));
  }
  if (rng.bool(0.55)) blocks.push(rng.pick(OBJECTION_LINES));
  if (rng.bool(0.28)) blocks.push(rng.pick(URGENCY_LINES));

  const emoji = rng.bool(0.7) ? `${rng.pick(EMOJI_POOL)} ` : "";
  blocks.push(`${emoji}${rng.pick(CTA_LINES)}`);

  return blocks.join("\n\n");
}

function buildHeadline(rng: Rng, offer: OfferTemplate): string {
  return `${rng.pick(offer.headlines)}${rng.pick(HEADLINE_VARIANTS)}`;
}

/* ---------------------------------------------------------------- anúncio -- */

interface AdSeed {
  advertiser: Advertiser;
  offerTemplate: OfferTemplate;
  offerId: string;
  index: number;
}

function buildAd(rng: Rng, seed: AdSeed, now: Date): Ad {
  const { advertiser, offerTemplate, offerId, index } = seed;
  const id = `ad_${advertiser.id}_${slugify(offerTemplate.name)}_${index}`;

  // Ofertas antigas concentram anúncios longevos; as recentes, anúncios novos.
  const ageDays = rng.int(2, 430);
  const startedAt = new Date(now.getTime() - ageDays * DAY);

  // Quanto mais antigo, maior a chance de já ter sido encerrado.
  const activeProbability = ageDays > 300 ? 0.32 : ageDays > 120 ? 0.55 : 0.78;
  const isActive = rng.bool(activeProbability);
  const runDays = isActive ? ageDays : rng.int(3, Math.max(4, ageDays));
  const endedAt = isActive ? null : new Date(startedAt.getTime() + runDays * DAY);

  const format: AdFormat = rng.pick<AdFormat>([
    "video", "video", "video", "image", "image", "carousel",
  ]);

  const bodyVariationCount = rng.int(1, 4);
  const bodyVariations = Array.from({ length: bodyVariationCount }, () => buildBody(rng, offerTemplate));
  const archiveId = String(rng.int(100_000_000_000_000, 999_999_999_999_999));
  const countries = rng.pick(COUNTRY_MIXES);
  const lastSeenAt = isActive
    ? new Date(now.getTime() - rng.int(0, 2) * DAY)
    : new Date((endedAt ?? startedAt).getTime() + rng.int(0, 3) * DAY);

  const isSocialIssue = rng.bool(0.07);

  return {
    id,
    workspaceId: null,
    metaAdArchiveId: archiveId,
    adLibraryUrl: adLibraryUrlFor(archiveId, countries[0] ?? "BR"),
    advertiserId: advertiser.id,
    offerId,
    status: isActive ? "active" : "inactive",
    format,
    platforms: rng.pick(PLATFORM_MIXES),
    countries,
    bodyText: bodyVariations[0] ?? null,
    headline: buildHeadline(rng, offerTemplate),
    linkDescription: rng.bool(0.5) ? `${offerTemplate.name} • ${advertiser.name}` : null,
    callToAction: rng.pick(offerTemplate.ctas),
    destinationUrl: `https://${offerTemplate.domain}/${offerTemplate.path}?utm_source=meta`,
    bodyVariations,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt ? endedAt.toISOString() : null,
    impressionsLowerBound: isSocialIssue ? rng.int(1, 40) * 1000 : null,
    impressionsUpperBound: isSocialIssue ? rng.int(41, 120) * 1000 : null,
    spendLowerBound: isSocialIssue ? rng.int(1, 5) * 1000 : null,
    spendUpperBound: isSocialIssue ? rng.int(6, 20) * 1000 : null,
    currency: isSocialIssue ? "BRL" : null,
    creatives: buildCreatives(rng, id, format, offerTemplate, startedAt),
    firstSeenAt: startedAt.toISOString(),
    lastSeenAt: lastSeenAt.toISOString(),
    createdAt: startedAt.toISOString(),
  };
}

/* ---------------------------------------------------------------- builder -- */

function buildAdvertisers(rng: Rng, now: Date): Array<Advertiser & { niche: NicheTemplate }> {
  const out: Array<Advertiser & { niche: NicheTemplate }> = [];
  for (const niche of NICHES) {
    for (const name of niche.advertisers) {
      const id = `adv_${slugify(name)}`;
      out.push({
        id,
        metaPageId: String(rng.int(100_000_000_000, 999_999_999_999)),
        name,
        avatarUrl: avatarDataUrl(name),
        category: niche.category,
        country: "BR",
        verified: rng.bool(0.45),
        websiteUrl: `https://${slugify(name).replace(/-/g, "")}.com.br`,
        stats: {
          totalAds: 0,
          activeAds: 0,
          totalOffers: 0,
          totalCreatives: 0,
          avgActiveDays: 0,
          maxActiveDays: 0,
          formatBreakdown: {},
        },
        firstSeenAt: now.toISOString(),
        lastSeenAt: now.toISOString(),
        niche,
      });
    }
  }
  return out;
}

/**
 * Constrói o dataset completo de demonstração.
 *
 * Determinístico por semente: útil para testes e para que a navegação entre
 * páginas continue mostrando o mesmo anúncio.
 */
export function buildMockDataset(seed = DEFAULT_SEED, now: Date = new Date()): MockDataset {
  const rng = new Rng(seed);
  const advertisers = buildAdvertisers(rng, now);
  const ads: Ad[] = [];
  const offers: Offer[] = [];

  for (const advertiser of advertisers) {
    const templates = rng.sample(
      advertiser.niche.offers,
      rng.int(1, Math.min(3, advertiser.niche.offers.length)),
    );

    for (const template of templates) {
      const offerId = `off_${advertiser.id}_${slugify(template.name)}`;
      const adCount = rng.int(template.adRange[0], template.adRange[1]);
      const offerAds = Array.from({ length: adCount }, (_, index) =>
        buildAd(rng, { advertiser, offerTemplate: template, offerId, index }, now),
      );
      ads.push(...offerAds);

      const stats = computeOfferStats(offerAds, now);
      const startTimes = offerAds.map((a) => new Date(a.startedAt).getTime());
      const lastTimes = offerAds.map((a) => new Date(a.lastSeenAt).getTime());

      offers.push({
        id: offerId,
        workspaceId: null,
        advertiserId: advertiser.id,
        name: template.name,
        signature: `${advertiser.id}:${slugify(template.name)}`,
        origin: "auto",
        firstAdStartedAt: new Date(Math.min(...startTimes)).toISOString(),
        lastAdSeenAt: new Date(Math.max(...lastTimes)).toISOString(),
        stats,
        createdAt: new Date(Math.min(...startTimes)).toISOString(),
        updatedAt: now.toISOString(),
      });
    }
  }

  // Recalcula as métricas agregadas dos anunciantes com os anúncios prontos.
  const cleanAdvertisers: Advertiser[] = advertisers.map((advertiser) => {
    const own = ads.filter((a) => a.advertiserId === advertiser.id);
    const ownOffers = offers.filter((o) => o.advertiserId === advertiser.id);
    const activeDaysList = own.map((a) => {
      const end = a.endedAt ? new Date(a.endedAt).getTime() : now.getTime();
      return Math.floor((end - new Date(a.startedAt).getTime()) / DAY);
    });
    const formatBreakdown: Record<string, number> = {};
    for (const ad of own) formatBreakdown[ad.format] = (formatBreakdown[ad.format] ?? 0) + 1;

    const { niche: _niche, ...rest } = advertiser;
    return {
      ...rest,
      firstSeenAt: own.length
        ? new Date(Math.min(...own.map((a) => new Date(a.startedAt).getTime()))).toISOString()
        : now.toISOString(),
      lastSeenAt: own.length
        ? new Date(Math.max(...own.map((a) => new Date(a.lastSeenAt).getTime()))).toISOString()
        : now.toISOString(),
      stats: {
        totalAds: own.length,
        activeAds: own.filter((a) => a.status === "active").length,
        totalOffers: ownOffers.length,
        totalCreatives: own.reduce((sum, a) => sum + a.creatives.length, 0),
        avgActiveDays: activeDaysList.length
          ? Math.round(activeDaysList.reduce((a, b) => a + b, 0) / activeDaysList.length)
          : 0,
        maxActiveDays: activeDaysList.length ? Math.max(...activeDaysList) : 0,
        formatBreakdown,
      },
    };
  });

  return {
    advertisers: cleanAdvertisers,
    offers,
    ads,
    generatedAt: now,
    index: buildIndex(cleanAdvertisers, offers, ads),
  };
}

function buildIndex(
  advertisers: Advertiser[],
  offers: Offer[],
  ads: Ad[],
): MockDataset["index"] {
  const advertiserById = new Map(advertisers.map((a) => [a.id, a]));
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const adById = new Map(ads.map((a) => [a.id, a]));
  const adsByOfferId = new Map<string, Ad[]>();
  const adsByAdvertiserId = new Map<string, Ad[]>();
  const offersByAdvertiserId = new Map<string, Offer[]>();
  const searchTerms = new Map<string, Set<string>>();

  const addTerm = (term: string, adId: string): void => {
    const key = slugify(term);
    const set = searchTerms.get(key) ?? new Set<string>();
    set.add(adId);
    searchTerms.set(key, set);
  };

  for (const ad of ads) {
    push(adsByOfferId, ad.offerId ?? "none", ad);
    push(adsByAdvertiserId, ad.advertiserId, ad);
  }
  for (const offer of offers) push(offersByAdvertiserId, offer.advertiserId, offer);

  // Termos vindos dos templates: garantem que buscar "implante dentário"
  // encontre exatamente os anúncios da oferta correspondente.
  for (const niche of NICHES) {
    for (const offerTemplate of niche.offers) {
      const matchingOffers = offers.filter((o) => o.name === offerTemplate.name);
      for (const offer of matchingOffers) {
        const offerAds = adsByOfferId.get(offer.id) ?? [];
        for (const ad of offerAds) {
          for (const keyword of [...offerTemplate.keywords, ...niche.keywords]) {
            addTerm(keyword, ad.id);
          }
        }
      }
    }
  }

  return {
    advertiserById,
    offerById,
    adById,
    adsByOfferId,
    adsByAdvertiserId,
    offersByAdvertiserId,
    searchTerms,
  };
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

/* ------------------------------------------------------------- singleton -- */

let cached: MockDataset | null = null;

/** Dataset compartilhado do processo. Gerado uma única vez. */
export function getMockDataset(): MockDataset {
  cached ??= buildMockDataset();
  return cached;
}

/** Apenas para testes: força a regeneração. */
export function resetMockDataset(): void {
  cached = null;
}
