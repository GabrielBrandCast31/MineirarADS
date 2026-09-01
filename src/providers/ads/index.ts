import { serverEnv } from "@/lib/env";
import type { AdProvider } from "./AdProvider";
import { MetaAdLibraryProvider } from "./MetaAdLibraryProvider";
import { MockAdProvider } from "./MockAdProvider";

export * from "./AdProvider";
export { MockAdProvider } from "./MockAdProvider";
export { MetaAdLibraryProvider } from "./MetaAdLibraryProvider";

let cached: AdProvider | null = null;

/**
 * Fábrica do provider de anúncios.
 *
 * Trocar de fonte é uma variável de ambiente: `ADS_PROVIDER=mock|meta`.
 * Nenhum componente de interface conhece a implementação concreta.
 */
export function getAdProvider(): AdProvider {
  if (cached) return cached;
  const env = serverEnv();

  if (env.ADS_PROVIDER === "meta") {
    cached = new MetaAdLibraryProvider({
      accessToken: env.META_AD_LIBRARY_ACCESS_TOKEN,
      apiVersion: env.META_GRAPH_API_VERSION,
    });
  } else {
    cached = new MockAdProvider();
  }
  return cached;
}

/** Usado em testes para injetar um provider próprio. */
export function setAdProvider(provider: AdProvider | null): void {
  cached = provider;
}
