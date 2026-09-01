import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn("skeleton", className)} aria-hidden {...props} />;
}

/** Esqueleto com a mesma proporção do AdCard — evita salto de layout. */
export function AdCardSkeleton(): React.ReactElement {
  return (
    <div className="panel overflow-hidden">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function AdGridSkeleton({ count = 8 }: { count?: number }): React.ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <AdCardSkeleton key={i} />
      ))}
    </div>
  );
}
