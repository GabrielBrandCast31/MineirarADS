import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { InsightsGenerator } from "@/components/insights/generator";
import { InsightReportView } from "@/components/insights/report-view";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatNumber, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ ads?: string; report?: string }>;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  const { ads: adsParam, report: reportId } = await searchParams;
  const repositories = getRepositories();

  const adIds = (adsParam ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const [history, selectedReport] = await Promise.all([
    repositories.analysis.listInsightReports(session, 12),
    reportId ? repositories.analysis.getInsightReport(session, reportId) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Lightbulb className="size-3.5" />
            Inteligência
          </>
        }
        title="Gerador de insights"
        description="Padrões de um conjunto de anúncios: hooks, CTAs, ângulos, promessas, objeções, formatos e estruturas de copy. Os números são contagem; as recomendações vêm marcadas como inferência."
      />

      {selectedReport ? (
        <InsightReportView report={selectedReport} />
      ) : adIds.length > 0 ? (
        <InsightsGenerator adIds={adIds} />
      ) : (
        <EmptyState
          icon={<Lightbulb />}
          title="Selecione um conjunto de anúncios"
          description="Marque anúncios na mineração e clique em “Insights”, ou abra uma oferta e use o botão “Gerar insights” para analisar todos os criativos dela."
          action={
            <Button asChild variant="heat">
              <Link href="/mine">Ir para a mineração</Link>
            </Button>
          }
        />
      )}

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Relatórios anteriores</CardTitle>
            <CardDescription>Relatórios ficam salvos no workspace.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-line">
              {history.map((report) => (
                <li key={report.id}>
                  <Link
                    href={`/insights?report=${report.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-ink"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-ink">
                        {formatNumber(report.sampleSize)} anúncios ·{" "}
                        {report.hooks[0]?.label ?? "sem hook dominante"}
                      </span>
                      <span className="block text-[11.5px] text-ink-faint">
                        {formatRelative(report.createdAt)}
                      </span>
                    </span>
                    <Badge variant="outline" size="sm">
                      {report.engine}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
