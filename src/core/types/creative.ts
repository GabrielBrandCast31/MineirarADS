import type { AdFormat, ISODateTime } from "./common";

/**
 * Criativo = o ativo visual de um anúncio. Um anúncio pode ter vários
 * (carrossel, ou variações de mídia sob o mesmo `ad_archive_id`).
 */
export interface Creative {
  id: string;
  adId: string;
  format: AdFormat;
  /** URL original na CDN da Meta. Pode expirar. */
  sourceUrl: string | null;
  /** Cópia própria em Supabase Storage, quando o armazenamento é permitido. */
  storagePath: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  /** Duração em segundos — apenas vídeo. */
  durationSeconds: number | null;
  /** Ordem dentro do carrossel. */
  position: number;
  /** Texto sobreposto ao card (title/link description do criativo). */
  title: string | null;
  linkDescription: string | null;
  linkUrl: string | null;
  createdAt: ISODateTime;
}

export function aspectRatioOf(c: Pick<Creative, "width" | "height">): string | null {
  if (!c.width || !c.height) return null;
  const ratio = c.width / c.height;
  const known: Array<[string, number]> = [
    ["1:1", 1],
    ["4:5", 0.8],
    ["9:16", 0.5625],
    ["16:9", 1.7778],
    ["1.91:1", 1.91],
    ["2:3", 0.6667],
    ["3:2", 1.5],
  ];
  let best = known[0]!;
  for (const entry of known) {
    if (Math.abs(entry[1] - ratio) < Math.abs(best[1] - ratio)) best = entry;
  }
  return Math.abs(best[1] - ratio) / ratio < 0.08 ? best[0] : ratio.toFixed(2) + ":1";
}
