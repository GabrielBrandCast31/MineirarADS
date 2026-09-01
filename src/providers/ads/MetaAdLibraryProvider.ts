import type { Ad } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import { EMPTY_ADVERTISER_STATS } from "@/core/types/advertiser";
import type {
  AdFormat,
  AdStatus,
  CallToAction,
  CountryCode,
  Platform,
} from "@/core/types/common";
import type { Offer } from "@/core/types/offer";
import type { SearchAdsParams } from "@/core/types/search";
import { adLibraryUrlFor } from "@/core/constants/meta";
import { avatarDataUrl } from "@/lib/avatar";
import {
  ProviderConfigurationError,
  ProviderNotImplementedError,
  type AdProvider,
  type AdSearchResult,
  type ProviderCapabilities,
} from "./AdProvider";

/**
 * Integração com a **Meta Ad Library API** oficial.
 *
 * Documentação: https://www.facebook.com/ads/library/api/
 *
 * Pré-requisitos (feitos uma única vez, fora do código):
 *  1. App no Meta for Developers com a permissão `ads_read`;
 *  2. identidade verificada e localização confirmada na conta;
 *  3. token de acesso de usuário de longa duração.
 *
 * Limites conhecidos da API — a interface precisa refleti-los honestamente:
 *  - **Não retorna os arquivos de criativo.** Só `ad_snapshot_url`, a página
 *    pública do anúncio. Miniaturas próprias exigem coleta manual/importação.
 *  - Impressões e gasto só existem para anúncios de tema social/eleitoral.
 *  - Não há filtro nativo por formato de mídia além de `media_type`
 *    (IMAGE | VIDEO | MEMES | NONE) — carrossel não é distinguível.
 *  - `search_terms` faz correspondência textual; não há busca semântica.
 *
 * Nada aqui contorna autenticação, CAPTCHA, rate limit ou qualquer proteção:
 * é exclusivamente o endpoint público documentado, com o token do usuário.
 */
export class MetaAdLibraryProvider implements AdProvider {
  readonly name = "meta_ad_library";

  readonly capabilities: ProviderCapabilities = {
    keywordSearch: true,
    countryFilter: true,
    statusFilter: true,
    // `media_type` cobre imagem/vídeo, mas não separa carrossel.
    formatFilter: true,
    // A API devolve `publisher_platforms` no resultado, mas não filtra por ela.
    platformFilter: false,
    creativeAssets: false,
    impressionRanges: true,
    cursorPagination: true,
  };

  private readonly accessToken: string;
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(options: { accessToken?: string; apiVersion?: string } = {}) {
    const token = options.accessToken;
    if (!token) {
      throw new ProviderConfigurationError(
        "meta_ad_library",
        "META_AD_LIBRARY_ACCESS_TOKEN ausente. Configure o token antes de selecionar ADS_PROVIDER=meta.",
      );
    }
    this.accessToken = token;
    this.apiVersion = options.apiVersion ?? "v21.0";
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/ads_archive`;
  }

  /* ---------------------------------------------------------------- busca -- */

  async searchAds(params: SearchAdsParams): Promise<AdSearchResult> {
    const warnings: string[] = [];
    const url = new URL(this.baseUrl);

    const searchTerms = params.query?.trim();
    const pageId = params.advertiser?.trim();
    if (!searchTerms && !pageId) {
      throw new ProviderConfigurationError(
        this.name,
        "A Ad Library exige `search_terms` ou `search_page_ids`. Informe uma palavra-chave ou uma página.",
      );
    }

    url.searchParams.set("access_token", this.accessToken);
    url.searchParams.set("fields", AD_ARCHIVE_FIELDS.join(","));
    url.searchParams.set("limit", String(Math.min(96, params.limit ?? 24)));
    url.searchParams.set(
      "ad_reached_countries",
      JSON.stringify(params.countries?.filter((c) => c !== "ALL") ?? ["BR"]),
    );
    url.searchParams.set("ad_active_status", STATUS_TO_API[params.status ?? "active"] ?? "ACTIVE");
    url.searchParams.set("ad_type", "ALL");
    if (searchTerms) {
      url.searchParams.set("search_terms", searchTerms);
      url.searchParams.set("search_type", "KEYWORD_UNORDERED");
    }
    if (pageId && /^\d+$/.test(pageId)) {
      url.searchParams.set("search_page_ids", JSON.stringify([pageId]));
    } else if (pageId) {
      warnings.push(
        "A Ad Library filtra por página apenas via `page_id` numérico; o nome informado foi ignorado.",
      );
    }

    const mediaType = toMediaType(params.formats);
    if (mediaType) url.searchParams.set("media_type", mediaType);
    if (params.formats?.includes("carousel")) {
      warnings.push("A API não distingue carrossel; o filtro de formato foi aproximado.");
    }
    if (params.platforms?.length) {
      warnings.push(
        "A API não filtra por plataforma de veiculação; o filtro foi aplicado após a coleta.",
      );
    }

    const range = resolveDateBounds(params);
    if (range.min) url.searchParams.set("ad_delivery_date_min", range.min);
    if (range.max) url.searchParams.set("ad_delivery_date_max", range.max);
    if (params.cursor) url.searchParams.set("after", params.cursor);

    const response = await fetch(url, {
      headers: { accept: "application/json" },
      // Resultados mudam devagar; o cache reduz consumo de cota da API.
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const detail = await safeErrorMessage(response);
      throw new Error(`[${this.name}] Graph API ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as AdArchiveResponse;
    let items = (payload.data ?? []).map((raw) => mapAd(raw));

    if (params.platforms?.length) {
      const wanted = new Set(params.platforms);
      items = items.filter((ad) => ad.platforms.some((p) => wanted.has(p)));
    }

    return {
      items,
      total: items.length,
      nextCursor: payload.paging?.cursors?.after ?? null,
      provider: this.name,
      warnings,
      degraded: warnings.length > 0,
    };
  }

  /* ------------------------------------------------- operações derivadas -- */

  /**
   * A Ad Library não expõe leitura de um anúncio isolado por `ad_archive_id`.
   * O caminho correto é ler do nosso próprio banco, que guarda o que já foi
   * coletado. Este provider é uma fonte de ingestão, não um cache de leitura.
   */
  async getAd(_id: string): Promise<Ad | null> {
    throw new ProviderNotImplementedError(
      this.name,
      "getAd",
      "A Ad Library não permite buscar um anúncio por ID. Leia do repositório local (tabela `ads`), alimentado pela ingestão.",
    );
  }

  /**
   * Não há endpoint de "anunciante". O que existe é `page_id` + `page_name`
   * embutidos em cada anúncio. O perfil consolidado é construído por nós,
   * agregando os anúncios coletados.
   */
  async getAdvertiser(_id: string): Promise<Advertiser | null> {
    throw new ProviderNotImplementedError(
      this.name,
      "getAdvertiser",
      "Perfis de anunciante são derivados dos anúncios coletados; leia de `advertisers`.",
    );
  }

  /** Oferta é um conceito nosso (agrupamento), não da Meta. */
  async getOffer(_id: string): Promise<Offer | null> {
    throw new ProviderNotImplementedError(
      this.name,
      "getOffer",
      "Ofertas são produzidas por `clusterAdsIntoOffers` sobre os anúncios coletados.",
    );
  }

  async listAdsByAdvertiser(advertiserId: string, limit = 96): Promise<Ad[]> {
    if (!/^\d+$/.test(advertiserId)) {
      throw new ProviderConfigurationError(
        this.name,
        "listAdsByAdvertiser exige o `page_id` numérico da Meta.",
      );
    }
    const result = await this.searchAds({ advertiser: advertiserId, status: "all", limit });
    return result.items;
  }

  async listAdsByOffer(_offerId: string): Promise<Ad[]> {
    throw new ProviderNotImplementedError(
      this.name,
      "listAdsByOffer",
      "Agrupamento por oferta é local; consulte o repositório.",
    );
  }

  async listOffersByAdvertiser(_advertiserId: string): Promise<Offer[]> {
    throw new ProviderNotImplementedError(this.name, "listOffersByAdvertiser");
  }

  async listAdvertisers(): Promise<Advertiser[]> {
    throw new ProviderNotImplementedError(
      this.name,
      "listAdvertisers",
      "A API não lista páginas; a lista é montada a partir do que foi coletado.",
    );
  }

  async suggestTerms(): Promise<string[]> {
    // Sem endpoint de sugestão na API. As sugestões vêm do histórico local.
    return [];
  }
}

/* ------------------------------------------------------------- mapeamento -- */

/** Campos solicitados ao endpoint `ads_archive`. */
export const AD_ARCHIVE_FIELDS = [
  "id",
  "ad_creation_time",
  "ad_creative_bodies",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "ad_creative_link_titles",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "ad_snapshot_url",
  "page_id",
  "page_name",
  "publisher_platforms",
  "languages",
  "currency",
  "impressions",
  "spend",
  "estimated_audience_size",
  "target_locations",
] as const;

interface AdArchiveResponse {
  data?: AdArchiveRecord[];
  paging?: { cursors?: { after?: string } };
}

interface AdArchiveRecord {
  id: string;
  ad_creation_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_descriptions?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_snapshot_url?: string;
  page_id?: string;
  page_name?: string;
  publisher_platforms?: string[];
  currency?: string;
  impressions?: { lower_bound?: string; upper_bound?: string };
  spend?: { lower_bound?: string; upper_bound?: string };
  target_locations?: Array<{ name?: string }>;
}

const STATUS_TO_API: Record<string, string> = {
  active: "ACTIVE",
  inactive: "INACTIVE",
  all: "ALL",
  unknown: "ALL",
};

const PLATFORM_MAP: Record<string, Platform> = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  MESSENGER: "messenger",
  AUDIENCE_NETWORK: "audience_network",
  THREADS: "threads",
};

function toMediaType(formats: AdFormat[] | undefined): string | null {
  if (!formats || formats.length === 0) return null;
  const hasVideo = formats.includes("video");
  const hasImage = formats.includes("image") || formats.includes("carousel");
  if (hasVideo && !hasImage) return "VIDEO";
  if (hasImage && !hasVideo) return "IMAGE";
  return null;
}

function resolveDateBounds(params: SearchAdsParams): { min?: string; max?: string } {
  if (params.datePreset === "custom") {
    return {
      ...(params.dateFrom ? { min: params.dateFrom } : {}),
      ...(params.dateTo ? { max: params.dateTo } : {}),
    };
  }
  if (!params.datePreset || params.datePreset === "any") return {};
  const days = Number.parseInt(params.datePreset.replace("d", ""), 10);
  if (Number.isNaN(days)) return {};
  const min = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return { min };
}

/**
 * Converte o registro da Graph API no nosso `Ad`.
 *
 * O que a API não fornece fica explicitamente `null` — nunca preenchemos
 * com estimativa. `creatives` fica vazio porque a API não entrega os arquivos;
 * a coluna existe para ser preenchida por importação manual autorizada.
 */
export function mapAd(raw: AdArchiveRecord, now: Date = new Date()): Ad {
  const startedAt = raw.ad_delivery_start_time ?? raw.ad_creation_time ?? now.toISOString();
  const endedAt = raw.ad_delivery_stop_time ?? null;
  const status: AdStatus = endedAt && new Date(endedAt) < now ? "inactive" : "active";
  const platforms = (raw.publisher_platforms ?? [])
    .map((p) => PLATFORM_MAP[p.toUpperCase()])
    .filter((p): p is Platform => Boolean(p));

  return {
    id: `meta_${raw.id}`,
    workspaceId: null,
    metaAdArchiveId: raw.id,
    adLibraryUrl: raw.ad_snapshot_url ?? adLibraryUrlFor(raw.id),
    advertiserId: raw.page_id ? `page_${raw.page_id}` : "unknown",
    offerId: null,
    status,
    // A API não informa o formato do criativo; classificar exigiria abrir o
    // snapshot. Mantemos `unknown` em vez de adivinhar.
    format: "unknown",
    platforms,
    countries: [],
    bodyText: raw.ad_creative_bodies?.[0] ?? null,
    headline: raw.ad_creative_link_titles?.[0] ?? null,
    linkDescription: raw.ad_creative_link_descriptions?.[0] ?? null,
    callToAction: null satisfies CallToAction | null,
    destinationUrl: raw.ad_creative_link_captions?.[0]
      ? normalizeCaptionUrl(raw.ad_creative_link_captions[0])
      : null,
    bodyVariations: raw.ad_creative_bodies ?? [],
    startedAt: new Date(startedAt).toISOString(),
    endedAt: endedAt ? new Date(endedAt).toISOString() : null,
    impressionsLowerBound: toNumber(raw.impressions?.lower_bound),
    impressionsUpperBound: toNumber(raw.impressions?.upper_bound),
    spendLowerBound: toNumber(raw.spend?.lower_bound),
    spendUpperBound: toNumber(raw.spend?.upper_bound),
    currency: raw.currency ?? null,
    creatives: [],
    firstSeenAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    createdAt: now.toISOString(),
  };
}

/** Perfil mínimo do anunciante a partir do que vem embutido no anúncio. */
export function mapAdvertiser(raw: AdArchiveRecord, now: Date = new Date()): Advertiser | null {
  if (!raw.page_id) return null;
  const name = raw.page_name ?? `Página ${raw.page_id}`;
  return {
    id: `page_${raw.page_id}`,
    metaPageId: raw.page_id,
    name,
    avatarUrl: avatarDataUrl(name),
    category: null,
    country: null satisfies CountryCode | null,
    verified: false,
    websiteUrl: null,
    stats: EMPTY_ADVERTISER_STATS,
    firstSeenAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
  };
}

function toNumber(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeCaptionUrl(caption: string): string {
  return caption.startsWith("http") ? caption : `https://${caption}`;
}

async function safeErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
