import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Boxes, Layers, Lightbulb, Timer } from "lucide-react";
import { CTA_LABEL } from "@/core/constants/meta";
import { INSIGHT_DISCLAIMER } from "@/core/insights/aggregate";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceTag } from "@/components/ui/provenance";
import { AreaChart } from "@/components/charts/area-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { RankBars } from "@/components/charts/bar-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AdGrid } from "@/components/ads/ad-grid";
import { SaveButton } from "@/components/ads/save-button";
import { MonitorButton } from "@/components/ads/monitor-button";
import { requireSession } from "@/server/auth";
import { loadOfferProfile } from "@/server/services/profiles";
import { formatDays, formatNumber, formatPercent } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const profile = await loadOfferProfile(session, id);
  return { title: profile?.offer.name ?? "Oferta" };
}

export default async function OfferPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await requireSession();
  const profile = await loadOfferProfile(session, id);
  if (!profile) notFound();

  const { offer, ads, patterns } = profile;
  const { stats } = offer;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/offers">
          <ArrowLeft />
          Todas as ofertas
        </Link>
      </Button>

      <header className="aurora relative">
        <div className="aurora-layer" aria-hidden />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              <Boxes className="size-3.5" />
              Oferta
            </div>
            <h1 className="text-balance text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
              {offer.name}
            </h1>
            <Link
              href={`/advertisers/${offer.advertiserId}`}
              className="inline-flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
            >
              <Avatar
                src={offer.advertiserAvatarUrl}
                name={offer.advertiserName}
                className="size-6"
              />
              <span className="text-[13.5px] font-medium">{offer.advertiserName}</span>
            </Link>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <SaveButton
              kind="offer"
              entityId={offer.id}
              label={offer.name}
              variant="secondary"
              size="sm"
              showLabel
            />
            <MonitorButton
              target="offer"
              entityId={offer.id}
              label={offer.name}
              thumbnail={ads[0]?.creatives[0]?.thumbnailUrl ?? null}
              initiallyMonitored={profile.monitored}
              variant="secondary"
              size="sm"
              showLabel
            />
            <Button asChild variant="primary" size="sm">
              <Link href={`/insights?ads=${ads.slice(0, 24).map((ad) => ad.id).join(",")}`}>
                <Lightbulb />
                Gerar insights
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          label="Oferta ativa há"
          value={formatDays(stats.activeDays)}
          icon={<Timer />}
          accent="heat"
          hint="Do primeiro anúncio observado até o último sinal de atividade."
        />
        <StatsCard
          label="Criativos encontrados"
          value={stats.totalCreatives}
          icon={<Layers />}
          accent="brand"
          hint="Peças distintas somadas em todos os anúncios da oferta."
        />
        <StatsCard
          label="Anúncios"
          value={stats.totalAds}
          hint="Total de anúncios agrupados nesta oferta."
        />
        <StatsCard
          label="Ainda no ar"
          value={stats.activeAds}
          accent="ok"
          hint="Anúncios da oferta veiculando na última coleta."
        />
        <StatsCard
          label="Score da oferta"
          value={stats.score}
          accent="heat"
          hint="Média dos anúncios ponderada por tempo ativo, com bônus por volume simultâneo."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Anúncios no ar por mês</CardTitle>
                <CardDescription>
                  Persistência da oferta ao longo do tempo — o sinal mais forte que existe em dado
                  público.
                </CardDescription>
              </div>
              <ProvenanceTag provenance="derived" compact />
            </div>
          </CardHeader>
          <CardContent>
            <AreaChart data={profile.timeline} height={170} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Formatos</CardTitle>
            </CardHeader>
            <CardContent>
              <DonutChart data={profile.formatMix} size={110} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CTA mais utilizado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.topCallToAction ? (
                <Badge variant="brand" size="lg">
                  {CTA_LABEL[stats.topCallToAction]}
                </Badge>
              ) : (
                <p className="text-[13px] text-ink-faint">Nenhum CTA declarado na fonte.</p>
              )}
              <RankBars
                data={profile.ctaMix.map((item) => ({
                  label: CTA_LABEL[item.label as keyof typeof CTA_LABEL] ?? item.label,
                  value: item.value,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Padrões encontrados</CardTitle>
              <CardDescription>
                Contagem sobre os {formatNumber(ads.length)} anúncios da oferta. Cada linha é
                verificável nos anúncios listados abaixo.
              </CardDescription>
            </div>
            <ProvenanceTag
              provenance="derived"
              note="Contagem por regra sobre o texto e os criativos coletados. Nenhuma IA envolvida."
            />
          </div>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <p className="py-4 text-[13px] text-ink-faint">
              Nenhum padrão recorrente o suficiente para ser reportado (mínimo de 15% dos
              anúncios).
            </p>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {patterns.map((pattern) => (
                <li
                  key={pattern.label}
                  className="flex items-baseline gap-2.5 rounded-md border border-line bg-surface/50 px-3 py-2.5"
                >
                  <span className="tnum shrink-0 text-[15px] font-semibold text-heat">
                    {formatPercent(pattern.share)}
                  </span>
                  <span className="min-w-0 text-[13px] leading-snug text-ink-muted">
                    dos anúncios {pattern.label}
                    <span className="ml-1 text-ink-faint">({pattern.count})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-faint">
            {INSIGHT_DISCLAIMER}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-ink">
          Criativos da oferta ({formatNumber(ads.length)})
        </h2>
        <AdGrid ads={ads} />
      </section>
    </div>
  );
}
