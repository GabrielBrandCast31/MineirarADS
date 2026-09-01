import * as React from "react";
import { Lightbulb } from "lucide-react";
import type { InsightItem, InsightReport } from "@/core/types/analysis";
import { INSIGHT_DISCLAIMER } from "@/core/insights/aggregate";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceTag } from "@/components/ui/provenance";
import { RankBars } from "@/components/charts/bar-chart";
import { formatNumber, formatPercent } from "@/lib/format";

const SECTIONS: Array<{ key: keyof InsightReport; title: string; description: string }> = [
  { key: "hooks", title: "Hooks mais utilizados", description: "Tipo de abertura predominante." },
  { key: "ctas", title: "CTAs mais utilizados", description: "Botões declarados na fonte." },
  { key: "angles", title: "Ângulos predominantes", description: "Direção da argumentação." },
  { key: "promises", title: "Promessas", description: "Termos recorrentes nas promessas." },
  { key: "objections", title: "Objeções exploradas", description: "Expressões que quebram objeção." },
  { key: "formats", title: "Formatos predominantes", description: "Distribuição de mídia." },
  { key: "copyStructures", title: "Estruturas de copy", description: "Sequência narrativa mais comum." },
  { key: "visualPatterns", title: "Padrões visuais", description: "Proporções e durações observadas." },
];

export function InsightReportView({ report }: { report: InsightReport }): React.ReactElement {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-3.5 text-heat" />
                Leitura do conjunto
              </CardTitle>
              <CardDescription>
                {formatNumber(report.sampleSize)} anúncios analisados · motor {report.engine}
              </CardDescription>
            </div>
            <ProvenanceTag provenance="derived" note="Percentuais são contagem sobre a amostra." />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="space-y-2.5">
            {report.headlines.map((headline, index) => (
              <li key={index} className="flex items-start gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                <p className="text-[13.5px] leading-relaxed text-ink-muted">{headline.value}</p>
                <ProvenanceTag
                  compact
                  provenance={headline.provenance}
                  confidence={headline.confidence}
                  source={headline.source}
                />
              </li>
            ))}
          </ul>
          <p className="border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-faint">
            {INSIGHT_DISCLAIMER}
          </p>
        </CardContent>
      </Card>

      {report.opportunities.length > 0 ? (
        <Card className="border-heat/25">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Oportunidades</CardTitle>
                <CardDescription>
                  Ângulos pouco explorados por este conjunto de concorrentes.
                </CardDescription>
              </div>
              <ProvenanceTag
                provenance="inferred"
                note="Juízo automático sobre lacunas. Não é garantia de resultado."
              />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.opportunities.map((opportunity, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-md border border-heat/20 bg-heat/6 px-3 py-2.5"
                >
                  <span className="tnum mt-0.5 shrink-0 text-[11px] font-semibold text-heat">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[13px] leading-relaxed text-ink-muted">
                      {opportunity.value}
                    </p>
                    {opportunity.confidence != null ? (
                      <p className="text-[11px] text-ink-faint">
                        Confiança estimada: {formatPercent(opportunity.confidence)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((section) => {
          const items = report[section.key] as InsightItem[];
          if (!Array.isArray(items) || items.length === 0) return null;
          return (
            <Card key={String(section.key)}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <RankBars
                  data={items.map((item) => ({ label: item.label, value: item.count }))}
                />
                <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {items.slice(0, 3).map((item) =>
                    item.examples.length > 0 ? (
                      <p key={item.label} className="text-[11.5px] leading-relaxed text-ink-faint">
                        <Badge variant="outline" size="sm" className="mr-1.5">
                          {formatPercent(item.share)}
                        </Badge>
                        “{item.examples[0]}”
                      </p>
                    ) : null,
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
