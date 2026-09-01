"use client";

import * as React from "react";
import { Loader2, Radar } from "lucide-react";
import type { MonitorTarget } from "@/core/types/monitoring";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { startMonitoringAction } from "@/server/actions/monitoring";

export function MonitorButton({
  target,
  entityId,
  label,
  thumbnail,
  initiallyMonitored = false,
  variant = "ghost",
  size = "icon-sm",
  showLabel = false,
  className,
}: {
  target: MonitorTarget;
  entityId: string;
  label: string;
  thumbnail?: string | null;
  initiallyMonitored?: boolean;
  variant?: "ghost" | "outline" | "secondary";
  size?: "icon-sm" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}): React.ReactElement {
  const [monitored, setMonitored] = React.useState(initiallyMonitored);
  const [pending, startTransition] = React.useTransition();

  function toggle(): void {
    if (monitored) {
      toast.info("Já está monitorado. Gerencie em Monitoramento.");
      return;
    }
    startTransition(async () => {
      const result = await startMonitoringAction({ target, entityId, label, thumbnail });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMonitored(true);
      toast.success("Monitoramento criado. O primeiro snapshot já foi capturado.");
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggle}
      disabled={pending}
      className={cn(monitored && "text-info", className)}
      aria-label="Monitorar"
      title={monitored ? "Monitorado" : "Monitorar"}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Radar />}
      {showLabel ? (monitored ? "Monitorando" : "Monitorar") : null}
    </Button>
  );
}
