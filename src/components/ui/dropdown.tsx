"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dropdown = DropdownPrimitive.Root;
export const DropdownTrigger = DropdownPrimitive.Trigger;
export const DropdownGroup = DropdownPrimitive.Group;

export const DropdownContent = React.forwardRef<
  React.ComponentRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[11rem] overflow-hidden rounded-lg border border-line-strong bg-surface-2 p-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] animate-fade-in",
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownContent.displayName = "DropdownContent";

export const DropdownItem = React.forwardRef<
  React.ComponentRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-ink-muted outline-none transition-colors",
      "focus:bg-surface-3 focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      "[&_svg]:size-3.5 [&_svg]:shrink-0",
      destructive && "text-bad focus:bg-bad/12 focus:text-bad",
      className,
    )}
    {...props}
  />
));
DropdownItem.displayName = "DropdownItem";

export const DropdownCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ className, children, ...props }, ref) => (
  <DropdownPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-md py-1.5 pl-7 pr-2.5 text-[13px] text-ink-muted outline-none transition-colors focus:bg-surface-3 focus:text-ink",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownPrimitive.ItemIndicator>
        <Check className="size-3.5 text-brand-hi" />
      </DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.CheckboxItem>
));
DropdownCheckboxItem.displayName = "DropdownCheckboxItem";

export const DropdownLabel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn(
      "px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint",
      className,
    )}
    {...props}
  />
);

export const DropdownSeparator = (): React.ReactElement => (
  <DropdownPrimitive.Separator className="my-1 h-px bg-line" />
);
