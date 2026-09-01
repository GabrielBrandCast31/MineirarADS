import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Database, Pickaxe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AdFilters, SortSelect } from "@/components/ads/ad-filters";
import { AdGrid, ResultsHeader } from "@/components/ads/ad-grid";
import { MineHero } from "@/components/ads/mine-hero";
import { parseSearchParams, toQueryString } from "@/components/ads/search-params";
import { requireSession } from "@/server/auth";
import { mineAds, suggestSearchTerms } from "@/server/services/search";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Minerar" };

export default async function MinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  const raw = await searchParams;
  const params = parseSearchParams(raw);

  const [result, suggestions] = await Promise.all([
    mineAds(session, params),
    suggestSearchTerms(params.query ?? ""),
  ]);

  const nextParams = result.nextCursor
    ? `${toQueryString(params)}&cursor=${encodeURIComponent(result.nextCursor)}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Pickaxe className="size-3.5" />
            Mineração
          </>
        }
        title="Minerar anúncios"
        description="Busque na biblioteca pública da Meta por palavra-chave, país, formato e tempo de veiculação. Ordene por Ad Score para ver primeiro o que está no ar há mais tempo."
        actions={
          <Badge variant="neutral" size="lg">
            <Database className="size-3" />
            Fonte: {result.provider === "mock" ? "dados de demonstração" : result.provider}
          </Badge>
        }
      />

      <MineHero params={params} suggestions={suggestions} />

      {result.warnings.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-warn/30 bg-warn/8 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="space-y-1 text-[12.5px] leading-relaxed text-ink-muted">
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-6">
        <AdFilters initial={params} resultCount={result.total} />

        <div className="min-w-0 flex-1 space-y-4">
          <ResultsHeader total={result.total} shown={result.items.length}>
            <div className="flex items-center gap-2">
              <span className="hidden text-[12px] text-ink-faint sm:inline">
                {formatNumber(result.durationMs)} ms
              </span>
              <SortSelect value={params} />
            </div>
          </ResultsHeader>

          <AdGrid
            ads={result.items}
            emptyTitle={
              params.query ? `Nada encontrado para "${params.query}"` : "Comece uma mineração"
            }
            emptyDescription={
              params.query
                ? "Tente uma palavra-chave mais ampla, aumente o período ou remova o piso de tempo ativo."
                : "Digite o nicho, produto ou oferta que você quer investigar e clique em MINERAR ANÚNCIOS."
            }
          />

          {nextParams ? (
            <div className="flex justify-center pt-2">
              <Button asChild variant="secondary">
                <Link href={`/mine?${nextParams}`}>Carregar mais anúncios</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
