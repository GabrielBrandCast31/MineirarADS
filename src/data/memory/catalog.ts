import type { Ad, AdEnriched, AdSnapshot } from "@/core/types/ad";
import { activeDaysOf } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { Paginated } from "@/core/types/common";
import type { Offer, OfferEnriched } from "@/core/types/offer";
import type { SessionContext } from "@/core/types/workspace";
import type { SortOption } from "@/core/types/search";
import { enrichAd } from "@/core/enrich";
import { normalize } from "@/core/text/normalize";
import type { CatalogQuery, CatalogRepository } from "@/data/types";
import { getMemoryStore, type MemoryStore } from "./store";

const DAY = 86_400_000;

/**
 * Catálogo em memória sobre o dataset mockado.
 *
 * O dataset é imutável; upserts entram em coleções auxiliares. Isso mantém a
 * demonstração estável enquanto ainda permite ingerir dados de um provider.
 */
export class MemoryCatalogRepository implements CatalogRepository {
  private get store(): MemoryStore {
    return getMemoryStore();
  }

  async queryAds(ctx: SessionContext, query: CatalogQuery): Promise<Paginated<AdEnriched>> {
    const store = this.store;
    const now = new Date();
    let ads = store.dataset.ads;

    if (query.query?.trim()) ads = filterByQuery(store, ads, query.query);
    if (query.advertiser?.trim()) {
      const needle = normalize(query.advertiser);
      const ids = new Set(
        store.dataset.advertisers
          .filter((a) => normalize(a.name).includes(needle) || a.id === query.advertiser)
          .map((a) => a.id),
      );
      ads = ads.filter((ad) => ids.has(ad.advertiserId));
    }
    if (query.status && query.status !== "all") ads = ads.filter((a) => a.status === query.status);
    if (query.countries?.length) {
      const wanted = new Set(query.countries);
      if (!wanted.has("ALL")) ads = ads.filter((a) => a.countries.some((c) => wanted.has(c)));
    }
    if (query.formats?.length) {
      const wanted = new Set(query.formats);
      ads = ads.filter((a) => wanted.has(a.format));
    }
    if (query.platforms?.length) {
      const wanted = new Set(query.platforms);
      ads = ads.filter((a) => a.platforms.some((p) => wanted.has(p)));
    }
    const range = resolveRange(query, now);
    if (range) {
      ads = ads.filter((ad) => {
        const started = new Date(ad.startedAt).getTime();
        const ended = ad.endedAt ? new Date(ad.endedAt).getTime() : now.getTime();
        return ended >= range.from && started <= range.to;
      });
    }
    if (query.minActiveDays) {
      ads = ads.filter((ad) => activeDaysOf(ad, now) >= query.minActiveDays!);
    }

    const enriched = ads.map((ad) => this.enrich(ctx, ad, now));
    const filtered =
      query.minScore != null
        ? enriched.filter((ad) => ad.score.value >= query.minScore!)
        : enriched;

    const sorted = sortAds(filtered, query.sort ?? "score");
    const limit = Math.min(96, Math.max(1, query.limit ?? 24));
    const offset = decodeCursor(query.cursor);
    const page = sorted.slice(offset, offset + limit);

    return {
      items: page,
      total: sorted.length,
      nextCursor: offset + page.length < sorted.length ? encodeCursor(offset + page.length) : null,
    };
  }

  async getAd(ctx: SessionContext, id: string): Promise<AdEnriched | null> {
    const ad = this.store.dataset.index.adById.get(id);
    return ad ? this.enrich(ctx, ad) : null;
  }

  async getAdsByIds(ctx: SessionContext, ids: string[]): Promise<AdEnriched[]> {
    const now = new Date();
    return ids
      .map((id) => this.store.dataset.index.adById.get(id))
      .filter((ad): ad is Ad => Boolean(ad))
      .map((ad) => this.enrich(ctx, ad, now));
  }

  async getAdvertiser(_ctx: SessionContext, id: string): Promise<Advertiser | null> {
    return this.store.dataset.index.advertiserById.get(id) ?? null;
  }

  async findAdvertiserByMetaPageId(
    _ctx: SessionContext,
    metaPageId: string,
  ): Promise<Advertiser | null> {
    const wanted = metaPageId.trim();
    return this.store.dataset.advertisers.find((a) => a.metaPageId === wanted) ?? null;
  }

  async listAdvertisers(
    _ctx: SessionContext,
    options: { limit?: number; query?: string } = {},
  ): Promise<Advertiser[]> {
    let list = this.store.dataset.advertisers;
    if (options.query?.trim()) {
      const needle = normalize(options.query);
      list = list.filter((a) => normalize(a.name).includes(needle));
    }
    return [...list]
      .sort((a, b) => b.stats.activeAds - a.stats.activeAds)
      .slice(0, options.limit ?? 50);
  }

  async listAdsByAdvertiser(
    ctx: SessionContext,
    advertiserId: string,
    limit = 200,
  ): Promise<AdEnriched[]> {
    const now = new Date();
    const ads = this.store.dataset.index.adsByAdvertiserId.get(advertiserId) ?? [];
    return sortAds(
      ads.map((ad) => this.enrich(ctx, ad, now)),
      "score",
    ).slice(0, limit);
  }

  async listOffersByAdvertiser(
    _ctx: SessionContext,
    advertiserId: string,
  ): Promise<OfferEnriched[]> {
    const offers = this.store.dataset.index.offersByAdvertiserId.get(advertiserId) ?? [];
    return offers
      .map((offer) => this.enrichOffer(offer))
      .sort((a, b) => b.stats.score - a.stats.score);
  }

  async getOffer(_ctx: SessionContext, id: string): Promise<OfferEnriched | null> {
    const offer = this.store.dataset.index.offerById.get(id);
    return offer ? this.enrichOffer(offer) : null;
  }

  async listAdsByOffer(ctx: SessionContext, offerId: string, limit = 200): Promise<AdEnriched[]> {
    const now = new Date();
    const ads = this.store.dataset.index.adsByOfferId.get(offerId) ?? [];
    return sortAds(
      ads.map((ad) => this.enrich(ctx, ad, now)),
      "active_days_desc",
    ).slice(0, limit);
  }

  async listTopOffers(_ctx: SessionContext, limit = 8): Promise<OfferEnriched[]> {
    return [...this.store.dataset.offers]
      .sort((a, b) => b.stats.score - a.stats.score)
      .slice(0, limit)
      .map((offer) => this.enrichOffer(offer));
  }

  /**
   * O driver em memória aceita o upsert para manter o contrato, mas o dataset
   * de demonstração é imutável: gravar nele faria a demonstração divergir a
   * cada busca. Registros novos entram apenas nos índices auxiliares.
   */
  async upsertBatch(
    _ctx: SessionContext,
    payload: { advertisers?: Advertiser[]; offers?: Offer[]; ads?: Ad[] },
  ): Promise<{ ads: number; advertisers: number; offers: number }> {
    const store = this.store;
    let ads = 0;

    for (const advertiser of payload.advertisers ?? []) {
      if (!store.dataset.index.advertiserById.has(advertiser.id)) {
        store.dataset.advertisers.push(advertiser);
        store.dataset.index.advertiserById.set(advertiser.id, advertiser);
      }
    }
    for (const offer of payload.offers ?? []) {
      if (!store.dataset.index.offerById.has(offer.id)) {
        store.dataset.offers.push(offer);
        store.dataset.index.offerById.set(offer.id, offer);
        push(store.dataset.index.offersByAdvertiserId, offer.advertiserId, offer);
      }
    }
    for (const ad of payload.ads ?? []) {
      if (store.dataset.index.adById.has(ad.id)) continue;
      store.dataset.ads.push(ad);
      store.dataset.index.adById.set(ad.id, ad);
      push(store.dataset.index.adsByAdvertiserId, ad.advertiserId, ad);
      // Sem este índice, um anúncio coletado nunca entrava na oferta dele — e
      // acompanhar o crescimento de uma oferta ficava impossível: a contagem
      // só via o que o dataset já trazia.
      if (ad.offerId) push(store.dataset.index.adsByOfferId, ad.offerId, ad);
      ads += 1;
    }

    return {
      ads,
      advertisers: payload.advertisers?.length ?? 0,
      offers: payload.offers?.length ?? 0,
    };
  }

  async appendAdSnapshot(_ctx: SessionContext, snapshot: AdSnapshot): Promise<void> {
    this.store.adSnapshots.push(snapshot);
  }

  async listAdSnapshots(
    _ctx: SessionContext,
    adId: string,
    limit = 60,
  ): Promise<AdSnapshot[]> {
    return this.store.adSnapshots
      .filter((s) => s.adId === adId)
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime())
      .slice(0, limit);
  }

  /* -------------------------------------------------------------- helpers -- */

  private enrich(ctx: SessionContext, ad: Ad, now = new Date()): AdEnriched {
    const store = this.store;
    const advertiser = store.dataset.index.advertiserById.get(ad.advertiserId) ?? null;
    const offer = ad.offerId ? (store.dataset.index.offerById.get(ad.offerId) ?? null) : null;

    const saved = store.collectionItems.some(
      (item) =>
        item.workspaceId === ctx.workspace.id && item.kind === "ad" && item.entityId === ad.id,
    );
    const monitored = store.monitors.some(
      (m) => m.workspaceId === ctx.workspace.id && m.target === "ad" && m.entityId === ad.id,
    );
    const monitoringObservations = store.monitoringSnapshots.filter((snapshot) =>
      store.monitors.some(
        (m) =>
          m.id === snapshot.monitorId &&
          m.workspaceId === ctx.workspace.id &&
          ((m.target === "offer" && m.entityId === ad.offerId) ||
            (m.target === "advertiser" && m.entityId === ad.advertiserId) ||
            (m.target === "ad" && m.entityId === ad.id)),
      ),
    ).length;

    return enrichAd(ad, {
      advertiser,
      offer,
      saved,
      monitored,
      monitoringObservations,
      now,
    });
  }

  private enrichOffer(offer: Offer): OfferEnriched {
    const advertiser = this.store.dataset.index.advertiserById.get(offer.advertiserId);
    return {
      ...offer,
      advertiserName: advertiser?.name ?? "Anunciante desconhecido",
      advertiserAvatarUrl: advertiser?.avatarUrl ?? null,
    };
  }
}

/* ------------------------------------------------------------- utilitários -- */

/** Acrescenta a uma lista indexada, criando-a na primeira vez. */
function push<T>(index: Map<string, T[]>, key: string, value: T): void {
  const current = index.get(key);
  if (current) current.push(value);
  else index.set(key, [value]);
}

function filterByQuery(store: MemoryStore, ads: Ad[], query: string): Ad[] {
  const terms = normalize(query).split(" ").filter((t) => t.length >= 3);
  if (terms.length === 0) return ads;

  const matching = new Set<string>();
  for (const [term, ids] of store.dataset.index.searchTerms) {
    if (terms.some((t) => term.includes(t))) for (const id of ids) matching.add(id);
  }
  if (matching.size > 0) return ads.filter((ad) => matching.has(ad.id));

  return ads.filter((ad) => {
    const haystack = normalize([ad.headline, ad.bodyText].filter(Boolean).join(" "));
    return terms.every((term) => haystack.includes(term));
  });
}

export function sortAds(ads: AdEnriched[], sort: SortOption): AdEnriched[] {
  const copy = [...ads];
  switch (sort) {
    case "score":
      return copy.sort((a, b) => b.score.value - a.score.value || b.activeDays - a.activeDays);
    case "active_days_desc":
      return copy.sort((a, b) => b.activeDays - a.activeDays);
    case "newest":
      return copy.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
    case "oldest":
      return copy.sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );
    case "creatives_desc":
      return copy.sort((a, b) => b.creatives.length - a.creatives.length);
    case "relevance":
    default:
      // Relevância = score moderado por atualidade do último sinal observado.
      return copy.sort((a, b) => relevance(b) - relevance(a));
  }
}

function relevance(ad: AdEnriched): number {
  const daysSinceSeen = Math.max(
    0,
    (Date.now() - new Date(ad.lastSeenAt).getTime()) / DAY,
  );
  return ad.score.value - Math.min(25, daysSinceSeen * 0.8);
}

function resolveRange(query: CatalogQuery, now: Date): { from: number; to: number } | null {
  const preset = query.datePreset ?? "any";
  if (preset === "any") return null;
  if (preset === "custom") {
    if (!query.dateFrom && !query.dateTo) return null;
    return {
      from: query.dateFrom ? new Date(query.dateFrom).getTime() : 0,
      to: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`).getTime() : now.getTime(),
    };
  }
  const days = Number.parseInt(preset.replace("d", ""), 10);
  return { from: now.getTime() - days * DAY, to: now.getTime() };
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { o?: number };
    return Math.max(0, parsed.o ?? 0);
  } catch {
    return 0;
  }
}
