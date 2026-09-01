"use client";

import * as React from "react";
import { Flame, Info } from "lucide-react";
import type { AdScore } from "@/core/types/score";
import { SCORE_BANDS } from "@/core/types/score";
import { FACTOR_DESCRIPTION } from "@/core/score/factors";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { scoreColor } from "@/components/charts/palette";

const BAND_META = Object.fromEntries(SCORE_BANDS.map((b) => [b.band, b]));

/** Selo compacto usado no card. */
export function ScoreBadge({
  score,
  className,
}: {
  score: AdScore;
  className?: string;
}): React.ReactElement {
  const band = BAND_META[score.band];
  const color = scoreColor(score.value);

  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <p className="font-medium text-ink">Ad Score {score.value}/100 · {band?.label}</p>
          <p>{score.explanation}</p>
          <p className="text-ink-faint">
            Estimativa interna a partir de sinais observáveis. Não é métrica de performance.
          </p>
        </div>
      }
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none",
          className,
        )}
        style={{
          color,
          borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
          backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
        }}
      >
        {score.value >= 85 ? <Flame className="size-3" /> : null}
        <span className="tnum">{score.value}</span>
      </span>
    </Tooltip>
  );
}

/** Anel grande com o detalhamento por fator — usado na página do anúncio. */
export function ScoreBreakdown({ score }: { score: AdScore }): React.ReactElement {
  const color = scoreColor(score.value);
  const band = BAND_META[score.band];
  const circumference = 2 * Math.PI * 42;
  const filled = (score.value / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative size-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-surface-3)" strokeWidth="8" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference - filled}`}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="text-2xl font-semibold leading-none" style={{ color }}>
                {score.value}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                de 100
              </div>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold text-ink">{band?.label}</span>
            <span className="rounded-full border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
              Cálculo
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-ink-muted">{score.explanation}</p>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface/60 p-3">
        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          <Info className="size-3" />
          Como cada fator contribuiu
        </p>
        <ul className="space-y-3">
          {score.factors.map((factor) => (
            <li key={factor.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Tooltip content={FACTOR_DESCRIPTION[factor.key]}>
                  <span className="cursor-help text-[13px] text-ink-muted underline decoration-line decoration-dotted underline-offset-4">
                    {factor.label}
                  </span>
                </Tooltip>
                <span className="tnum shrink-0 text-[12px] text-ink-faint">
                  {factor.points.toFixed(1)} de {(factor.weight * 100).toFixed(0)} pts
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${factor.raw * 100}%`,
                    backgroundColor: color,
                    opacity: 0.55 + factor.raw * 0.45,
                  }}
                />
              </div>
              <p className="text-[12px] leading-relaxed text-ink-faint">
                {factor.detail}{" "}
                <span className="text-ink-faint/70">({formatPercent(factor.raw)} do máximo)</span>
              </p>
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-md border border-line bg-surface/40 px-3 py-2 text-[11.5px] leading-relaxed text-ink-faint">
        O Ad Score mede <strong className="font-medium text-ink-muted">persistência e produção
        criativa observáveis</strong> — não faturamento, ROAS ou conversão. A Meta não divulga
        performance de campanha, e a plataforma não estima o que não pode ver.
      </p>
    </div>
  );
}
