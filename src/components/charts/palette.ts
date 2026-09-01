/**
 * Paleta categórica dos gráficos.
 *
 * Validada para modo escuro sobre a superfície `--color-surface` (#13161d):
 *  - faixa de luminosidade OKLCH 0,48–0,67 em todos os slots;
 *  - piso de croma 0,10;
 *  - separação sob daltonismo (pior par adjacente ΔE 15,2 em deuteranopia);
 *  - piso de visão normal ΔE 29,2.
 *
 * As matizes são atribuídas em ORDEM FIXA — nunca cicladas. A partir do sétimo
 * item a série vira "Outros" em vez de ganhar uma cor gerada.
 *
 * Os slots 3 (magenta) e 5 (vermelho) ficam abaixo de 3:1 de contraste com a
 * superfície: por isso todo gráfico que os usa é obrigado a trazer rótulo
 * visível (legenda com valor), nunca identidade só por cor.
 *
 * Estas cores são de SÉRIE. As cores de estado (ok/warn/bad) do design system
 * são reservadas para estado e não entram em rodízio como "série 4".
 */
export const CATEGORICAL = [
  "#6d74f5", // 1 — índigo (marca)
  "#c98000", // 2 — âmbar
  "#973291", // 3 — magenta
  "#00a3cb", // 4 — ciano
  "#ba0329", // 5 — vermelho
  "#15ad6e", // 6 — esmeralda
] as const;

export const OTHER_COLOR = "#4a4f5c";

export function seriesColor(index: number): string {
  return CATEGORICAL[index] ?? OTHER_COLOR;
}

/** Matiz única para magnitude (sequencial). Claro -> escuro. */
export const SEQUENTIAL = [
  "#2a2f52",
  "#3b4382",
  "#4f58b4",
  "#6d74f5",
  "#9aa0ff",
] as const;

/** Cor do Ad Score por faixa. Não é categórica: é ordinal de intensidade. */
export function scoreColor(value: number): string {
  if (value >= 85) return "#f6aa2a";
  if (value >= 65) return "#e0a63d";
  if (value >= 40) return "#8f96b0";
  return "#5c6274";
}

export const CHART_INK = {
  axis: "var(--color-ink-faint)",
  grid: "var(--color-line)",
  label: "var(--color-ink-muted)",
  surface: "var(--color-surface)",
} as const;
