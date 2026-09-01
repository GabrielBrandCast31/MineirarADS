import * as React from "react";
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import type { Collection } from "@/core/types/library";
import { cn } from "@/lib/utils";
import { formatNumber, formatRelative } from "@/lib/format";

export function CollectionCard({
  collection,
  className,
}: {
  collection: Collection;
  className?: string;
}): React.ReactElement {
  return (
    <Link
      href={`/library/${collection.id}`}
      className={cn(
        "panel-elevated group flex flex-col overflow-hidden transition-colors hover:border-line-strong",
        className,
      )}
    >
      {/* Capa: mosaico das miniaturas dos últimos itens salvos. */}
      <div className="relative grid h-24 grid-cols-4 gap-px bg-line">
        {collection.coverThumbnails.length > 0 ? (
          collection.coverThumbnails.slice(0, 4).map((thumbnail, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${thumbnail}-${index}`}
              src={thumbnail}
              alt=""
              loading="lazy"
              className="size-full object-cover"
            />
          ))
        ) : (
          <div className="col-span-4 grid place-items-center bg-surface-2 text-ink-faint">
            <FolderOpen className="size-5" />
          </div>
        )}
        <span
          className="absolute inset-x-0 bottom-0 h-0.5"
          style={{ backgroundColor: `var(--color-${collection.color})` }}
          aria-hidden
        />
      </div>

      <div className="min-w-0 space-y-1 p-4">
        <h3 className="truncate text-[14px] font-semibold text-ink">{collection.name}</h3>
        {collection.description ? (
          <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink-faint">
            {collection.description}
          </p>
        ) : null}
        <p className="pt-1 text-[11.5px] text-ink-faint">
          {formatNumber(collection.itemCount)}{" "}
          {collection.itemCount === 1 ? "item" : "itens"} · atualizada{" "}
          {formatRelative(collection.updatedAt)}
        </p>
      </div>
    </Link>
  );
}
