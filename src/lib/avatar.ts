import { hashString } from "@/mock/rng";

const GRADIENTS: Array<[string, string]> = [
  ["#6366f1", "#a855f7"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#8b5cf6", "#ec4899"],
  ["#f97316", "#eab308"],
  ["#06b6d4", "#3b82f6"],
  ["#14b8a6", "#84cc16"],
  ["#e11d48", "#f43f5e"],
];

/** Iniciais de até duas palavras significativas. */
export function initialsOf(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(de|da|do|e|&|the)$/i.test(w));
  const first = words[0]?.[0] ?? name[0] ?? "?";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

/**
 * Avatar determinístico como data URI SVG.
 *
 * Evita dependência de rede: o mesmo nome sempre gera o mesmo avatar, e a
 * interface nunca fica com buraco de imagem quebrada quando a CDN da fonte
 * expira o link original.
 */
export function avatarDataUrl(name: string): string {
  const hash = hashString(name);
  const [from, to] = GRADIENTS[hash % GRADIENTS.length]!;
  const initials = initialsOf(name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="96" height="96" rx="24" fill="url(#g)"/><text x="48" y="60" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="36" font-weight="600" fill="rgba(255,255,255,0.94)" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
