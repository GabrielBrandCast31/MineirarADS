import type {
  AdFormat,
  AdStatus,
  CallToAction,
  CountryCode,
  ISODateTime,
  Platform,
} from "./common";
import type { Creative } from "./creative";
import type { AdScore } from "./score";

/**
 * Anúncio observado na Meta Ad Library.
 *
 * Todos os campos abaixo são **dados observados** ou identificadores internos.
 * Nada aqui é interpretação — inferências vivem em `CopyAnalysis`,
 * `CreativeAnalysis` e `AdScore`.
 */
export interface Ad {
  id: string;
  workspaceId: string | null;

  /** `ad_archive_id` da Meta. Chave natural de deduplicação. */
  metaAdArchiveId: string;
  /** URL pública na Ad Library. */
  adLibraryUrl: string;

  advertiserId: string;
  offerId: string | null;

  status: AdStatus;
  format: AdFormat;
  platforms: Platform[];
  countries: CountryCode[];

  /** Copy principal (`ad_creative_bodies[0]`). */
  bodyText: string | null;
  /** Título do link (`ad_creative_link_titles[0]`). */
  headline: string | null;
  /** Descrição do link (`ad_creative_link_descriptions[0]`). */
  linkDescription: string | null;
  callToAction: CallToAction | null;
  destinationUrl: string | null;

  /** Todas as variações de copy retornadas para o mesmo arquivo. */
  bodyVariations: string[];

  startedAt: ISODateTime;
  /** `null` enquanto o anúncio segue ativo. */
  endedAt: ISODateTime | null;

  /** Faixa de impressões, quando divulgada (anúncios de tema social/político). */
  impressionsLowerBound: number | null;
  impressionsUpperBound: number | null;
  /** Idem para gasto — público apenas em categorias especiais. */
  spendLowerBound: number | null;
  spendUpperBound: number | null;
  currency: string | null;

  creatives: Creative[];

  firstSeenAt: ISODateTime;
  lastSeenAt: ISODateTime;
  createdAt: ISODateTime;
}

/** Anúncio enriquecido com dados calculados/relacionados para a interface. */
export interface AdEnriched extends Ad {
  advertiserName: string;
  advertiserAvatarUrl: string | null;
  offerName: string | null;
  /** Dias entre `startedAt` e (`endedAt` ?? agora). Cálculo determinístico. */
  activeDays: number;
  /** Quantos anúncios do mesmo agrupamento de oferta existem. */
  relatedAdsCount: number;
  score: AdScore;
  /** Preenchido por consultas com contexto de workspace. */
  saved?: boolean;
  monitored?: boolean;
}

/** Fotografia do anúncio em um instante — base do monitoramento. */
export interface AdSnapshot {
  id: string;
  adId: string;
  capturedAt: ISODateTime;
  status: AdStatus;
  bodyText: string | null;
  headline: string | null;
  callToAction: CallToAction | null;
  creativeCount: number;
  platforms: Platform[];
  /** Hash do conteúdo — permite detectar alteração sem diff completo. */
  contentHash: string;
}

/** Calcula dias ativos. `now` explícito para manter a função pura e testável. */
export function activeDaysOf(
  ad: Pick<Ad, "startedAt" | "endedAt">,
  now: Date = new Date(),
): number {
  const start = new Date(ad.startedAt).getTime();
  const end = ad.endedAt ? new Date(ad.endedAt).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - start) / 86_400_000));
}
