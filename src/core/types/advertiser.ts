import type { CountryCode, ISODateTime } from "./common";

/**
 * Anunciante = entidade por trás de uma ou mais páginas.
 * Na Meta Ad Library o identificador estável é a Página; mantemos a distinção
 * porque uma mesma empresa pode operar várias páginas para a mesma oferta.
 */
export interface Advertiser {
  id: string;
  /** ID da página na Meta (`page_id`). Chave natural para deduplicação. */
  metaPageId: string | null;
  name: string;
  avatarUrl: string | null;
  category: string | null;
  country: CountryCode | null;
  verified: boolean;
  websiteUrl: string | null;
  /** Métricas agregadas — recalculadas a cada coleta. */
  stats: AdvertiserStats;
  firstSeenAt: ISODateTime;
  lastSeenAt: ISODateTime;
}

export interface AdvertiserStats {
  totalAds: number;
  activeAds: number;
  totalOffers: number;
  totalCreatives: number;
  /** Média de dias ativos entre todos os anúncios observados. */
  avgActiveDays: number;
  /** Maior tempo ativo observado, em dias. */
  maxActiveDays: number;
  /** Distribuição por formato, em contagem absoluta. */
  formatBreakdown: Record<string, number>;
}

export const EMPTY_ADVERTISER_STATS: AdvertiserStats = {
  totalAds: 0,
  activeAds: 0,
  totalOffers: 0,
  totalCreatives: 0,
  avgActiveDays: 0,
  maxActiveDays: 0,
  formatBreakdown: {},
};
