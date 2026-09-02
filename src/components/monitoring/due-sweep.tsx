"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { sweepDueMonitorsAction } from "@/server/actions/monitoring";

/**
 * Coleta o que venceu, ao abrir a página.
 *
 * É o que faz o acompanhamento durar a semana sem infraestrutura: cada alvo
 * tem uma hora marcada para a próxima coleta e, quando o usuário abre
 * Monitoramento, o que já passou da hora é verificado. Quem quiser coleta
 * mesmo com a interface fechada aponta um cron para `POST /api/jobs/run`.
 *
 * Roda uma vez por montagem — a checagem seguinte só volta a existir quando
 * `nextCheckAt` vencer de novo.
 */
export function DueSweep({ due }: { due: number }): React.ReactElement | null {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const started = React.useRef(false);

  const sweep = React.useCallback((): void => {
    startTransition(async () => {
      const result = await sweepDueMonitorsAction();
      if (!result.ok) {
        toast.error(result.error);
        setDone(true);
        return;
      }

      if (result.data.events > 0) {
        toast.success(
          `${result.data.events} evento(s) novo(s) em ${result.data.checked} alvo(s).`,
        );
      }
      setDone(true);
      router.refresh();
    });
  }, [router]);

  React.useEffect(() => {
    if (due === 0 || started.current) return;
    started.current = true;
    sweep();
  }, [due, sweep]);

  if (due === 0 || (done && !pending)) return null;

  return (
    <p className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/8 px-3.5 py-2.5 text-[12.5px] text-ink-muted">
      {pending ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-info" />
      ) : (
        <RefreshCw className="size-3.5 shrink-0 text-info" />
      )}
      <span>
        {due} alvo(s) com coleta vencida — verificando agora e comparando com o último snapshot.
      </span>
    </p>
  );
}
