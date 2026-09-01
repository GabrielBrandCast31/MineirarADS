/**
 * Formatação pt-BR. Centralizada para que datas e números tenham exatamente a
 * mesma aparência em toda a interface.
 */

const numberFormatter = new Intl.NumberFormat("pt-BR");
const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 0,
});

export const formatNumber = (value: number): string => numberFormatter.format(value);
export const formatCompact = (value: number): string => compactFormatter.format(value);
export const formatCurrency = (value: number): string => currencyFormatter.format(value);
export const formatPercent = (ratio: number): string => percentFormatter.format(ratio);

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateShort(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const relativeFormatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 3 dias", "há 2 horas". */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - now.getTime();
  const absolute = Math.abs(diff);

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (absolute >= ms) return relativeFormatter.format(Math.round(diff / ms), unit);
  }
  return "agora";
}

/** "73 dias", "1 dia". */
export function formatDays(days: number): string {
  return `${formatNumber(days)} ${days === 1 ? "dia" : "dias"}`;
}

/** Segundos -> "1:24". */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

/** Segundos -> "00:05" (timeline de transcrição). */
export function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
