"use client";

import * as React from "react";
import Link from "next/link";
import { GitCompareArrows, Lightbulb, SearchX, X } from "lucide-react";
import type { AdEnriched } from "@/core/types/ad";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AdCard } from "./ad-card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";

const MAX_COMPARE = 4;

/**
 * Grade de anúncios com seleção para o comparador.
 *
 * A seleção vive aqui e viaja para `/compare` pela URL — assim o comparador
 * é linkável e o usuário pode compartilhar a comparação.
 */
export function AdGrid({
  ads,
  selectable = true,
  emptyTitle = "Nenhum anúncio encontrado",
  emptyDescription = "Ajuste os filtros ou tente outra palavra-chave.",
  className,
}: {
  ads: AdEnriched[];
  selectable?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  className?: string;
}): React.ReactElement {
  const [selected, setSelected] = React.useState<string[]>([]);

  function toggle(id: string, value: boolean): void {
    setSelected((prev) => {
      if (!value) return prev.filter((item) => item !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  }

  if (ads.length === 0) {
    return (
      <EmptyState
        icon={<SearchX />}
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
          className,
        )}
      >
        {ads.map((ad) => (
          <AdCard
            key={ad.id}
            ad={ad}
            selected={selectable ? selected.includes(ad.id) : undefined}
            onSelectChange={selectable ? (value) => toggle(ad.id, value) : undefined}
          />
        ))}
      </div>

      {selectable && selected.length > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-line-strong bg-surface-2/95 py-1.5 pl-4 pr-1.5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur">
            <span className="text-[13px] text-ink-muted">
              <strong className="tnum font-semibold text-ink">{selected.length}</strong>{" "}
              selecionado{selected.length > 1 ? "s" : ""}
              {selected.length >= MAX_COMPARE ? (
                <span className="text-ink-faint"> (máximo)</span>
              ) : null}
            </span>
            <Button asChild variant="primary" size="sm" disabled={selected.length < 2}>
              <Link href={`/compare?ads=${selected.join(",")}`}>
                <GitCompareArrows />
                Comparar
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/insights?ads=${selected.join(",")}`}>
                <Lightbulb />
                Insights
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelected([])}
              aria-label="Limpar seleção"
            >
              <X />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Cabeçalho de resultados: contagem + espaço para ordenação. */
export function ResultsHeader({
  total,
  shown,
  children,
}: {
  total: number;
  shown: number;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-ink-faint">
        <strong className="tnum font-semibold text-ink">{formatNumber(total)}</strong> anúncios
        encontrados
        {shown < total ? (
          <span> · exibindo {formatNumber(shown)}</span>
        ) : null}
      </p>
      {children}
    </div>
  );
}
