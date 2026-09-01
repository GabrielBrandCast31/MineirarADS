import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCompact, formatNumber } from "@/lib/format";
import { Sparkline } from "@/components/charts/sparkline";

/**
 * Card de métrica.
 *
 * Contrato: rótulo em caixa de frase · valor (proporcional, não tabular — em
 * corpo grande `tabular-nums` deixa o número frouxo) · variação opcional ·
 * sparkline opcional.
 */
export function StatsCard({
  label,
  value,
  hint,
  delta,
  deltaLabel,
  trend,
  accent = "brand",
  icon,
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  delta?: number | null;
  deltaLabel?: string;
  trend?: number[];
  accent?: "brand" | "heat" | "ok" | "info";
  icon?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const numeric = typeof value === "number";
  const display = numeric ? (value >= 10_000 ? formatCompact(value) : formatNumber(value)) : value;
  const positive = (delta ?? 0) >= 0;

  const card = (
    <div
      className={cn(
        "panel-elevated group relative flex flex-col gap-3 overflow-hidden p-4",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-[0.14] blur-2xl transition-opacity group-hover:opacity-25"
        style={{ backgroundColor: `var(--color-${accent})` }}
        aria-hidden
      />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] font-medium text-ink-faint">{label}</p>
        {icon ? (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 [&_svg]:size-3.5"
            style={{ color: `var(--color-${accent})` }}
          >
            {icon}
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <p className="text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink">
          {display}
        </p>
        {trend && trend.length > 1 ? (
          <Sparkline data={trend} color={`var(--color-${accent})`} />
        ) : null}
      </div>

      {delta != null ? (
        <p className="flex items-center gap-1 text-[12px]">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              positive ? "text-ok" : "text-bad",
            )}
          >
            {positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {Math.abs(delta)}%
          </span>
          {deltaLabel ? <span className="text-ink-faint">{deltaLabel}</span> : null}
        </p>
      ) : null}
    </div>
  );

  // O `hint` explica de onde o número vem — sem ele, métrica agregada vira fé.
  return hint ? <Tooltip content={hint}>{card}</Tooltip> : card;
}
