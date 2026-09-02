import type { Ad } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { Offer } from "@/core/types/offer";
import type { Paginated } from "@/core/types/common";
import type { SearchAdsParams } from "@/core/types/search";

/** O que a fonte de dados consegue fazer. A UI usa isso para não prometer demais. */
export interface ProviderCapabilities {
  /** Busca por palavra-chave livre. */
  keywordSearch: boolean;
  /** Filtro por país na origem. */
  countryFilter: boolean;
  /** Filtro por status (ativo/inativo) na origem. */
  statusFilter: boolean;
  /** Filtro por formato de criativo na origem. */
  formatFilter: boolean;
  /** Filtro por plataforma de veiculação na origem. */
  platformFilter: boolean;
  /** A fonte devolve as URLs dos criativos. */
  creativeAssets: boolean;
  /** A fonte devolve faixa de impressões/gasto (categorias especiais). */
  impressionRanges: boolean;
  /** Suporta paginação por cursor. */
  cursorPagination: boolean;
}

export interface AdSearchResult extends Paginated<Ad> {
  /** Nome do provider que atendeu a busca. */
  provider: string;
  /** Avisos exibíveis: filtro não suportado, resultado truncado, etc. */
  warnings: string[];
  /** `true` quando algum filtro solicitado não pôde ser aplicado na origem. */
  degraded: boolean;
}

/**
 * Contrato único de acesso a dados de anúncios.
 *
 * Trocar `MockAdProvider` por `MetaAdLibraryProvider` não deve exigir
 * nenhuma alteração de frontend: tudo o que a interface consome passa por aqui.
 */
export interface AdProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  searchAds(params: SearchAdsParams): Promise<AdSearchResult>;
  getAd(id: string): Promise<Ad | null>;
  getAdvertiser(id: string): Promise<Advertiser | null>;
  getOffer(id: string): Promise<Offer | null>;

  listAdsByAdvertiser(advertiserId: string, limit?: number): Promise<Ad[]>;
  listAdsByOffer(offerId: string, limit?: number): Promise<Ad[]>;
  listOffersByAdvertiser(advertiserId: string, limit?: number): Promise<Offer[]>;
  listAdvertisers(limit?: number): Promise<Advertiser[]>;

  /** Sugestões de termo para o autocomplete da barra de mineração. */
  suggestTerms(prefix: string, limit?: number): Promise<string[]>;
}

/** Erro esperado quando a integração existe mas não está implementada. */
export class ProviderNotImplementedError extends Error {
  readonly provider: string;
  readonly operation: string;

  constructor(provider: string, operation: string, hint?: string) {
    super(
      `[${provider}] Operação "${operation}" ainda não implementada.${hint ? ` ${hint}` : ""}`,
    );
    this.provider = provider;
    this.operation = operation;
    this.name = "ProviderNotImplementedError";
  }
}

/** Erro de configuração: credencial ausente, versão de API inválida, etc. */
export class ProviderConfigurationError extends Error {
  constructor(provider: string, message: string) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderConfigurationError";
  }
}

export const NO_CAPABILITIES: ProviderCapabilities = {
  keywordSearch: false,
  countryFilter: false,
  statusFilter: false,
  formatFilter: false,
  platformFilter: false,
  creativeAssets: false,
  impressionRanges: false,
  cursorPagination: false,
};
