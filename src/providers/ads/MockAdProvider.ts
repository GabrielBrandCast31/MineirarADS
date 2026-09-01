import type { Ad } from "@/core/types/ad";
import { activeDaysOf } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { Offer } from "@/core/types/offer";
import type { SearchAdsParams } from "@/core/types/search";
import { normalize, slugify, tokenize } from "@/core/text/normalize";
import { getMockDataset, type MockDataset } from "@/mock/dataset";
import { NICHES } from "@/mock/content";
import type {
  AdProvider,
  AdSearchResult,
  ProviderCapabilities,
} from "./AdProvider";

const DAY = 86_400_000;

const CAPABILITIES: ProviderCapabilities = {
  keywordSearch: true,
  countryFilter: true,
  statusFilter: true,
  formatFilter: true,
  platformFilter: true,
  creativeAssets: true,
  impressionRanges: true,
  cursorPagination: true,
};

/**
 * Provider de demonstração.
 *
 * Serve dois propósitos: permitir que toda a interface seja construída e
 * validada antes da integração oficial, e servir de referência de
 * comportamento esperado (paginação, filtros, ordenação estável).
 */
export class MockAdProvider implements AdProvider {
  readonly name = "mock";
  readonly capabilities = CAPABILITIES;

  private readonly dataset: MockDataset;
  /** Latência simulada, em ms — deixa os estados de loading visíveis. */
  private readonly latencyMs: number;

  constructor(options: { dataset?: MockDataset; latencyMs?: number } = {}) {
    this.dataset = options.dataset ?? getMockDataset();
    this.latencyMs = options.latencyMs ?? 220;
  }

  async searchAds(params: SearchAdsParams): Promise<AdSearchResult> {
    await this.delay();
    const limit = clampLimit(params.limit);
    const offset = decodeCursor(params.cursor);
    const filtered = this.applyFilters(params);

    // Ordenação estável por data de início; a ordenação final (score, etc.)
    // é responsabilidade da camada de serviço, que tem o score calculado.
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    const page = sorted.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page,
      total: sorted.length,
      nextCursor: nextOffset < sorted.length ? encodeCursor(nextOffset) : null,
      provider: this.name,
      warnings: [],
      degraded: false,
    };
  }

  async getAd(id: string): Promise<Ad | null> {
    await this.delay(60);
    return this.dataset.index.adById.get(id) ?? null;
  }

  async getAdvertiser(id: string): Promise<Advertiser | null> {
    await this.delay(60);
    return this.dataset.index.advertiserById.get(id) ?? null;
  }

  async getOffer(id: string): Promise<Offer | null> {
    await this.delay(60);
    return this.dataset.index.offerById.get(id) ?? null;
  }

  async listAdsByAdvertiser(advertiserId: string, limit = 200): Promise<Ad[]> {
    await this.delay(60);
    return (this.dataset.index.adsByAdvertiserId.get(advertiserId) ?? []).slice(0, limit);
  }

  async listAdsByOffer(offerId: string, limit = 200): Promise<Ad[]> {
    await this.delay(60);
    return (this.dataset.index.adsByOfferId.get(offerId) ?? []).slice(0, limit);
  }

  async listOffersByAdvertiser(advertiserId: string, limit = 100): Promise<Offer[]> {
    await this.delay(60);
    return (this.dataset.index.offersByAdvertiserId.get(advertiserId) ?? []).slice(0, limit);
  }

  async listAdvertisers(limit = 100): Promise<Advertiser[]> {
    await this.delay(60);
    return [...this.dataset.advertisers]
      .sort((a, b) => b.stats.activeAds - a.stats.activeAds)
      .slice(0, limit);
  }

  async suggestTerms(prefix: string, limit = 8): Promise<string[]> {
    const flat = normalize(prefix);
    if (flat.length < 2) return SUGGESTION_POOL.slice(0, limit);
    return SUGGESTION_POOL.filter((term) => normalize(term).includes(flat)).slice(0, limit);
  }

  /* --------------------------------------------------------------- filtros -- */

  private applyFilters(params: SearchAdsParams): Ad[] {
    const now = this.dataset.generatedAt;
    let ads = this.dataset.ads;

    if (params.query && params.query.trim().length > 0) {
      ads = this.matchQuery(ads, params.query);
    }

    if (params.advertiser && params.advertiser.trim().length > 0) {
      const needle = normalize(params.advertiser);
      const matchingIds = new Set(
        this.dataset.advertisers
          .filter(
            (a) =>
              normalize(a.name).includes(needle) ||
              a.metaPageId === params.advertiser?.trim() ||
              a.id === params.advertiser,
          )
          .map((a) => a.id),
      );
      ads = ads.filter((ad) => matchingIds.has(ad.advertiserId));
    }

    if (params.status && params.status !== "all") {
      ads = ads.filter((ad) => ad.status === params.status);
    }

    if (params.countries?.length) {
      const wanted = new Set(params.countries);
      if (!wanted.has("ALL")) {
        ads = ads.filter((ad) => ad.countries.some((c) => wanted.has(c)));
      }
    }

    if (params.formats?.length) {
      const wanted = new Set(params.formats);
      ads = ads.filter((ad) => wanted.has(ad.format));
    }

    if (params.platforms?.length) {
      const wanted = new Set(params.platforms);
      ads = ads.filter((ad) => ad.platforms.some((p) => wanted.has(p)));
    }

    const range = resolveDateRange(params, now);
    if (range) {
      ads = ads.filter((ad) => {
        const started = new Date(ad.startedAt).getTime();
        const ended = ad.endedAt ? new Date(ad.endedAt).getTime() : now.getTime();
        // Sobreposição de intervalos: o anúncio esteve no ar durante a janela.
        return ended >= range.from && started <= range.to;
      });
    }

    if (params.minActiveDays && params.minActiveDays > 0) {
      ads = ads.filter((ad) => activeDaysOf(ad, now) >= params.minActiveDays!);
    }

    return ads;
  }

  /** Casamento por termo indexado + fallback textual. */
  private matchQuery(ads: Ad[], query: string): Ad[] {
    const key = slugify(query);
    const indexed = this.dataset.index.searchTerms.get(key);
    if (indexed && indexed.size > 0) {
      return ads.filter((ad) => indexed.has(ad.id));
    }

    const terms = tokenize(query);
    if (terms.length === 0) return ads;

    // Casamento parcial em termos indexados (ex.: "implante" -> "implante dentário").
    const partial = new Set<string>();
    for (const [term, ids] of this.dataset.index.searchTerms) {
      if (terms.some((t) => term.includes(t))) for (const id of ids) partial.add(id);
    }
    if (partial.size > 0) return ads.filter((ad) => partial.has(ad.id));

    return ads.filter((ad) => {
      const haystack = normalize(
        [ad.headline, ad.bodyText, ad.linkDescription].filter(Boolean).join(" "),
      );
      return terms.every((term) => haystack.includes(term));
    });
  }

  private delay(ms = this.latencyMs): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/* ------------------------------------------------------------- utilitários -- */

function clampLimit(limit: number | undefined): number {
  return Math.min(96, Math.max(1, limit ?? 24));
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ o: offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      o?: number;
    };
    return Math.max(0, parsed.o ?? 0);
  } catch {
    return 0;
  }
}

function resolveDateRange(
  params: SearchAdsParams,
  now: Date,
): { from: number; to: number } | null {
  const preset = params.datePreset ?? "any";
  if (preset === "any") return null;
  if (preset === "custom") {
    if (!params.dateFrom && !params.dateTo) return null;
    return {
      from: params.dateFrom ? new Date(params.dateFrom).getTime() : 0,
      to: params.dateTo ? new Date(`${params.dateTo}T23:59:59Z`).getTime() : now.getTime(),
    };
  }
  const days = Number.parseInt(preset.replace("d", ""), 10);
  return { from: now.getTime() - days * DAY, to: now.getTime() };
}

/** Sugestões da barra de busca — extraídas dos templates do dataset. */
const SUGGESTION_POOL: string[] = [
  ...new Set(
    NICHES.flatMap((niche) => [
      ...niche.offers.flatMap((offer) => offer.keywords),
      ...niche.keywords,
    ]),
  ),
].sort((a, b) => a.localeCompare(b, "pt-BR"));
