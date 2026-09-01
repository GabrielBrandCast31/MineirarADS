import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Marca do produto. Pictograma de "camada sendo minerada": três estratos com
 * um vetor de extração atravessando — evita o clichê de lupa/gráfico.
 */
export function LogoMark({ className }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="adminer-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-hi)" />
          <stop offset="62%" stopColor="var(--color-brand)" />
          <stop offset="100%" stopColor="var(--color-heat)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="url(#adminer-mark)" opacity="0.16" />
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="none"
        stroke="url(#adminer-mark)"
        strokeWidth="1.2"
        opacity="0.55"
      />
      <path
        d="M7.5 11.5h17M7.5 16h12M7.5 20.5h8"
        stroke="url(#adminer-mark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20.5 24.5L26 13.5"
        stroke="var(--color-heat)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="26" cy="13.5" r="2.4" fill="var(--color-heat)" />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}): React.ReactElement {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showWordmark ? (
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
          Ad<span className="text-gradient-brand">Miner</span>
        </span>
      ) : null}
    </span>
  );
}
