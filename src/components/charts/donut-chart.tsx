"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/format";
import { OTHER_COLOR, seriesColor } from "./palette";

export interface DonutSlice {
  label: string;
  value: number;
}

/** Vão entre arcos, em px de arco — feito de superfície, não de contorno. */
const GAP = 2;

/**
 * Rosca para composição em poucas categorias.
 *
 * Regras aplicadas: matizes em ordem fixa (sem rodízio); a partir da sétima
 * categoria tudo vira "Outros"; legenda sempre presente com rótulo e valor —
 * a identidade nunca depende só da cor. Os arcos são separados por 2px de
 * superfície, não por contorno.
 */
export function DonutChart({
  data,
  size = 132,
  centerLabel,
  centerValue,
  className,
}: {
  data: DonutSlice[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}): React.ReactElement {
  const [hover, setHover] = React.useState<number | null>(null);

  const slices = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);
    if (sorted.length <= 6) return sorted;
    const head = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((sum, s) => sum + s.value, 0);
    return [...head, { label: "Outros", value: rest }];
  }, [data]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;

  /**
   * Geometria de todos os arcos de uma vez.
   *
   * O deslocamento é cumulativo: acumulá-lo dentro do `map` do JSX seria
   * mutação durante o render, o que quebra sob StrictMode e React Compiler.
   */
  const arcs = React.useMemo(() => {
    const computed: { label: string; dash: string; offset: number }[] = [];
    let offset = 0;
    for (const slice of slices) {
      const fraction = total === 0 ? 0 : slice.value / total;
      const length = Math.max(0, fraction * circumference - GAP);
      computed.push({
        label: slice.label,
        dash: `${length} ${circumference - length}`,
        offset,
      });
      offset += fraction * circumference;
    }
    return computed;
  }, [slices, total, circumference]);

  if (total === 0) {
    return (
      <div className={cn("grid h-32 place-items-center text-[13px] text-ink-faint", className)}>
        Sem dados.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:items-center", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" role="img">
          {arcs.map((arc, index) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.label === "Outros" ? OTHER_COLOR : seriesColor(index)}
              strokeWidth="14"
              strokeDasharray={arc.dash}
              strokeDashoffset={-arc.offset}
              opacity={hover === null || hover === index ? 1 : 0.35}
              className="transition-opacity duration-200"
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-lg font-semibold leading-none text-ink">{centerValue}</div>
              {centerLabel ? (
                <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                  {centerLabel}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((slice, index) => (
          <li
            key={slice.label}
            className="flex items-center gap-2 text-[12.5px]"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: slice.label === "Outros" ? OTHER_COLOR : seriesColor(index),
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-ink-muted">{slice.label}</span>
            <span className="tnum shrink-0 text-ink">{formatNumber(slice.value)}</span>
            <span className="tnum w-10 shrink-0 text-right text-ink-faint">
              {formatPercent(slice.value / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
