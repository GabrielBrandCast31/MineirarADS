"use client";

import { Toaster as SonnerToaster, toast } from "sonner";

/**
 * Notificações. O tema é fixado nos tokens do produto para não herdar o
 * visual padrão da biblioteca.
 */
export function Toaster(): React.ReactElement {
  return (
    <SonnerToaster
      position="bottom-right"
      offset={16}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-2 !border !border-line-strong !text-ink !rounded-lg !shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)]",
          description: "!text-ink-faint",
          actionButton: "!bg-brand !text-brand-ink",
          cancelButton: "!bg-surface-3 !text-ink-muted",
          error: "!border-bad/40",
          success: "!border-ok/40",
        },
      }}
    />
  );
}

export { toast };
