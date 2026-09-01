import * as React from "react";
import Link from "next/link";
import { Boxes, Clock, Layers } from "lucide-react";
import type { OfferEnriched } from "@/core/types/offer";
import { CTA_LABEL, FORMAT_LABEL } from "@/core/constants/meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDays, formatNumber } from "@/lib/format";
import { scoreColor } from "@/components/charts/palette";

/**
 * Card de oferta — a unidade de análise mais útil da plataforma.
 * Mostra o que interessa de relance: quanto tempo a oferta está viva e
 * quantos criativos o anunciante já queimou nela.
 */
export function OfferCard({
  offer,
  compact = false,
  className,
}: {
  offer: OfferEnriched;
  compact?: boolean;
  className?: string;
}): React.ReactElement {
  const { stats } = offer;
  const color = scoreColor(stats.score);
  const topFormats = Object.entries(stats.formatBreakdown)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 3);

  return (
    <Link
      href={`/offers/${offer.id}`}
      className={cn(
        "panel-elevated group flex items-start gap-3.5 p-4 transition-colors hover:border-line-strong",
        className,
      )}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-lg border"
        style={{
          color,
          borderColor: `color-mix(in oklch, ${color} 35%, transparent)`,
          backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
        }}
      >
        <Boxes className="size-4" />
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-semibold text-ink">{offer.name}</h3>
          <Tooltip content="Score da oferta: média dos anúncios ponderada por tempo ativo, com bônus por volume simultâneo.">
            <span
              className="tnum shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold"
              style={{
                color,
                borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
                backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
              }}
            >
              {stats.score}
            </span>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <Avatar
            src={offer.advertiserAvatarUrl}
            name={offer.advertiserName}
            className="size-4"
          />
          <span className="truncate">{offer.advertiserName}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={stats.activeDays >= 90 ? "heat" : "neutral"} size="sm">
            <Clock />
            {formatDays(stats.activeDays)}
          </Badge>
          <Badge variant="brand" size="sm">
            <Layers />
            {formatNumber(stats.totalCreatives)} criativos
          </Badge>
          <Badge variant="outline" size="sm">
            {formatNumber(stats.activeAds)} de {formatNumber(stats.totalAds)} ativos
          </Badge>
          {!compact && stats.topCallToAction ? (
            <Badge variant="outline" size="sm">
              CTA: {CTA_LABEL[stats.topCallToAction]}
            </Badge>
          ) : null}
        </div>

        {!compact && topFormats.length > 0 ? (
          <p className="pt-0.5 text-[11.5px] text-ink-faint">
            {topFormats
              .map(([format, count]) => `${FORMAT_LABEL[format as keyof typeof FORMAT_LABEL]}: ${count}`)
              .join(" · ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
