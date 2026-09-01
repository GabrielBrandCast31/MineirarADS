import * as React from "react";
import { cn } from "@/lib/utils";
import { CATEGORICAL } from "./palette";

/**
 * Sparkline de 12 pontos para os cards de métrica.
 * Sem eixos, sem rótulos: a leitura é a forma, o número está ao lado.
 */
export function Sparkline({
  data,
  color = CATEGORICAL[0],
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}): React.ReactElement | null {
  if (data.length < 2) return null;

  const width = 100;
  const height = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - ((value - min) / span) * (height - 4) - 2,
  }));

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const last = points.at(-1)!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-24 overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}
