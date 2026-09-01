"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pickaxe, Search } from "lucide-react";
import type { SearchAdsParams } from "@/core/types/search";
import { Button } from "@/components/ui/button";
import { toQueryString } from "./search-params";
import { cn } from "@/lib/utils";

/**
 * Campo central da mineração.
 *
 * O botão principal é âmbar (a cor de "calor" do produto) porque é a ação que
 * define a tela — é a única coisa que deve competir com o criativo dos cards.
 */
export function MineHero({
  params,
  suggestions,
}: {
  params: SearchAdsParams;
  suggestions: string[];
}): React.ReactElement {
  const router = useRouter();
  const [query, setQuery] = React.useState(params.query ?? "");
  const [pending, startTransition] = React.useTransition();

  /**
   * Ressincroniza o campo quando a busca muda por fora (navegação, sugestão,
   * voltar do histórico). Ajuste durante o render — e não num efeito — para
   * não pintar um frame com o texto antigo nem provocar render em cascata.
   */
  const [syncedQuery, setSyncedQuery] = React.useState(params.query);
  if (params.query !== syncedQuery) {
    setSyncedQuery(params.query);
    setQuery(params.query ?? "");
  }

  function mine(term = query): void {
    startTransition(() => {
      router.push(`/mine?${toQueryString({ ...params, query: term.trim(), cursor: null })}`);
    });
  }

  return (
    <div className="panel-elevated aurora relative overflow-hidden p-5 sm:p-6">
      <div className="aurora-layer" aria-hidden />

      <form
        onSubmit={(event) => {
          event.preventDefault();
          mine();
        }}
        className="space-y-3"
      >
        <label
          htmlFor="mine-query"
          className="block text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-faint"
        >
          O que você quer encontrar?
        </label>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-faint" />
            <input
              id="mine-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="implante dentário, energia solar, curso de inglês…"
              autoComplete="off"
              className="h-12 w-full rounded-lg border border-line bg-surface/70 pl-11 pr-4 text-[15px] text-ink placeholder:text-ink-faint outline-none transition-colors focus-visible:border-brand/60 focus-visible:bg-surface"
            />
          </div>

          <Button type="submit" variant="heat" size="lg" disabled={pending} className="shrink-0">
            {pending ? <Loader2 className="animate-spin" /> : <Pickaxe />}
            MINERAR ANÚNCIOS
          </Button>
        </div>
      </form>

      {suggestions.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11.5px] text-ink-faint">Sugestões:</span>
          {suggestions.slice(0, 8).map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
                mine(term);
              }}
              className={cn(
                "rounded-full border border-line bg-surface/60 px-2.5 py-1 text-[12px] text-ink-faint transition-colors",
                "hover:border-line-strong hover:text-ink-muted",
                query === term && "border-brand/45 bg-brand/12 text-brand-hi",
              )}
            >
              {term}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
