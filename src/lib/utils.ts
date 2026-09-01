import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concatena classes resolvendo conflitos do Tailwind. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Limita um número a um intervalo. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Divide uma lista em blocos de tamanho fixo. */
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Remove chaves com valor `undefined` — útil antes de serializar query strings. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}
