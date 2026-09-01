"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { CATEGORICAL } from "./palette";

export interface AreaPoint {
  label: string;
  value: number;
}

/**
 * Série temporal única, com crosshair e tooltip.
 *
 * SVG à mão em vez de biblioteca: são ~120 linhas, evita 40 kB de JS no
 * bundle e dá controle total sobre marca e espaçamento.
 */
export function AreaChart({
  data,
  height = 160,
  color = CATEGORICAL[0],
  valueLabel = "anúncios",
  className,
}: {
  data: AreaPoint[];
  height?: number;
  color?: string;
  valueLabel?: string;
  className?: string;
}): React.ReactElement {
  const [hover, setHover] = React.useState<number | null>(null);
  const width = 600;
  const padding = { top: 12, right: 8, bottom: 22, left: 8 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;

  const points = data.map((d, i) => ({
    ...d,
    x: padding.left + i * stepX,
    y: padding.top + plotH - (d.value / max) * plotH,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${points.at(-1)?.x ?? 0},${padding.top + plotH} L${points[0]?.x ?? 0},${padding.top + plotH} Z`;
  const active = hover != null ? points[hover] : null;
  const gradientId = React.useId();

  if (data.length === 0) {
    return (
      <div className={cn("grid h-40 place-items-center text-[13px] text-ink-faint", className)}>
        Sem dados no período.
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`Evolução de ${valueLabel}`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grade recessiva: hairline sólida, uma linha a cada quarto. */}
        {[0, 0.5, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH * ratio}
            y2={padding.top + plotH * ratio}
            stroke="var(--color-line)"
            strokeWidth="1"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {active ? (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={padding.top}
              y2={padding.top + plotH}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4.5"
              fill={color}
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          </>
        ) : null}

        {/* Alvos de hover mais largos que a marca. */}
        {points.map((p, i) => (
          <rect
            key={p.label + i}
            x={p.x - stepX / 2}
            y={0}
            width={stepX}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {points.map((p, i) =>
          i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
            <text
              key={`label-${p.label}-${i}`}
              x={p.x}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              className="fill-ink-faint text-[10px]"
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-line-strong bg-surface-2 px-2 py-1 text-[11px] text-ink shadow-lg"
          style={{
            left: `${(active.x / width) * 100}%`,
            top: `${(active.y / height) * 100}%`,
          }}
        >
          <span className="tnum font-semibold">{formatNumber(active.value)}</span>{" "}
          <span className="text-ink-faint">{valueLabel}</span>
          <span className="block text-ink-faint">{active.label}</span>
        </div>
      ) : null}
    </div>
  );
}
