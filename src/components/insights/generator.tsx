"use client";

import * as React from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import type { InsightReport } from "@/core/types/analysis";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { generateInsightsAction } from "@/server/actions/analysis";
import { InsightReportView } from "./report-view";
import { formatNumber } from "@/lib/format";

/**
 * Botão GERAR INSIGHTS.
 *
 * A geração é explícita (e não automática ao abrir a página) porque consome
 * cota e, com provider de LLM, custa dinheiro.
 */
export function InsightsGenerator({
  adIds,
  query,
}: {
  adIds: string[];
  query?: string | null;
}): React.ReactElement {
  const [report, setReport] = React.useState<InsightReport | null>(null);
  const [pending, startTransition] = React.useTransition();

  function generate(): void {
    startTransition(async () => {
      const result = await generateInsightsAction({ adIds, query });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setReport(result.data);
      toast.success("Relatório gerado.");
    });
  }

  if (report) return <InsightReportView report={report} />;

  return (
    <EmptyState
      icon={<Lightbulb />}
      title={`${formatNumber(adIds.length)} anúncios prontos para análise`}
      description="Vamos contar hooks, CTAs, ângulos, promessas, objeções, formatos e estruturas de copy do conjunto — e apontar o que ninguém está explorando."
      action={
        <Button variant="heat" size="lg" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Lightbulb />}
          GERAR INSIGHTS
        </Button>
      }
    />
  );
}
