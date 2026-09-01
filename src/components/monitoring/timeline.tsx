import * as React from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { MonitoringSnapshot } from "@/core/types/monitoring";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";

/**
 * Linha do tempo de snapshots.
 *
 * Cada ponto é uma coleta real. O delta ao lado é a diferença para o snapshot
 * anterior — é dele que nascem os eventos de monitoramento.
 */
export function Timeline({
  snapshots,
  className,
}: {
  snapshots: MonitoringSnapshot[];
  className?: string;
}): React.ReactElement {
  if (snapshots.length === 0) {
    return (
      <p className={cn("py-6 text-center text-[13px] text-ink-faint", className)}>
        Nenhum snapshot capturado ainda.
      </p>
    );
  }

  const max = Math.max(...snapshots.map((snapshot) => snapshot.adCount), 1);

  return (
    <ol className={cn("relative space-y-0", className)}>
      <span className="absolute bottom-3 left-[7px] top-3 w-px bg-line" aria-hidden />

      {snapshots.map((snapshot, index) => {
        const previous = snapshots[index - 1];
        const delta = previous ? snapshot.adCount - previous.adCount : 0;
        const creativeDelta = previous ? snapshot.creativeCount - previous.creativeCount : 0;

        return (
          <li key={snapshot.id} className="relative flex gap-4 py-3 pl-6">
            <span
              className={cn(
                "absolute left-0 top-[18px] size-[15px] rounded-full border-2 border-canvas",
                delta > 0 ? "bg-ok" : delta < 0 ? "bg-bad" : "bg-line-strong",
              )}
              aria-hidden
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">
                  {formatDate(snapshot.capturedAt)}
                  <span className="ml-2 text-[11.5px] font-normal text-ink-faint">
                    {formatRelative(snapshot.capturedAt)}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-[12.5px] text-ink-muted">
                  <span className="tnum">
                    <strong className="font-semibold text-ink">
                      {formatNumber(snapshot.adCount)}
                    </strong>{" "}
                    anúncios
                  </span>
                  <span className="tnum text-ink-faint">
                    {formatNumber(snapshot.creativeCount)} criativos
                  </span>
                  {index > 0 ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                        delta > 0
                          ? "bg-ok/12 text-ok"
                          : delta < 0
                            ? "bg-bad/12 text-bad"
                            : "bg-surface-3 text-ink-faint",
                      )}
                    >
                      {delta > 0 ? (
                        <TrendingUp className="size-3" />
                      ) : delta < 0 ? (
                        <TrendingDown className="size-3" />
                      ) : (
                        <Minus className="size-3" />
                      )}
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : null}
                </p>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-brand/70"
                  style={{ width: `${(snapshot.adCount / max) * 100}%` }}
                />
              </div>

              {index > 0 && creativeDelta !== 0 ? (
                <p className="mt-1.5 text-[11.5px] text-ink-faint">
                  {creativeDelta > 0
                    ? `${creativeDelta} criativo(s) novo(s) desde a coleta anterior.`
                    : `${Math.abs(creativeDelta)} criativo(s) saíram do ar.`}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
