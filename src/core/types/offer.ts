import type { AdFormat, CallToAction, ISODateTime } from "./common";

/**
 * Oferta = conjunto de anúncios do mesmo anunciante girando em torno da
 * mesma promessa comercial. É a unidade de análise mais útil da plataforma:
 * um anunciante testando 14 criativos para "implante dentário" é um sinal
 * muito mais forte do que 14 anúncios avulsos.
 *
 * Hierarquia: Advertiser -> Offer -> Ad -> Creative
 */
export interface Offer {
  id: string;
  workspaceId: string | null;
  advertiserId: string;

  name: string;
  /** Slug normalizado usado no agrupamento automático. */
  signature: string;
  /** `auto` quando veio do clusterizador; `manual` quando o usuário ajustou. */
  origin: "auto" | "manual";

  /** Data do anúncio mais antigo do grupo. */
  firstAdStartedAt: ISODateTime;
  /** Data do último anúncio observado ainda ativo (ou o mais recente). */
  lastAdSeenAt: ISODateTime;

  stats: OfferStats;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OfferStats {
  totalAds: number;
  activeAds: number;
  totalCreatives: number;
  /** Dias entre o primeiro anúncio e o último sinal de atividade. */
  activeDays: number;
  formatBreakdown: Partial<Record<AdFormat, number>>;
  topCallToAction: CallToAction | null;
  /** Score da oferta (0..100), derivado dos anúncios que a compõem. */
  score: number;
}

export interface OfferEnriched extends Offer {
  advertiserName: string;
  advertiserAvatarUrl: string | null;
}
