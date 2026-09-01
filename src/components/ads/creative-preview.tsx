"use client";

import * as React from "react";
import { Images, Play } from "lucide-react";
import type { Creative } from "@/core/types/creative";
import { aspectRatioOf } from "@/core/types/creative";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

/**
 * Preview de criativo.
 *
 * Usa `<img>` em vez de `next/image` de propósito: as URLs vêm de CDNs
 * externas com expiração e podem falhar a qualquer momento. Precisamos de
 * `onError` para cair no placeholder — o otimizador do Next serviria um 500
 * e deixaria um buraco no card.
 */
export function CreativePreview({
  creatives,
  alt,
  className,
  aspect = "4/5",
  showBadges = true,
}: {
  creatives: Creative[];
  alt: string;
  className?: string;
  aspect?: "4/5" | "1/1" | "16/9" | "9/16";
  showBadges?: boolean;
}): React.ReactElement {
  const [index, setIndex] = React.useState(0);
  const [failed, setFailed] = React.useState<Record<number, boolean>>({});
  const current = creatives[index];
  const isCarousel = creatives.length > 1;

  return (
    <div
      className={cn(
        "group/preview relative overflow-hidden bg-surface-2",
        aspect === "4/5" && "aspect-[4/5]",
        aspect === "1/1" && "aspect-square",
        aspect === "16/9" && "aspect-video",
        aspect === "9/16" && "aspect-[9/16]",
        className,
      )}
    >
      {current && !failed[index] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current.thumbnailUrl ?? current.sourceUrl ?? ""}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed((prev) => ({ ...prev, [index]: true }))}
          className="size-full object-cover transition-transform duration-500 group-hover/preview:scale-[1.03]"
        />
      ) : (
        <CreativeFallback label={alt} />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/70 via-transparent to-transparent" />

      {showBadges ? (
        <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-1.5">
          {current?.format === "video" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas/75 px-1.5 py-0.5 text-[10px] font-medium text-ink backdrop-blur">
              <Play className="size-2.5 fill-current" />
              {current.durationSeconds ? formatDuration(current.durationSeconds) : "Vídeo"}
            </span>
          ) : null}
          {isCarousel ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-canvas/75 px-1.5 py-0.5 text-[10px] font-medium text-ink backdrop-blur">
              <Images className="size-2.5" />
              {creatives.length}
            </span>
          ) : null}
          {current ? (
            <span className="rounded-full bg-canvas/75 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted backdrop-blur">
              {aspectRatioOf(current) ?? "—"}
            </span>
          ) : null}
        </div>
      ) : null}

      {isCarousel ? (
        <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
          {creatives.slice(0, 8).map((creative, i) => (
            <button
              key={creative.id}
              type="button"
              aria-label={`Ver criativo ${i + 1}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIndex(i);
              }}
              className={cn(
                "h-1 rounded-full transition-all",
                i === index ? "w-4 bg-ink" : "w-1.5 bg-ink/35 hover:bg-ink/60",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Placeholder determinístico quando a imagem original não carrega. */
function CreativeFallback({ label }: { label: string }): React.ReactElement {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in oklch, var(--color-brand) 22%, var(--color-surface)) 0%, var(--color-surface-2) 55%, color-mix(in oklch, var(--color-heat) 14%, var(--color-surface)) 100%)",
        }}
      />
      <div className="relative px-4 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.09em] text-ink-faint">
          Criativo indisponível
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
