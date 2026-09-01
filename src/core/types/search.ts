import type {
  AdFormat,
  AdStatus,
  CountryCode,
  ISODate,
  Platform,
} from "./common";

/** Janelas relativas oferecidas nos filtros. */
export type DatePreset = "7d" | "30d" | "90d" | "180d" | "custom" | "any";

/** Piso de tempo ativo, em dias. */
export type ActiveDaysFloor = 0 | 7 | 14 | 30 | 60 | 90 | 180;

export type SortOption =
  | "relevance"
  | "score"
  | "active_days_desc"
  | "newest"
  | "oldest"
  | "creatives_desc";

export const SORT_LABEL: Record<SortOption, string> = {
  relevance: "Mais relevantes",
  score: "Maior score",
  active_days_desc: "Mais tempo ativo",
  newest: "Mais recentes",
  oldest: "Mais antigos",
  creatives_desc: "Mais criativos",
};

/**
 * Parâmetros de busca. É o contrato entre a UI, a camada de API e qualquer
 * `AdProvider`.
 *
 * Divisão de responsabilidade: o provider aplica os filtros que a fonte
 * suporta (termo, país, status, período, formato, plataforma, anunciante);
 * a camada de serviço aplica os filtros derivados (`minActiveDays`,
 * `minScore`) e a ordenação, porque dependem de cálculo próprio.
 */
export interface SearchAdsParams {
  /** Termo livre: palavra-chave da oferta, produto ou nicho. */
  query?: string;
  countries?: CountryCode[];
  status?: AdStatus | "all";
  formats?: AdFormat[];
  platforms?: Platform[];
  /** Nome ou ID da página/anunciante. */
  advertiser?: string;
  datePreset?: DatePreset;
  dateFrom?: ISODate;
  dateTo?: ISODate;
  minActiveDays?: ActiveDaysFloor;
  minScore?: number;
  sort?: SortOption;
  limit?: number;
  cursor?: string | null;
}

export const DEFAULT_SEARCH_PARAMS: SearchAdsParams = {
  query: "",
  countries: ["BR"],
  status: "active",
  formats: [],
  platforms: [],
  datePreset: "90d",
  minActiveDays: 0,
  sort: "score",
  limit: 24,
};

/** Registro persistido de uma busca — base de histórico, cache e cota. */
export interface SearchRecord {
  id: string;
  workspaceId: string;
  userId: string | null;
  params: SearchAdsParams;
  provider: string;
  resultCount: number;
  durationMs: number;
  status: "ok" | "error" | "partial";
  errorMessage: string | null;
  createdAt: string;
}
