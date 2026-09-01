import * as React from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className={cn("aurora relative pb-1", className)}>
      <div className="aurora-layer" aria-hidden />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-balance text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-pretty text-sm leading-relaxed text-ink-faint">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}
