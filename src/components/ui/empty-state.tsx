import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "panel flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="relative">
          <span className="absolute inset-0 -z-10 rounded-full bg-brand/15 blur-xl" aria-hidden />
          <div className="grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-ink-muted [&_svg]:size-5">
            {icon}
          </div>
        </div>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-faint">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
