import * as React from "react";
import Link from "next/link";
import type { AdEnriched } from "@/core/types/ad";
import type { CopyAnalysis } from "@/core/types/analysis";
import { EMOTION_LABEL, HOOK_LABEL } from "@/core/types/analysis";
import { CTA_LABEL, FORMAT_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "@/core/constants/meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/ads/ad-score";
import { CreativePreview } from "@/components/ads/creative-preview";
import { cn } from "@/lib/utils";
import { formatDate, formatDays, formatDuration, formatNumber } from "@/lib/format";

interface CompareRow {
  label: string;
  /** Origem do dado — a coluna inteira compartilha a mesma proveniência. */
  kind: "observed" | "derived" | "inferred";
  render: (ad: AdEnriched, analysis: CopyAnalysis | undefined) => React.ReactNode;
  /** Destaca a célula com o melhor valor, quando faz sentido comparar. */
  best?: (ad: AdEnriched) => number;
}

const ROWS: CompareRow[] = [
  {
    label: "Ad Score",
    kind: "derived",
    render: (ad) => <ScoreBadge score={ad.score} />,
    best: (ad) => ad.score.value,
  },
  {
    label: "Dias ativo",
    kind: "observed",
    render: (ad) => <span className="tnum">{formatDays(ad.activeDays)}</span>,
    best: (ad) => ad.activeDays,
  },
  { label: "Status", kind: "observed", render: (ad) => STATUS_LABEL[ad.status] },
  { label: "Início", kind: "observed", render: (ad) => formatDate(ad.startedAt) },
  { label: "Formato", kind: "observed", render: (ad) => FORMAT_LABEL[ad.format] },
  {
    label: "Duração do vídeo",
    kind: "observed",
    render: (ad) => {
      const seconds = ad.creatives.find((creative) => creative.durationSeconds)?.durationSeconds;
      return seconds ? formatDuration(seconds) : "—";
    },
  },
  {
    label: "Criativos",
    kind: "observed",
    render: (ad) => <span className="tnum">{formatNumber(ad.creatives.length)}</span>,
    best: (ad) => ad.creatives.length,
  },
  {
    label: "Plataformas",
    kind: "observed",
    render: (ad) => ad.platforms.map((platform) => PLATFORM_LABEL[platform]).join(", ") || "—",
  },
  {
    label: "CTA",
    kind: "observed",
    render: (ad) => (ad.callToAction ? CTA_LABEL[ad.callToAction] : "—"),
  },
  {
    label: "Oferta",
    kind: "derived",
    render: (ad) =>
      ad.offerId ? (
        <Link href={`/offers/${ad.offerId}`} className="text-brand-hi hover:underline">
          {ad.offerName ?? "Ver oferta"}
        </Link>
      ) : (
        "—"
      ),
  },
  {
    label: "Hook",
    kind: "inferred",
    render: (_ad, analysis) => analysis?.hook.value ?? "Ainda não analisado",
  },
  {
    label: "Tipo de hook",
    kind: "inferred",
    render: (_ad, analysis) =>
      analysis ? <Badge variant="brand" size="sm">{HOOK_LABEL[analysis.hookType.value]}</Badge> : "—",
  },
  {
    label: "Emoção dominante",
    kind: "inferred",
    render: (_ad, analysis) =>
      analysis?.dominantEmotion.value ? EMOTION_LABEL[analysis.dominantEmotion.value] : "—",
  },
  {
    label: "Estrutura",
    kind: "inferred",
    render: (_ad, analysis) =>
      analysis ? (
        <span className="text-[12px] text-ink-faint">
          {analysis.structure.value.slice(0, 5).join(" → ") || "—"}
        </span>
      ) : (
        "—"
      ),
  },
  {
    label: "Palavras na copy",
    kind: "derived",
    render: (_ad, analysis) =>
      analysis ? <span className="tnum">{formatNumber(analysis.metrics.wordCount)}</span> : "—",
  },
];

const KIND_STYLE: Record<CompareRow["kind"], string> = {
  observed: "text-ok",
  derived: "text-info",
  inferred: "text-heat",
};

const KIND_LABEL: Record<CompareRow["kind"], string> = {
  observed: "observado",
  derived: "cálculo",
  inferred: "inferência",
};

/**
 * Tabela de comparação.
 *
 * Cada linha declara sua proveniência: o usuário precisa ver, sem esforço, que
 * "dias ativo" é fato e "emoção dominante" é leitura automática.
 */
export function CompareTable({
  ads,
  analyses,
}: {
  ads: AdEnriched[];
  analyses: CopyAnalysis[];
}): React.ReactElement {
  const byAd = new Map(analyses.map((analysis) => [analysis.adId, analysis]));

  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line">
            <th className="sticky left-0 z-10 w-40 bg-surface px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
              Critério
            </th>
            {ads.map((ad) => (
              <th key={ad.id} className="min-w-[220px] px-4 py-3 text-left align-top">
                <div className="space-y-2">
                  <div className="w-24 overflow-hidden rounded-lg border border-line">
                    <CreativePreview
                      creatives={ad.creatives}
                      alt={ad.headline ?? ad.advertiserName}
                      aspect="1/1"
                      showBadges={false}
                    />
                  </div>
                  <Link
                    href={`/ads/${ad.id}`}
                    className="block text-[13px] font-medium text-ink hover:underline"
                  >
                    {ad.headline ?? "Sem título"}
                  </Link>
                  <span className="flex items-center gap-1.5 text-[11.5px] font-normal text-ink-faint">
                    <Avatar
                      src={ad.advertiserAvatarUrl}
                      name={ad.advertiserName}
                      className="size-4"
                    />
                    {ad.advertiserName}
                  </span>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {ROWS.map((row) => {
            const best = row.best
              ? Math.max(...ads.map((ad) => row.best!(ad)))
              : null;

            return (
              <tr key={row.label} className="border-b border-line last:border-0">
                <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left align-top font-medium text-ink-muted">
                  <span className="block">{row.label}</span>
                  <span className={cn("text-[10px] font-normal", KIND_STYLE[row.kind])}>
                    {KIND_LABEL[row.kind]}
                  </span>
                </th>
                {ads.map((ad) => {
                  const isBest =
                    row.best && best !== null && row.best(ad) === best && ads.length > 1;
                  return (
                    <td
                      key={ad.id}
                      className={cn(
                        "px-4 py-3 align-top text-ink-muted",
                        isBest && "bg-brand/6 text-ink",
                      )}
                    >
                      {row.render(ad, byAd.get(ad.id))}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          <tr>
            <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left align-top font-medium text-ink-muted">
              <span className="block">Copy</span>
              <span className="text-[10px] font-normal text-ok">observado</span>
            </th>
            {ads.map((ad) => (
              <td key={ad.id} className="px-4 py-3 align-top">
                <p className="line-clamp-[12] whitespace-pre-line text-[12.5px] leading-relaxed text-ink-faint">
                  {ad.bodyText ?? "—"}
                </p>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
