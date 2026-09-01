/**
 * Normalização de texto em português. Base para agrupamento de ofertas,
 * extração de palavras-chave e heurísticas de copy.
 */

/** Remove acentos preservando os caracteres. */
export function deaccent(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalize(input: string): string {
  return deaccent(input.toLowerCase())
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const STOPWORDS_PT = new Set<string>([
  "a","ao","aos","aquela","aquelas","aquele","aqueles","aquilo","as","ate","com","como",
  "da","das","de","dela","delas","dele","deles","depois","do","dos","e","ela","elas","ele",
  "eles","em","entre","era","eram","essa","essas","esse","esses","esta","estas","este",
  "estes","eu","foi","fomos","for","fora","isso","isto","ja","la","lhe","lhes","mais","mas",
  "me","mesmo","meu","meus","minha","minhas","muito","na","nao","nas","nem","no","nos",
  "nossa","nossas","nosso","nossos","num","numa","o","os","ou","para","pela","pelas","pelo",
  "pelos","por","qual","quando","que","quem","se","sem","ser","seu","seus","so","sobre",
  "sua","suas","tambem","te","tem","tenho","teu","teus","tu","tua","tuas","um","uma","voce",
  "voces","vos","ha","pra","pro","ate","onde","aqui","ali","isso","tudo","todo","toda",
  "mesmo","ainda","agora","hoje","sao","esta","estao","vai","vao","tao","dia","dias",
]);

export const STOPWORDS_EN = new Set<string>([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","he","in","is",
  "it","its","of","on","or","that","the","their","them","there","these","they","this","to",
  "was","were","will","with","you","your","we","our","us","not","can","get","how","what",
  "when","why","who","all","more","now","new","just","out","up","do","does","if","about",
]);

const STOPWORDS = new Set<string>([...STOPWORDS_PT, ...STOPWORDS_EN]);

export function isStopword(token: string): boolean {
  return STOPWORDS.has(token);
}

/** Tokens significativos: sem stopwords, com pelo menos 3 caracteres. */
export function tokenize(input: string, { keepStopwords = false } = {}): string[] {
  const tokens = normalize(input).split(" ").filter(Boolean);
  return keepStopwords ? tokens : tokens.filter((t) => t.length >= 3 && !isStopword(t));
}

/** Divide em sentenças respeitando abreviações comuns e emojis. */
export function sentences(input: string): string[] {
  return input
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

/** Linhas não vazias — copy de anúncio costuma usar quebra como estrutura. */
export function lines(input: string): string[] {
  return input
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
}

const EMOJI_RE = /\p{Extended_Pictographic}/gu;

export function countEmojis(input: string): number {
  return input.match(EMOJI_RE)?.length ?? 0;
}

export function stripEmojis(input: string): string {
  return input.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

/** Slug estável para URLs e assinaturas de oferta. */
export function slugify(input: string): string {
  return normalize(input).replace(/\s+/g, "-").slice(0, 80) || "sem-nome";
}

/** Similaridade de Jaccard entre conjuntos de tokens (0..1). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

/** Similaridade de trigramas de caracteres — robusta a variações morfológicas. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string): Set<string> => {
    const padded = `  ${normalize(s)} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i += 1) set.add(padded.slice(i, i + 3));
    return set;
  };
  return jaccard(grams(a), grams(b));
}
