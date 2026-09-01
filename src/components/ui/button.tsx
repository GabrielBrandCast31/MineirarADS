import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:translate-y-px select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-ink shadow-[0_1px_0_0_rgba(255,255,255,0.14)_inset,0_8px_20px_-10px_var(--color-brand)] hover:bg-brand-hi",
        heat:
          "bg-heat text-canvas font-semibold shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_8px_22px_-10px_var(--color-heat)] hover:bg-heat-hi",
        secondary:
          "bg-surface-2 text-ink border border-line hover:bg-surface-3 hover:border-line-strong",
        outline:
          "border border-line bg-transparent text-ink-muted hover:text-ink hover:border-line-strong hover:bg-surface/60",
        ghost: "text-ink-muted hover:text-ink hover:bg-surface-2",
        danger: "bg-bad/15 text-bad border border-bad/35 hover:bg-bad/25",
        link: "text-brand-hi underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-9 px-4 [&_svg]:size-4",
        lg: "h-11 px-6 text-[15px] [&_svg]:size-[18px]",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
