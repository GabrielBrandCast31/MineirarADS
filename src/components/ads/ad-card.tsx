"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink, Layers, Sparkles, Timer } from "lucide-react";
import type { AdEnriched } from "@/core/types/ad";
import { CTA_LABEL, FORMAT_LABEL, PLATFORM_LABEL } from "@/core/constants/meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip } from "@/components/ui/tooltip";
import { CreativePreview } from "./creative-preview";
import { ScoreBadge } from "./ad-score";
import { SaveButton } from "./save-button";
import { MonitorButton } from "./monitor-button";
import { cn } from "@/lib/utils";
import { formatDays, formatRelative, truncate } from "@/lib/format";

export interface AdCardProps {
  ad: AdEnriched;
  /** Seleção para o comparador. Ausente = card sem checkbox. */
  selected?: boolean;
  onSelectChange?: (selected: boolean) => void;
  className?: string;
}

/**
 * Card de anúncio — a unidade visual mais repetida do produto.
 *
 * Hierarquia: criativo primeiro (é o que o usuário reconhece), depois
 * anunciante, depois copy, e por último os sinais numéricos. As ações ficam
 * numa faixa que só ganha contraste no hover para não competir com o conteúdo.
 */
export function AdCard({
  ad,
  selected,
  onSelectChange,
  className,
}: AdCardProps): React.ReactElement {
  const isActive = ad.status === "active";
  const platforms = ad.platforms.slice(0, 3).map((p) => PLATFORM_LABEL[p]);

  return (
    <article
      className={cn(
        "panel-elevated group flex flex-col overflow-hidden transition-colors duration-200 hover:border-line-strong",
        selected && "border-brand/50 ring-1 ring-brand/25",
        className,
      )}
    >
      <div className="relative">
        <Link href={`/ads/${ad.id}`} className="block" aria-label={`Abrir anúncio de ${ad.advertiserName}`}>
          <CreativePreview creatives={ad.creatives} alt={ad.headline ?? ad.advertiserName} />
        </Link>

        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-1.5">
          <div className="pointer-events-auto">
            <ScoreBadge score={ad.score} />
          </div>
          <Badge variant={isActive ? "ok" : "neutral"} size="sm" className="backdrop-blur">
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {onSelectChange ? (
          <label
            className={cn(
              "absolute left-2 top-2 grid size-7 cursor-pointer place-items-center rounded-md border border-line-strong bg-canvas/80 backdrop-blur transition-opacity",
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
            title="Selecionar para comparar"
          >
            <Checkbox
              checked={selected}
              onCheckedChange={(value) => onSelectChange(value === true)}
              aria-label="Selecionar para comparar"
            />
          </label>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
        <Link
          href={`/advertisers/${ad.advertiserId}`}
          className="flex min-w-0 items-center gap-2 text-ink-muted transition-colors hover:text-ink"
        >
          <Avatar src={ad.advertiserAvatarUrl} name={ad.advertiserName} className="size-6" />
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
            {ad.advertiserName}
          </span>
          <CheckCircle2 className="size-3.5 shrink-0 text-info/70" />
        </Link>

        {ad.headline ? (
          <h3 className="line-clamp-2 text-[13.5px] font-medium leading-snug text-ink">
            {ad.headline}
          </h3>
        ) : null}

        {ad.bodyText ? (
          <p className="line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-faint">
            {truncate(ad.bodyText.replace(/\n{2,}/g, "\n"), 190)}
          </p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Tooltip content={`No ar desde ${formatRelative(ad.startedAt)}`}>
            <span>
              <Badge variant={ad.activeDays >= 60 ? "heat" : "neutral"} size="sm">
                <Timer />
                {formatDays(ad.activeDays)}
              </Badge>
            </span>
          </Tooltip>

          {ad.relatedAdsCount > 0 ? (
            <Tooltip content="Anúncios irmãos agrupados na mesma oferta">
              <span>
                <Badge variant="brand" size="sm">
                  <Layers />
                  {ad.relatedAdsCount + 1} na oferta
                </Badge>
              </span>
            </Tooltip>
          ) : null}

          <Badge variant="outline" size="sm">
            {FORMAT_LABEL[ad.format]}
          </Badge>

          {ad.callToAction && ad.callToAction !== "NONE" ? (
            <Badge variant="outline" size="sm">
              {CTA_LABEL[ad.callToAction]}
            </Badge>
          ) : null}

          {platforms.length > 0 ? (
            <Tooltip content={ad.platforms.map((p) => PLATFORM_LABEL[p]).join(", ")}>
              <span className="text-[11px] text-ink-faint">{platforms.join(" · ")}</span>
            </Tooltip>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-1 border-t border-line px-2.5 py-2">
        <Button asChild variant="ghost" size="sm" className="px-2 text-[12.5px]">
          <Link href={`/ads/${ad.id}`}>
            <Sparkles />
            Analisar
          </Link>
        </Button>

        <div className="ml-auto flex items-center gap-0.5">
          <SaveButton
            kind="ad"
            entityId={ad.id}
            label={ad.headline ?? ad.advertiserName}
            initiallySaved={ad.saved}
          />
          <MonitorButton
            target="ad"
            entityId={ad.id}
            label={ad.headline ?? ad.advertiserName}
            thumbnail={ad.creatives[0]?.thumbnailUrl ?? null}
            initiallyMonitored={ad.monitored}
          />
          <Tooltip content="Abrir na Meta Ad Library">
            <Button asChild variant="ghost" size="icon-sm">
              <a href={ad.adLibraryUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink />
                <span className="sr-only">Ver na Meta Ad Library</span>
              </a>
            </Button>
          </Tooltip>
        </div>
      </div>
    </article>
  );
}
