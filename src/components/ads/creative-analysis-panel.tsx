"use client";

import * as React from "react";
import { Film, Image as ImageIcon, Loader2, ScanEye } from "lucide-react";
import type { CreativeAnalysis } from "@/core/types/analysis";
import type { Creative } from "@/core/types/creative";
import { FORMAT_LABEL } from "@/core/constants/meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EvidenceRow } from "@/components/ui/provenance";
import { toast } from "@/components/ui/toast";
import { analyzeCreativesAction } from "@/server/actions/analysis";
import { CreativePreview } from "./creative-preview";
import { formatDuration } from "@/lib/format";

const YES_NO = (value: boolean | null): string =>
  value === null ? "—" : value ? "Sim" : "Não";

export function CreativeAnalysisPanel({
  adId,
  creatives,
  initial,
}: {
  adId: string;
  creatives: Creative[];
  initial: CreativeAnalysis[];
}): React.ReactElement {
  const [analyses, setAnalyses] = React.useState<CreativeAnalysis[]>(initial);
  const [pending, startTransition] = React.useTransition();

  function run(force = false): void {
    startTransition(async () => {
      const result = await analyzeCreativesAction(adId, { force });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAnalyses(result.data);
      toast.success("Criativos analisados.");
    });
  }

  if (analyses.length === 0) {
    return (
      <EmptyState
        icon={<ScanEye />}
        title="Analisar criativos"
        description="Extraímos proporção, duração, formato e estrutura visual do que a fonte fornece. Reconhecimento de pessoa, produto e legenda exige um provider de IA com visão."
        action={
          <Button variant="primary" onClick={() => run()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <ScanEye />}
            Analisar criativos
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="neutral" size="sm">
          {analyses.length} criativo(s) analisado(s)
        </Badge>
        <Button variant="ghost" size="sm" onClick={() => run(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Refazer
        </Button>
      </div>

      {analyses.map((analysis) => {
        const creative = creatives.find((item) => item.id === analysis.creativeId);
        return (
          <div key={analysis.id} className="panel overflow-hidden">
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              {creative ? (
                <div className="w-full shrink-0 overflow-hidden rounded-lg border border-line sm:w-40">
                  <CreativePreview
                    creatives={[creative]}
                    alt={`Criativo ${creative.position + 1}`}
                    aspect="1/1"
                    showBadges={false}
                  />
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant="brand" size="sm">
                    {analysis.format === "video" ? (
                      <Film />
                    ) : (
                      <ImageIcon />
                    )}
                    {FORMAT_LABEL[analysis.format]}
                  </Badge>
                  {analysis.durationSeconds.value != null ? (
                    <Badge variant="outline" size="sm">
                      {formatDuration(analysis.durationSeconds.value)}
                    </Badge>
                  ) : null}
                  {creative ? (
                    <Badge variant="outline" size="sm">
                      {creative.width}×{creative.height}
                    </Badge>
                  ) : null}
                </div>

                <div className="-my-1">
                  <EvidenceRow label="Proporção" evidence={analysis.aspectRatio} />
                  <EvidenceRow
                    label="Estrutura visual"
                    evidence={analysis.visualStructure}
                    render={(values) => (
                      <div className="flex flex-wrap gap-1">
                        {values.map((value) => (
                          <Badge key={value} variant="outline" size="sm">
                            {value}
                          </Badge>
                        ))}
                      </div>
                    )}
                  />
                  <EvidenceRow label="Título no card" evidence={analysis.visualHeadline} />
                  <EvidenceRow label="CTA visual" evidence={analysis.visualCta} />
                  <EvidenceRow
                    label="Pessoa na peça"
                    evidence={analysis.hasPerson}
                    render={YES_NO}
                  />
                  <EvidenceRow
                    label="Texto na imagem"
                    evidence={analysis.hasOnScreenText}
                    render={YES_NO}
                  />
                  <EvidenceRow label="Legendas" evidence={analysis.hasCaptions} render={YES_NO} />
                  <EvidenceRow label="Produto visível" evidence={analysis.hasProduct} render={YES_NO} />
                  <EvidenceRow label="Densidade de texto" evidence={analysis.textDensity} />
                  {analysis.format === "video" ? (
                    <EvidenceRow label="Primeiros segundos" evidence={analysis.openingBeats} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
