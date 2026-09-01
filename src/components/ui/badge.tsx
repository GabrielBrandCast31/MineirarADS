import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-none tracking-tight whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-2 text-ink-muted",
        brand: "border-brand/35 bg-brand/12 text-brand-hi",
        heat: "border-heat/35 bg-heat/12 text-heat",
        ok: "border-ok/30 bg-ok/12 text-ok",
        warn: "border-warn/30 bg-warn/12 text-warn",
        bad: "border-bad/30 bg-bad/12 text-bad",
        info: "border-info/30 bg-info/12 text-info",
        outline: "border-line-strong bg-transparent text-ink-faint",
      },
      size: {
        sm: "px-1.5 py-0.5 text-[10px]",
        md: "px-2 py-0.5 text-[11px]",
        lg: "px-2.5 py-1 text-xs",
      },
    },
    defaultVariants: { variant: "neutral", size: "md" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps): React.ReactElement {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { badgeVariants };
