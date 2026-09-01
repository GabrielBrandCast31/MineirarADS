import * as React from "react";
import Link from "next/link";
import { Radar } from "lucide-react";
import type { Monitor } from "@/core/types/monitoring";
import { MONITOR_FREQUENCY_LABEL, MONITOR_TARGET_LABEL } from "@/core/types/monitoring";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

export function MonitoringCard({
  monitor,
  className,
}: {
  monitor: Monitor;
  className?: string;
}): React.ReactElement {
  return (
    <Link
      href={`/monitoring/${monitor.id}`}
      className={cn(
        "panel-elevated group flex items-start gap-3.5 p-4 transition-colors hover:border-line-strong",
        className,
      )}
    >
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-surface-2">
        {monitor.entityThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={monitor.entityThumbnail} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <Radar className="size-4 text-info" />
        )}
        {monitor.active ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-ok" aria-hidden />
        ) : null}
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 truncate text-[14px] font-semibold text-ink">
            {monitor.entityLabel}
          </h3>
          {monitor.unseenEvents > 0 ? (
            <Badge variant="heat" size="sm">
              {monitor.unseenEvents} novo{monitor.unseenEvents > 1 ? "s" : ""}
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="brand" size="sm">
            {MONITOR_TARGET_LABEL[monitor.target]}
          </Badge>
          <Badge variant="outline" size="sm">
            {MONITOR_FREQUENCY_LABEL[monitor.frequency]}
          </Badge>
          <Badge variant={monitor.active ? "ok" : "neutral"} size="sm">
            {monitor.active ? "Ativo" : "Pausado"}
          </Badge>
        </div>

        <p className="text-[11.5px] text-ink-faint">
          {monitor.lastCheckedAt
            ? `Última verificação ${formatRelative(monitor.lastCheckedAt)}`
            : "Ainda sem verificação"}
        </p>
      </div>
    </Link>
  );
}
