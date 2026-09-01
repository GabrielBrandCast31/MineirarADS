"use client";

import * as React from "react";
import { Calculator, Eye, Sparkles } from "lucide-react";
import type { Evidence, Provenance } from "@/core/types/provenance";
import { PROVENANCE_HINT, PROVENANCE_LABEL } from "@/core/types/provenance";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";

const STYLES: Record<Provenance, { className: string; icon: React.ReactNode }> = {
  observed: {
    className: "border-ok/30 bg-ok/10 text-ok",
    icon: <Eye className="size-3" />,
  },
  derived: {
    className: "border-info/30 bg-info/10 text-info",
    icon: <Calculator className="size-3" />,
  },
  inferred: {
    className: "border-heat/35 bg-heat/10 text-heat",
    icon: <Sparkles className="size-3" />,
  },
};

/**
 * Selo de proveniência.
 *
 * Existe para cumprir uma regra de produto: o usuário precisa distinguir, de
 * relance, o que foi coletado do que foi interpretado. Sem isso, a plataforma
 * vira geradora de achismo com aparência de dado.
 */
export function ProvenanceTag({
  provenance,
  confidence,
  source,
  note,
  compact: isCompact = false,
  className,
}: {
  provenance: Provenance;
  confidence?: number;
  source?: string;
  note?: string;
  compact?: boolean;
  className?: string;
}): React.ReactElement {
  const style = STYLES[provenance];
  const tooltip = (
    <div className="space-y-1">
      <p className="font-medium text-ink">{PROVENANCE_LABEL[provenance]}</p>
      <p>{note ?? PROVENANCE_HINT[provenance]}</p>
      {confidence != null && provenance === "inferred" ? (
        <p className="text-ink-faint">Confiança estimada: {formatPercent(confidence)}</p>
      ) : null}
      {source ? <p className="text-ink-faint">Fonte: {source}</p> : null}
    </div>
  );

  return (
    <Tooltip content={tooltip}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-tight",
          style.className,
          className,
        )}
      >
        {style.icon}
        {!isCompact && PROVENANCE_LABEL[provenance]}
      </span>
    </Tooltip>
  );
}

/** Renderiza um `Evidence<T>` com rótulo, valor e selo. */
export function EvidenceRow<T>({
  label,
  evidence,
  render,
  emptyText = "Não identificado",
}: {
  label: string;
  evidence: Evidence<T> | undefined;
  render?: (value: T) => React.ReactNode;
  emptyText?: string;
}): React.ReactElement {
  const isEmpty =
    !evidence ||
    evidence.value === null ||
    evidence.value === undefined ||
    (Array.isArray(evidence.value) && evidence.value.length === 0) ||
    evidence.value === "";

  return (
    <div className="flex flex-col gap-1.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex w-full shrink-0 items-center gap-2 sm:w-44">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-faint">
          {label}
        </span>
        {evidence && !isEmpty ? (
          <ProvenanceTag
            compact
            provenance={evidence.provenance}
            confidence={evidence.confidence}
            source={evidence.source}
            note={evidence.note}
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-ink-muted">
        {isEmpty ? (
          <span className="text-ink-faint italic">
            {evidence?.note ?? emptyText}
          </span>
        ) : render ? (
          render(evidence.value)
        ) : (
          String(evidence.value)
        )}
      </div>
    </div>
  );
}
