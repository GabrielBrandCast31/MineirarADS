"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Painel deslizante. No mobile é onde os filtros da mineração vivem —
 * requisito de responsividade do produto.
 */
export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export const SheetContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "left" | "right" | "bottom";
  }
>(({ className, children, side = "right", ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-[2px] animate-fade-in" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex flex-col border-line bg-bg shadow-[0_0_80px_-20px_rgba(0,0,0,0.9)] animate-rise",
        side === "right" && "inset-y-0 right-0 w-[min(24rem,100vw)] border-l",
        side === "left" && "inset-y-0 left-0 w-[min(20rem,100vw)] border-r",
        side === "bottom" && "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-3.5 top-3.5 rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink">
        <X className="size-4" />
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn("border-b border-line px-5 py-4", className)} {...props} />
);

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export const SheetBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn("flex-1 overflow-y-auto px-5 py-4", className)} {...props} />
);

export const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn("border-t border-line px-5 py-3.5", className)} {...props} />
);
