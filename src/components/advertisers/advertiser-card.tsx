import * as React from "react";
import Link from "next/link";
import { BadgeCheck, Boxes, Signal } from "lucide-react";
import type { Advertiser } from "@/core/types/advertiser";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDays, formatNumber } from "@/lib/format";

export function AdvertiserCard({
  advertiser,
  compact = false,
  className,
}: {
  advertiser: Advertiser;
  compact?: boolean;
  className?: string;
}): React.ReactElement {
  const { stats } = advertiser;

  return (
    <Link
      href={`/advertisers/${advertiser.id}`}
      className={cn(
        "panel-elevated group flex items-start gap-3.5 p-4 transition-colors hover:border-line-strong",
        className,
      )}
    >
      <Avatar
        src={advertiser.avatarUrl}
        name={advertiser.name}
        className="size-10 rounded-lg"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <h3 className="min-w-0 truncate text-[14px] font-semibold text-ink">
            {advertiser.name}
          </h3>
          {advertiser.verified ? (
            <BadgeCheck className="size-3.5 shrink-0 text-info" aria-label="Página verificada" />
          ) : null}
        </div>

        {advertiser.category ? (
          <p className="truncate text-[12px] text-ink-faint">{advertiser.category}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge variant={stats.activeAds > 0 ? "ok" : "neutral"} size="sm">
            <Signal />
            {formatNumber(stats.activeAds)} ativos
          </Badge>
          <Badge variant="outline" size="sm">
            {formatNumber(stats.totalAds)} no total
          </Badge>
          {!compact ? (
            <>
              <Badge variant="brand" size="sm">
                <Boxes />
                {formatNumber(stats.totalOffers)} ofertas
              </Badge>
              <Badge variant="outline" size="sm">
                média {formatDays(stats.avgActiveDays)}
              </Badge>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
