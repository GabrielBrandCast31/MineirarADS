import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Calendar,
  ExternalLink,
  Globe,
  Layers,
  Signal,
  Timer,
} from "lucide-react";
import { adLibraryPageUrlFor, COUNTRY_LABEL } from "@/core/constants/meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AdGrid } from "@/components/ads/ad-grid";
import { OfferCard } from "@/components/offers/offer-card";
import { SaveButton } from "@/components/ads/save-button";
import { MonitorButton } from "@/components/ads/monitor-button";
import { requireSession } from "@/server/auth";
import { loadAdvertiserProfile } from "@/server/services/profiles";
import { formatDate, formatDays, formatNumber } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const profile = await loadAdvertiserProfile(session, id);
  return { title: profile?.advertiser.name ?? "Anunciante" };
}

export default async function AdvertiserPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await requireSession();
  const profile = await loadAdvertiserProfile(session, id);
  if (!profile) notFound();

  const { advertiser, ads, offers } = profile;
  const activeAds = ads.filter((ad) => ad.status === "active");
  const historicalAds = ads.filter((ad) => ad.status !== "active");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/advertisers">
          <ArrowLeft />
          Todos os anunciantes
        </Link>
      </Button>

      <header className="aurora relative">
        <div className="aurora-layer" aria-hidden />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <Avatar
              src={advertiser.avatarUrl}
              name={advertiser.name}
              className="size-16 rounded-2xl"
            />
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink">
                  {advertiser.name}
                </h1>
                {advertiser.verified ? (
                  <BadgeCheck className="size-4 shrink-0 text-info" aria-label="Verificada" />
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {advertiser.category ? (
                  <Badge variant="brand" size="sm">
                    {advertiser.category}
                  </Badge>
                ) : null}
                {advertiser.country ? (
                  <Badge variant="outline" size="sm">
                    <Globe />
                    {COUNTRY_LABEL[advertiser.country] ?? advertiser.country}
                  </Badge>
                ) : null}
                {advertiser.metaPageId ? (
                  <Badge variant="neutral" size="sm">
                    page_id {advertiser.metaPageId}
                  </Badge>
                ) : null}
              </div>
              {advertiser.websiteUrl ? (
                <a
                  href={advertiser.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] text-brand-hi hover:underline"
                >
                  {advertiser.websiteUrl.replace(/^https?:\/\//, "")}
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <SaveButton
              kind="advertiser"
              entityId={advertiser.id}
              label={advertiser.name}
              variant="secondary"
              size="sm"
              showLabel
            />
            <MonitorButton
              target="advertiser"
              entityId={advertiser.id}
              label={advertiser.name}
              thumbnail={advertiser.avatarUrl}
              initiallyMonitored={profile.monitored}
              variant="secondary"
              size="sm"
              showLabel
            />
            {advertiser.metaPageId ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={adLibraryPageUrlFor(advertiser.metaPageId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Ad Library
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard
          label="Anúncios ativos"
          value={activeAds.length}
          icon={<Signal />}
          accent="ok"
          hint="Ainda veiculando na última coleta."
        />
        <StatsCard
          label="Histórico"
          value={historicalAds.length}
          icon={<Calendar />}
          hint="Anúncios já encerrados que foram observados."
        />
        <StatsCard
          label="Ofertas"
          value={offers.length}
          icon={<Boxes />}
          accent="brand"
          hint="Agrupamentos distintos de promessa comercial."
        />
        <StatsCard
          label="Criativos"
          value={advertiser.stats.totalCreatives}
          icon={<Layers />}
          accent="info"
          hint="Peças distintas somadas em todos os anúncios."
        />
        <StatsCard
          label="Tempo médio no ar"
          value={formatDays(advertiser.stats.avgActiveDays)}
          icon={<Timer />}
          accent="heat"
          hint="Média de dias de veiculação entre todos os anúncios observados."
        />
        <StatsCard
          label="Recorde de veiculação"
          value={formatDays(advertiser.stats.maxActiveDays)}
          icon={<Timer />}
          accent="heat"
          hint="Maior tempo contínuo observado em um único anúncio."
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Anúncios no ar por mês</CardTitle>
            <CardDescription>
              Reconstruído a partir das janelas de veiculação observadas. A fonte não fornece
              histórico diário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart data={profile.activeOverTime} height={170} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por formato</CardTitle>
            <CardDescription>Todos os anúncios observados.</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={profile.formatMix}
              size={120}
              centerValue={formatNumber(ads.length)}
              centerLabel="anúncios"
            />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Criativos novos por mês</CardTitle>
          <CardDescription>
            Volume de peças lançadas — indica ritmo de produção criativa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={profile.creativesOverTime} height={130} valueLabel="criativos" />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Primeiro anúncio encontrado
          </p>
          <p className="text-[14px] font-medium text-ink">
            {profile.firstAdAt ? formatDate(profile.firstAdAt) : "—"}
          </p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Último sinal observado
          </p>
          <p className="text-[14px] font-medium text-ink">
            {profile.lastAdAt ? formatDate(profile.lastAdAt) : "—"}
          </p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Melhor Ad Score
          </p>
          <p className="text-[14px] font-medium text-ink">
            {ads.length ? Math.max(...ads.map((ad) => ad.score.value)) : "—"}
          </p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
            Média de Ad Score
          </p>
          <p className="text-[14px] font-medium text-ink">
            {ads.length
              ? Math.round(ads.reduce((sum, ad) => sum + ad.score.value, 0) / ads.length)
              : "—"}
          </p>
        </div>
      </div>

      <Tabs defaultValue="offers">
        <TabsList>
          <TabsTrigger value="offers">Ofertas ({offers.length})</TabsTrigger>
          <TabsTrigger value="active">Ativos ({activeAds.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico ({historicalAds.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="offers">
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active">
          <AdGrid
            ads={activeAds}
            emptyTitle="Nenhum anúncio ativo"
            emptyDescription="Todos os anúncios observados desta página já saíram do ar."
          />
        </TabsContent>

        <TabsContent value="history">
          <AdGrid
            ads={historicalAds}
            emptyTitle="Sem histórico"
            emptyDescription="Nenhum anúncio encerrado foi observado ainda."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
