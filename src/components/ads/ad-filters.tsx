"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { AdFormat, AdStatus, CountryCode, Platform } from "@/core/types/common";
import type { ActiveDaysFloor, SearchAdsParams } from "@/core/types/search";
import { SORT_LABEL } from "@/core/types/search";
import {
  ACTIVE_DAYS_FLOORS,
  AD_FORMATS,
  AD_STATUSES,
  COUNTRIES,
  DATE_PRESETS,
  PLATFORMS,
} from "@/core/constants/meta";
import { Button } from "@/components/ui/button";
import { ChipToggle } from "@/components/ui/checkbox";
import { Input, Label, Select } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { countActiveFilters, toQueryString } from "./search-params";

function toggleIn<T>(list: T[] | undefined, value: T): T[] {
  const current = list ?? [];
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

/** Painel de filtros. Usado inline no desktop e dentro de um drawer no mobile. */
export function FilterPanel({
  value,
  onChange,
}: {
  value: SearchAdsParams;
  onChange: (next: SearchAdsParams) => void;
}): React.ReactElement {
  const patch = (partial: Partial<SearchAdsParams>): void =>
    onChange({ ...value, ...partial, cursor: null });

  return (
    <div className="space-y-5">
      <Field label="País">
        <div className="flex flex-wrap gap-1.5">
          {COUNTRIES.slice(0, 8).map((country) => (
            <ChipToggle
              key={country.value}
              active={value.countries?.includes(country.value) ?? false}
              onClick={() =>
                patch({ countries: toggleIn(value.countries, country.value) as CountryCode[] })
              }
            >
              <span aria-hidden>{country.flag}</span>
              {country.label}
            </ChipToggle>
          ))}
        </div>
      </Field>

      <Field label="Status">
        <Select
          value={value.status ?? "active"}
          onChange={(event) => patch({ status: event.target.value as AdStatus | "all" })}
        >
          {AD_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tipo de criativo">
        <div className="flex flex-wrap gap-1.5">
          {AD_FORMATS.map((format) => (
            <ChipToggle
              key={format.value}
              active={value.formats?.includes(format.value) ?? false}
              onClick={() => patch({ formats: toggleIn(value.formats, format.value) as AdFormat[] })}
            >
              {format.label}
            </ChipToggle>
          ))}
        </div>
      </Field>

      <Field label="Período de veiculação">
        <Select
          value={value.datePreset ?? "90d"}
          onChange={(event) =>
            patch({ datePreset: event.target.value as SearchAdsParams["datePreset"] })
          }
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </Select>
        {value.datePreset === "custom" ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={value.dateFrom ?? ""}
              onChange={(event) => patch({ dateFrom: event.target.value })}
              aria-label="Data inicial"
            />
            <Input
              type="date"
              value={value.dateTo ?? ""}
              onChange={(event) => patch({ dateTo: event.target.value })}
              aria-label="Data final"
            />
          </div>
        ) : null}
      </Field>

      <Field
        label="Tempo ativo"
        hint="O filtro mais importante da mineração: anúncio que fica meses no ar é decisão deliberada do anunciante."
      >
        <div className="flex flex-wrap gap-1.5">
          {ACTIVE_DAYS_FLOORS.map((floor) => (
            <ChipToggle
              key={floor.value}
              active={(value.minActiveDays ?? 0) === floor.value}
              onClick={() => patch({ minActiveDays: floor.value as ActiveDaysFloor })}
            >
              {floor.label}
            </ChipToggle>
          ))}
        </div>
      </Field>

      <Field label="Plataforma">
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((platform) => (
            <ChipToggle
              key={platform.value}
              active={value.platforms?.includes(platform.value) ?? false}
              onClick={() =>
                patch({ platforms: toggleIn(value.platforms, platform.value) as Platform[] })
              }
            >
              {platform.label}
            </ChipToggle>
          ))}
        </div>
      </Field>

      <Field label="Página / anunciante">
        <Input
          value={value.advertiser ?? ""}
          onChange={(event) => patch({ advertiser: event.target.value })}
          placeholder="Nome da página"
        />
      </Field>

      <Field label="Score mínimo">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={95}
            step={5}
            value={value.minScore ?? 0}
            onChange={(event) => patch({ minScore: Number(event.target.value) || undefined })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--color-brand)]"
            aria-label="Score mínimo"
          />
          <span className="tnum w-8 shrink-0 text-right text-[13px] text-ink-muted">
            {value.minScore ?? 0}
          </span>
        </div>
      </Field>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-[11.5px] leading-relaxed text-ink-faint">{hint}</p> : null}
    </div>
  );
}

/**
 * Controlador dos filtros: mantém o estado local, aplica na URL.
 *
 * Aplicar só no submit (e não a cada clique) evita disparar uma mineração
 * por caractere digitado e mantém o histórico do navegador utilizável.
 */
export function AdFilters({
  initial,
  resultCount,
}: {
  initial: SearchAdsParams;
  resultCount: number;
}): React.ReactElement {
  const router = useRouter();
  const [draft, setDraft] = React.useState<SearchAdsParams>(initial);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  /**
   * Ressincroniza o rascunho quando a URL muda por fora (navegação, reset,
   * voltar do histórico). A comparação é pela query string, não pela
   * identidade do objeto: `initial` vem do servidor e chega novo a cada
   * render, o que faria a checagem disparar sempre.
   */
  const initialKey = toQueryString(initial);
  const [syncedKey, setSyncedKey] = React.useState(initialKey);
  if (initialKey !== syncedKey) {
    setSyncedKey(initialKey);
    setDraft(initial);
  }

  const activeCount = countActiveFilters(draft);
  const dirty = toQueryString(draft) !== initialKey;

  const apply = (next: SearchAdsParams = draft): void => {
    setMobileOpen(false);
    router.push(`/mine?${toQueryString(next)}`);
  };

  const reset = (): void => {
    const cleared: SearchAdsParams = {
      query: draft.query,
      countries: ["BR"],
      status: "active",
      formats: [],
      platforms: [],
      datePreset: "90d",
      minActiveDays: 0,
      sort: "score",
    };
    setDraft(cleared);
    apply(cleared);
  };

  return (
    <>
      {/* Desktop: coluna fixa de filtros. */}
      <aside className="hidden w-[248px] shrink-0 lg:block">
        <div className="sticky top-[4.75rem] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <SlidersHorizontal className="size-3.5 text-ink-faint" />
              Filtros
              {activeCount > 0 ? (
                <Badge variant="brand" size="sm">
                  {activeCount}
                </Badge>
              ) : null}
            </h2>
            {activeCount > 0 ? (
              <Button variant="ghost" size="icon-sm" onClick={reset} aria-label="Limpar filtros">
                <RotateCcw />
              </Button>
            ) : null}
          </div>

          <div className="panel max-h-[calc(100dvh-11rem)] overflow-y-auto p-4">
            <FilterPanel value={draft} onChange={setDraft} />
          </div>

          <Button
            variant={dirty ? "primary" : "secondary"}
            className="w-full"
            onClick={() => apply()}
          >
            {dirty ? "Aplicar filtros" : `${resultCount} resultados`}
          </Button>
        </div>
      </aside>

      {/* Mobile: drawer. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="sm" className="lg:hidden">
            <SlidersHorizontal />
            Filtros
            {activeCount > 0 ? (
              <Badge variant="brand" size="sm">
                {activeCount}
              </Badge>
            ) : null}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="lg:hidden">
          <SheetHeader>
            <SheetTitle className="text-[15px] font-semibold text-ink">Filtros</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <FilterPanel value={draft} onChange={setDraft} />
          </SheetBody>
          <SheetFooter className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Limpar
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => apply()}>
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Ordenação — fica junto do cabeçalho de resultados. */
export function SortSelect({ value }: { value: SearchAdsParams }): React.ReactElement {
  const router = useRouter();
  return (
    <Select
      className="h-8 w-auto min-w-[10.5rem] text-[13px]"
      value={value.sort ?? "score"}
      onChange={(event) =>
        router.push(
          `/mine?${toQueryString({ ...value, sort: event.target.value as SearchAdsParams["sort"] })}`,
        )
      }
      aria-label="Ordenar resultados"
    >
      {Object.entries(SORT_LABEL).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Select>
  );
}
