/**
 * PRNG determinístico (mulberry32).
 *
 * O dataset mockado precisa ser estável: a mesma semente gera exatamente o
 * mesmo conjunto de anúncios em qualquer processo. Sem isso, cada render do
 * servidor produziria dados diferentes e a navegação quebraria.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly next: () => number;

  constructor(seed: number | string) {
    this.next = mulberry32(typeof seed === "string" ? hashString(seed) : seed);
  }

  float(): number {
    return this.next();
  }

  /** Inteiro em [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick: lista vazia");
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** `count` itens distintos (ou todos, se count >= tamanho). */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = [...items];
    const out: T[] = [];
    const take = Math.min(count, pool.length);
    for (let i = 0; i < take; i += 1) {
      const index = Math.floor(this.next() * pool.length);
      out.push(pool.splice(index, 1)[0]!);
    }
    return out;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
