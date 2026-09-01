/**
 * Tipos base compartilhados por todo o domínio.
 * Este módulo é puro: não importa Next, Supabase nem nada de infraestrutura.
 */

/** Data/hora em ISO-8601 (UTC). */
export type ISODateTime = string;
/** Data em ISO-8601 (YYYY-MM-DD). */
export type ISODate = string;

/** Código ISO 3166-1 alpha-2 aceito pela Meta Ad Library. */
export type CountryCode =
  | "BR" | "US" | "PT" | "ES" | "MX" | "AR" | "CO" | "CL"
  | "GB" | "CA" | "FR" | "DE" | "IT" | "AU" | "ALL";

/** Superfícies de veiculação reportadas publicamente pela Meta. */
export type Platform = "facebook" | "instagram" | "messenger" | "audience_network" | "threads";

/** Formato do criativo. */
export type AdFormat = "image" | "video" | "carousel" | "dco" | "unknown";

/** Estado de veiculação do anúncio. */
export type AdStatus = "active" | "inactive" | "unknown";

/**
 * Call to action. Os `value` seguem os enums públicos da Meta;
 * não traduza os valores — apenas os rótulos de interface.
 */
export type CallToAction =
  | "LEARN_MORE" | "SHOP_NOW" | "SIGN_UP" | "SUBSCRIBE" | "CONTACT_US"
  | "GET_OFFER" | "BOOK_TRAVEL" | "DOWNLOAD" | "WHATSAPP_MESSAGE"
  | "MESSAGE_PAGE" | "APPLY_NOW" | "SEE_MENU" | "GET_QUOTE" | "NONE";

/** Envelope de paginação usado por providers e repositórios. */
export interface Paginated<T> {
  items: T[];
  total: number;
  /** Cursor opaco da próxima página; `null` quando não há mais resultados. */
  nextCursor: string | null;
}

export interface PageParams {
  limit?: number;
  cursor?: string | null;
}

/** Intervalo fechado de datas. */
export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/** Resultado explícito de operações que podem falhar sem exceção. */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
