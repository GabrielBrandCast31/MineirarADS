"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Link2, Loader2, Radar } from "lucide-react";
import type { MonitorFrequency } from "@/core/types/monitoring";
import { MONITOR_FREQUENCY_LABEL } from "@/core/types/monitoring";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { watchAdLibraryLinkAction } from "@/server/actions/monitoring";

/**
 * Entrada por link.
 *
 * O usuário chega com uma URL da Biblioteca de Anúncios copiada do navegador —
 * é o único identificador que ele tem de um concorrente. Colar aqui é o começo
 * do acompanhamento; interpretar o link é trabalho do servidor.
 */
export function WatchLinkForm({
  allowHourly,
  exampleUrl,
}: {
  allowHourly: boolean;
  /** Link de exemplo (dataset de demonstração), quando houver. */
  exampleUrl?: string | null;
}): React.ReactElement {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [frequency, setFrequency] = React.useState<MonitorFrequency>("daily");
  const [error, setError] = React.useState<string | null>(null);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  const frequencies: MonitorFrequency[] = allowHourly
    ? ["hourly", "daily", "weekly"]
    : ["daily", "weekly"];

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    if (url.trim().length === 0 || pending) return;

    setError(null);
    setWarnings([]);

    startTransition(async () => {
      const result = await watchAdLibraryLinkAction({ url, frequency });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const { monitor, advertiser, collected, alreadyWatching } = result.data;
      setUrl("");
      setWarnings(result.data.warnings);

      if (alreadyWatching) {
        toast.info(`${advertiser.name} já estava sendo acompanhada.`);
      } else {
        toast.success(
          collected > 0
            ? `${advertiser.name}: ${collected} anúncio(s) na primeira coleta.`
            : `${advertiser.name} entrou no acompanhamento.`,
        );
      }

      // Sem avisos, a página do alvo é mais útil que a lista; com avisos, o
      // usuário precisa lê-los antes de sair daqui.
      if (result.data.warnings.length === 0) router.push(`/monitoring/${monitor.id}`);
      else router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="panel-elevated space-y-3 p-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2">
          <Link2 className="size-4 text-info" />
        </span>
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-[14px] font-semibold text-ink">
            Acompanhar uma página pelo link
          </h2>
          <p className="text-[12px] leading-relaxed text-ink-faint">
            Cole a URL da Biblioteca de Anúncios do anunciante — aquela com{" "}
            <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">view_all_page_id</code>{" "}
            na barra de endereços. Cada coleta é comparada com a anterior e a diferença vira
            evento.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="watch-url">Link da página</Label>
          <Input
            id="watch-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://www.facebook.com/ads/library/?...&view_all_page_id=102938475610"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "watch-url-error" : undefined}
          />
        </div>

        <div className="space-y-1.5 sm:w-[172px]">
          <Label htmlFor="watch-frequency">Verificar</Label>
          <Select
            id="watch-frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value as MonitorFrequency)}
          >
            {frequencies.map((option) => (
              <option key={option} value={option}>
                {MONITOR_FREQUENCY_LABEL[option]}
              </option>
            ))}
          </Select>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={pending || url.trim().length === 0}
          className="sm:w-auto"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Radar />}
          Acompanhar
        </Button>
      </div>

      {error ? (
        <p
          id="watch-url-error"
          role="alert"
          className="flex items-start gap-2 rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-[12.5px] leading-relaxed text-bad"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}

      {warnings.map((warning) => (
        <p
          key={warning}
          role="status"
          className="flex items-start gap-2 rounded-md border border-warn/30 bg-warn/8 px-3 py-2 text-[12.5px] leading-relaxed text-ink-muted"
        >
          <Info className="mt-0.5 size-3.5 shrink-0 text-warn" />
          <span>{warning}</span>
        </p>
      ))}

      {exampleUrl ? (
        <p className="text-[11.5px] text-ink-faint">
          Sem um link à mão?{" "}
          <button
            type="button"
            onClick={() => {
              setUrl(exampleUrl);
              setError(null);
            }}
            className="font-medium text-brand-hi underline-offset-4 hover:underline"
          >
            Use uma página do dataset de demonstração
          </button>
          .
        </p>
      ) : null}
    </form>
  );
}
