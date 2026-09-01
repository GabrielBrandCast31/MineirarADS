import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-line bg-surface/70 px-3 text-sm text-ink placeholder:text-ink-faint transition-colors outline-none focus-visible:border-brand/60 focus-visible:bg-surface disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-9", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "min-h-[84px] py-2 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

/** Select nativo estilizado: menos JS, acessibilidade de graça, ótimo no mobile. */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        fieldBase,
        "h-9 cursor-pointer appearance-none pr-8 [&>option]:bg-surface [&>option]:text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = "Select";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint",
      className,
    )}
    {...props}
  />
));
Label.displayName = "Label";

export { fieldBase };
