import * as React from "react";
import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}): React.ReactElement {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full bg-brand transition-[width] duration-500", barClassName)}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
