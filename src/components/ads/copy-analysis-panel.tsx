"use client";

import * as React from "react";
import { Loader2, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import type { CopyAnalysis } from "@/core/types/analysis";
import { EMOTION_LABEL, HOOK_LABEL } from "@/core/types/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EvidenceRow, ProvenanceTag } from "@/components/ui/provenance";
import { toast } from "@/components/ui/toast";
import { analyzeCopyAction } from "@/server/actions/analysis";
import { formatPercent } from "@/lib/format";

/**
 * Painel de análise de copy.
 *
 * Cada linha carrega seu selo de proveniência. O bloco de métricas fica
 * separado justamente porque é contagem — não interpretação.
 */
export function CopyAnalysisPanel({
  adId,
  initial,
}: {
  adId: string;
  initial: CopyAnalysis | null;
}): React.ReactElement {
  const [analysis, setAnalysis] = React.useState<CopyAnalysis | null>(initial);
  const [pending, startTransition] = React.useTransition();

  function run(force = false): void {
    startTransition(async () => {
      const result = await analyzeCopyAction(adId, { force });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAnalysis(result.data);
      toast.success(force ? "Análise refeita." : "Análise concluída.");
    });
  }

  if (!analysis) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Analisar copy deste anúncio"
        description="Extraímos gancho, dor, mecanismo, promessa, provas, objeções e CTA — separando o que está escrito do que é interpretação."
        action={
          <Button variant="primary" onClick={() => run()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            ANALISAR COPY
          </Button>
        }
      />
    );
  }

  const { metrics } = analysis;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="neutral" size="sm">
            Motor: {analysis.engine}
          </Badge>
          {analysis.engine.startsWith("heuristic") ? (
            <Badge variant="info" size="sm">
              Sem IA · regras determinísticas
            </Badge>
          ) : (
            <Badge variant="heat" size="sm">
              Com IA
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => run(true)} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Refazer
        </Button>
      </div>

      <div className="panel px-4 py-1">
        <EvidenceRow label="Hook" evidence={analysis.hook} />
        <EvidenceRow
          label="Tipo de hook"
          evidence={analysis.hookType}
          render={(value) => <Badge variant="brand">{HOOK_LABEL[value]}</Badge>}
        />
        <EvidenceRow label="Problema" evidence={analysis.problem} />
        <EvidenceRow label="Promessa" evidence={analysis.promise} />
        <EvidenceRow label="Mecanismo" evidence={analysis.mechanism} />
        <EvidenceRow
          label="Benefícios"
          evidence={analysis.benefits}
          render={(values) => (
            <ul className="list-inside list-disc space-y-1">
              {values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          )}
        />
        <EvidenceRow
          label="Provas"
          evidence={analysis.proof}
          render={(values) => (
            <ul className="list-inside list-disc space-y-1">
              {values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          )}
        />
        <EvidenceRow
          label="Objeções"
          evidence={analysis.objections}
          render={(values) => (
            <ul className="list-inside list-disc space-y-1">
              {values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          )}
        />
        <EvidenceRow label="CTA" evidence={analysis.cta} />
        <EvidenceRow
          label="Especificidade"
          evidence={analysis.specificity}
          render={(value) => (
            <span className="flex items-center gap-2">
              <span className="tnum">{formatPercent(value)}</span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${value * 100}%` }}
                />
              </span>
            </span>
          )}
        />
        <EvidenceRow
          label="Estrutura"
          evidence={analysis.structure}
          render={(values) => (
            <div className="flex flex-wrap items-center gap-1">
              {values.map((step, index) => (
                <React.Fragment key={`${step}-${index}`}>
                  <Badge variant="outline" size="sm">
                    {step}
                  </Badge>
                  {index < values.length - 1 ? (
                    <span className="text-ink-faint">→</span>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          )}
        />
        <EvidenceRow
          label="Emoções"
          evidence={analysis.emotions}
          render={(values) => (
            <div className="flex flex-wrap gap-1">
              {values.map((emotion) => (
                <Badge key={emotion} variant="heat" size="sm">
                  {EMOTION_LABEL[emotion]}
                </Badge>
              ))}
            </div>
          )}
        />
      </div>

      <div className="panel p-4">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-[13px] font-semibold text-ink">Métricas do texto</h3>
          <ProvenanceTag provenance="derived" note="Contagem direta sobre o texto do anúncio." />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
          <Metric label="Caracteres" value={metrics.charCount} />
          <Metric label="Palavras" value={metrics.wordCount} />
          <Metric label="Frases" value={metrics.sentenceCount} />
          <Metric label="Emojis" value={metrics.emojiCount} />
          <Metric label="Perguntas" value={metrics.questionCount} />
          <Metric label="Exclamações" value={metrics.exclamationCount} />
          <Metric label="Números" value={metrics.numberCount} />
          <Metric label="Legibilidade" value={metrics.readability} suffix="/100" />
        </dl>
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {metrics.hasWhatsappMention ? <Badge variant="ok" size="sm">Menciona WhatsApp</Badge> : null}
          {metrics.hasPriceMention ? <Badge variant="ok" size="sm">Cita preço</Badge> : null}
          {metrics.hasUrgencyWindow ? <Badge variant="warn" size="sm">Janela de urgência</Badge> : null}
          {metrics.uppercaseWordCount > 0 ? (
            <Badge variant="neutral" size="sm">
              {metrics.uppercaseWordCount} palavra(s) em caixa alta
            </Badge>
          ) : null}
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-md border border-line bg-surface/50 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-faint">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" />
        <span>
          Os campos marcados como <strong className="text-heat">Inferência</strong> são leitura
          automática do texto e podem estar errados. Os marcados como{" "}
          <strong className="text-ok">Dado observado</strong> vieram literalmente do anúncio.
        </span>
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}): React.ReactElement {
  return (
    <div>
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd className="tnum text-[15px] font-medium text-ink">
        {value}
        {suffix ? <span className="text-[11px] text-ink-faint">{suffix}</span> : null}
      </dd>
    </div>
  );
}
