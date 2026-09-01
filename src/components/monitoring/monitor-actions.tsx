"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { checkMonitorNowAction, stopMonitoringAction } from "@/server/actions/monitoring";

export function MonitorActions({ monitorId }: { monitorId: string }): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function checkNow(): void {
    startTransition(async () => {
      const result = await checkMonitorNowAction(monitorId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.events > 0
          ? `${result.data.events} evento(s) detectado(s).`
          : "Sem mudanças desde a última coleta.",
      );
      router.refresh();
    });
  }

  function remove(): void {
    startTransition(async () => {
      const result = await stopMonitoringAction(monitorId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Monitoramento encerrado.");
      router.push("/monitoring");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" onClick={checkNow} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Verificar agora
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={remove}
        disabled={pending}
        className="text-ink-faint hover:text-bad"
      >
        <Trash2 />
        Encerrar
      </Button>
    </div>
  );
}
