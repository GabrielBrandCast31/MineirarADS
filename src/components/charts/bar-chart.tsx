"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { CATEGORICAL } from "./palette";

export interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

/**
 * Colunas verticais, série única.
 * Espessura máxima 24px, topo arredondado em 4px, base reta, 2px de respiro
 * entre vizinhas — o vão é feito de superfície, não de traço.
 */
export function BarChart({
  data,
  height = 150,
  valueLabel = "anúncios",
  className,
}: {
  data: BarDatum[];
  height?: number;
  valueLabel?: string;
  className?: string;
}): React.ReactElement {
  const [hover, setHover] = React.useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return (
      <div className={cn("grid h-32 place-items-center text-[13px] text-ink-faint", className)}>
        Sem dados.
      </div>
    );
  }

  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }}>
      {data.map((datum, index) => {
        const ratio = datum.value / max;
        const isHovered = hover === index;
        return (
          <div
            key={datum.label}
            className="group relative flex h-full min-w-0 flex-1 flex-col justify-end gap-2"
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="relative flex justify-center" style={{ height: "100%" }}>
              <div
                className="w-full max-w-[24px] self-end rounded-t-[4px] transition-[height,opacity] duration-300"
                style={{
                  height: `${Math.max(2, ratio * 100)}%`,
                  backgroundColor: datum.color ?? CATEGORICAL[0],
                  opacity: hover === null || isHovered ? 1 : 0.45,
                }}
              />
              {isHovered ? (
                <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[11px] text-ink shadow-lg">
                  <span className="tnum font-semibold">{formatNumber(datum.value)}</span>{" "}
                  <span className="text-ink-faint">{valueLabel}</span>
                </div>
              ) : null}
            </div>
            <span className="truncate text-center text-[10px] text-ink-faint">{datum.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Barras horizontais com rótulo direto — usado em rankings de padrões. */
export function RankBars({
  data,
  valueSuffix,
  className,
}: {
  data: BarDatum[];
  valueSuffix?: string;
  className?: string;
}): React.ReactElement {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((datum, index) => (
        <li key={datum.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate text-ink-muted">{datum.label}</span>
            <span className="tnum shrink-0 font-medium text-ink">
              {formatNumber(datum.value)}
              {valueSuffix}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${(datum.value / max) * 100}%`,
                backgroundColor: datum.color ?? CATEGORICAL[index % CATEGORICAL.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
