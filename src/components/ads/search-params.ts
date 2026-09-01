import type { SearchAdsParams } from "@/core/types/search";
import type { AdFormat, AdStatus, CountryCode, Platform } from "@/core/types/common";

/**
 * Conversão entre a URL e `SearchAdsParams`.
 *
 * A URL é a fonte de verdade dos filtros: uma mineração fica linkável,
 * o botão voltar funciona e o Server Component consegue renderizar os
 * resultados sem estado no cliente.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchAdsParams {
  const one = (key: string): string | undefined => {
    const value = raw[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const many = (key: string): string[] =>
    (one(key) ?? "").split(",").map((v) => v.trim()).filter(Boolean);

  const minActiveDays = Number.parseInt(one("active") ?? "0", 10);
  const minScore = Number.parseInt(one("score") ?? "", 10);

  return {
    query: one("q") ?? "",
    countries: (many("country") as CountryCode[]).length
      ? (many("country") as CountryCode[])
      : ["BR"],
    status: (one("status") as AdStatus | "all" | undefined) ?? "active",
    formats: many("format") as AdFormat[],
    platforms: many("platform") as Platform[],
    advertiser: one("advertiser") ?? "",
    datePreset: (one("date") as SearchAdsParams["datePreset"]) ?? "90d",
    dateFrom: one("from"),
    dateTo: one("to"),
    minActiveDays: (Number.isNaN(minActiveDays)
      ? 0
      : minActiveDays) as SearchAdsParams["minActiveDays"],
    minScore: Number.isNaN(minScore) ? undefined : minScore,
    sort: (one("sort") as SearchAdsParams["sort"]) ?? "score",
    limit: Number.parseInt(one("limit") ?? "24", 10) || 24,
    cursor: one("cursor") ?? null,
  };
}

export function toQueryString(params: SearchAdsParams): string {
  const search = new URLSearchParams();
  const set = (key: string, value: string | undefined | null): void => {
    if (value && value.length > 0) search.set(key, value);
  };

  set("q", params.query);
  if (params.countries?.length && params.countries.join(",") !== "BR") {
    set("country", params.countries.join(","));
  }
  if (params.status && params.status !== "active") set("status", params.status);
  if (params.formats?.length) set("format", params.formats.join(","));
  if (params.platforms?.length) set("platform", params.platforms.join(","));
  set("advertiser", params.advertiser);
  if (params.datePreset && params.datePreset !== "90d") set("date", params.datePreset);
  set("from", params.dateFrom);
  set("to", params.dateTo);
  if (params.minActiveDays) set("active", String(params.minActiveDays));
  if (params.minScore) set("score", String(params.minScore));
  if (params.sort && params.sort !== "score") set("sort", params.sort);

  return search.toString();
}

/** Quantidade de filtros ativos além do padrão — mostrado no botão do mobile. */
export function countActiveFilters(params: SearchAdsParams): number {
  let count = 0;
  if (params.status && params.status !== "active") count += 1;
  if (params.formats?.length) count += 1;
  if (params.platforms?.length) count += 1;
  if (params.advertiser) count += 1;
  if (params.datePreset && params.datePreset !== "90d") count += 1;
  if (params.minActiveDays) count += 1;
  if (params.minScore) count += 1;
  if (params.countries && params.countries.join(",") !== "BR") count += 1;
  return count;
}
