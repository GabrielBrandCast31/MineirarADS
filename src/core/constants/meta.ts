import type {
  AdFormat,
  AdStatus,
  CallToAction,
  CountryCode,
  Platform,
} from "@/core/types/common";
import type { ActiveDaysFloor, DatePreset } from "@/core/types/search";

/**
 * Enums públicos da Meta com rótulos em pt-BR.
 * Os `value` são os aceitos pela Graph API — não traduzir.
 */

export interface Option<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

export const COUNTRIES: Array<Option<CountryCode> & { flag: string }> = [
  { value: "BR", label: "Brasil", flag: "🇧🇷" },
  { value: "US", label: "Estados Unidos", flag: "🇺🇸" },
  { value: "PT", label: "Portugal", flag: "🇵🇹" },
  { value: "ES", label: "Espanha", flag: "🇪🇸" },
  { value: "MX", label: "México", flag: "🇲🇽" },
  { value: "AR", label: "Argentina", flag: "🇦🇷" },
  { value: "CO", label: "Colômbia", flag: "🇨🇴" },
  { value: "CL", label: "Chile", flag: "🇨🇱" },
  { value: "GB", label: "Reino Unido", flag: "🇬🇧" },
  { value: "CA", label: "Canadá", flag: "🇨🇦" },
  { value: "FR", label: "França", flag: "🇫🇷" },
  { value: "DE", label: "Alemanha", flag: "🇩🇪" },
  { value: "IT", label: "Itália", flag: "🇮🇹" },
  { value: "AU", label: "Austrália", flag: "🇦🇺" },
];

export const COUNTRY_LABEL: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.value, c.label]),
);

export const PLATFORMS: Array<Option<Platform>> = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "messenger", label: "Messenger" },
  { value: "audience_network", label: "Audience Network" },
  { value: "threads", label: "Threads" },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
  threads: "Threads",
};

export const AD_FORMATS: Array<Option<AdFormat>> = [
  { value: "image", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "carousel", label: "Carrossel" },
  { value: "dco", label: "Criativo dinâmico" },
];

export const FORMAT_LABEL: Record<AdFormat, string> = {
  image: "Imagem",
  video: "Vídeo",
  carousel: "Carrossel",
  dco: "Criativo dinâmico",
  unknown: "Não identificado",
};

export const AD_STATUSES: Array<Option<AdStatus | "all">> = [
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "all", label: "Todos" },
];

export const STATUS_LABEL: Record<AdStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  unknown: "Indefinido",
};

export const CALL_TO_ACTIONS: Array<Option<CallToAction>> = [
  { value: "LEARN_MORE", label: "Saiba mais" },
  { value: "SHOP_NOW", label: "Comprar agora" },
  { value: "SIGN_UP", label: "Cadastre-se" },
  { value: "SUBSCRIBE", label: "Inscreva-se" },
  { value: "CONTACT_US", label: "Fale conosco" },
  { value: "GET_OFFER", label: "Ver oferta" },
  { value: "BOOK_TRAVEL", label: "Reservar" },
  { value: "DOWNLOAD", label: "Baixar" },
  { value: "WHATSAPP_MESSAGE", label: "Enviar mensagem (WhatsApp)" },
  { value: "MESSAGE_PAGE", label: "Enviar mensagem" },
  { value: "APPLY_NOW", label: "Inscreva-se agora" },
  { value: "SEE_MENU", label: "Ver menu" },
  { value: "GET_QUOTE", label: "Solicitar orçamento" },
  { value: "NONE", label: "Sem botão" },
];

export const CTA_LABEL: Record<CallToAction, string> = Object.fromEntries(
  CALL_TO_ACTIONS.map((c) => [c.value, c.label]),
) as Record<CallToAction, string>;

export const DATE_PRESETS: Array<Option<DatePreset>> = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "180d", label: "Últimos 180 dias" },
  { value: "any", label: "Qualquer período" },
  { value: "custom", label: "Personalizado" },
];

export const ACTIVE_DAYS_FLOORS: Array<Option<ActiveDaysFloor>> = [
  { value: 0, label: "Qualquer" },
  { value: 7, label: "+7 dias" },
  { value: 14, label: "+14 dias" },
  { value: 30, label: "+30 dias" },
  { value: 60, label: "+60 dias" },
  { value: 90, label: "+90 dias" },
  { value: 180, label: "+180 dias" },
];

/** Categorias de anunciante — usado em filtros e no mock. */
export const ADVERTISER_CATEGORIES = [
  "Odontologia",
  "Estética e beleza",
  "Saúde e bem-estar",
  "Educação",
  "Infoprodutos",
  "Software / SaaS",
  "Energia solar",
  "Imobiliário",
  "Advocacia",
  "E-commerce",
  "Finanças",
  "Pet",
  "Automotivo",
  "Serviços locais",
] as const;

/** Constrói a URL pública do anúncio na Ad Library. */
export function adLibraryUrlFor(adArchiveId: string, country: CountryCode = "BR"): string {
  const params = new URLSearchParams({
    active_status: "all",
    ad_type: "all",
    country,
    id: adArchiveId,
    view_all_page_id: "",
  });
  params.delete("view_all_page_id");
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/** URL pública de todos os anúncios de uma página. */
export function adLibraryPageUrlFor(pageId: string, country: CountryCode = "BR"): string {
  const params = new URLSearchParams({
    active_status: "all",
    ad_type: "all",
    country,
    view_all_page_id: pageId,
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}
