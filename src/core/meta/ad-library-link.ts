import { COUNTRY_LABEL } from "@/core/constants/meta";
import type { CountryCode } from "@/core/types/common";

/**
 * Leitura de um link colado da Biblioteca de Anúncios da Meta.
 *
 * O usuário cola a URL que o navegador dele mostra — e ela vem em várias
 * formas, porque a Biblioteca usa a query string para tudo. Este módulo é a
 * única tradução de "link colado" para "identificador de página/anúncio";
 * qualquer outra camada trabalha só com o resultado tipado.
 *
 * Nada aqui abre a página nem raspa conteúdo: apenas interpreta os parâmetros
 * públicos da própria URL.
 */

export type AdLibraryLink =
  | { kind: "page"; pageId: string; country: CountryCode | null }
  | { kind: "ad"; adArchiveId: string; country: CountryCode | null };

/** Por que um link não pôde ser aceito. A interface exibe `message`. */
export type AdLibraryLinkProblem =
  | "empty"
  | "not_facebook"
  | "not_ad_library"
  | "keyword_search"
  | "missing_page_id";

export type AdLibraryLinkParse =
  | { ok: true; link: AdLibraryLink }
  | { ok: false; problem: AdLibraryLinkProblem; message: string };

/** Hosts da Meta que servem a Biblioteca de Anúncios. */
const FACEBOOK_HOSTS = /(^|\.)(facebook\.com|fb\.com)$/i;

/** IDs da Meta são numéricos e longos; 5 dígitos é um piso conservador. */
const META_ID = /^\d{5,}$/;

const PAGE_ID_KEYS = /^(view_all_page_id|search_page_ids(\[\d+\])?)$/i;
const KEYWORD_KEYS = /^(q|search_terms)$/i;

export function parseAdLibraryLink(raw: string): AdLibraryLinkParse {
  const input = raw.trim();
  if (input.length === 0) {
    return { ok: false, problem: "empty", message: "Cole o link da Biblioteca de Anúncios." };
  }

  // Atalho para quem cola só o ID da página (é o que aparece na própria URL).
  if (META_ID.test(input)) {
    return { ok: true, link: { kind: "page", pageId: input, country: null } };
  }

  const url = toUrl(input);
  if (!url) {
    return {
      ok: false,
      problem: "not_facebook",
      message:
        "Não reconheci esse endereço. Cole a URL completa da Biblioteca de Anúncios (facebook.com/ads/library/…).",
    };
  }

  if (!FACEBOOK_HOSTS.test(url.hostname)) {
    return {
      ok: false,
      problem: "not_facebook",
      message: `${url.hostname} não é um endereço da Meta. Este monitoramento acompanha páginas da Biblioteca de Anúncios do Facebook.`,
    };
  }

  if (!isAdLibraryPath(url.pathname)) {
    return {
      ok: false,
      problem: "not_ad_library",
      message:
        "Esse é o link do perfil no Facebook, não da Biblioteca de Anúncios. Abra a página, clique em “Transparência da página → Ver tudo na Biblioteca de Anúncios” e copie a URL de lá.",
    };
  }

  const country = readCountry(url);
  const pageId = readPageId(url);
  if (pageId) return { ok: true, link: { kind: "page", pageId, country } };

  const adArchiveId = url.searchParams.get("id")?.trim();
  if (adArchiveId && META_ID.test(adArchiveId)) {
    return { ok: true, link: { kind: "ad", adArchiveId, country } };
  }

  if ([...url.searchParams.keys()].some((key) => KEYWORD_KEYS.test(key))) {
    return {
      ok: false,
      problem: "keyword_search",
      message:
        "Esse link é uma busca por palavra-chave, não uma página. Para acompanhar um termo, use a mineração; para acompanhar um anunciante, cole o link com “view_all_page_id”.",
    };
  }

  return {
    ok: false,
    problem: "missing_page_id",
    message:
      "O link não traz o identificador da página (“view_all_page_id”). Na Biblioteca, filtre por um anunciante e copie a URL resultante.",
  };
}

/**
 * Link colado que não dá para acompanhar.
 *
 * Erro tipado (e não `Error` cru) porque a mensagem é escrita para o usuário:
 * a camada de ação a devolve como está, em vez de virar "erro interno".
 */
export class InvalidAdLibraryLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAdLibraryLinkError";
  }
}

/* ------------------------------------------------------------- helpers ---- */

function toUrl(input: string): URL | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function isAdLibraryPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, "").toLowerCase();
  return clean === "/ads/library" || clean.startsWith("/ads/library/");
}

/**
 * O ID da página aparece como `view_all_page_id=123` ou como
 * `search_page_ids=["123"]` — a Biblioteca usa as duas formas, e a segunda
 * chega ora como JSON, ora repetida em `search_page_ids[0]`.
 */
function readPageId(url: URL): string | null {
  for (const [key, value] of url.searchParams) {
    if (!PAGE_ID_KEYS.test(key)) continue;
    const digits = value.match(/\d{5,}/)?.[0];
    if (digits) return digits;
  }
  return null;
}

function readCountry(url: URL): CountryCode | null {
  const raw = url.searchParams.get("country")?.trim().toUpperCase();
  if (!raw || raw === "ALL") return null;
  return raw in COUNTRY_LABEL ? (raw as CountryCode) : null;
}
