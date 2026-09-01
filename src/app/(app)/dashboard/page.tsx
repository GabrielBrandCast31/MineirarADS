import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bookmark,
  Boxes,
  Building2,
  Flame,
  LayoutDashboard,
  Pickaxe,
  Radar,
  Sparkles,
} from "lucide-react";
import { MONITORING_EVENT_LABEL } from "@/core/types/monitoring";
import { FORMAT_LABEL } from "@/core/constants/meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { AreaChart } from "@/components/charts/area-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { AdCard } from "@/components/ads/ad-card";
import { OfferCard } from "@/components/offers/offer-card";
import { AdvertiserCard } from "@/components/advertisers/advertiser-card";
import { requireSession } from "@/server/auth";
import { loadDashboard } from "@/server/services/dashboard";
import { formatNumber, formatRelative } from "@/lib/format";
import { scoreColor } from "@/components/charts/palette";

export const metadata: Metadata = { title: "Dashboard" };

const METRIC_ICONS: Record<string, React.ReactNode> = {
  found: <Pickaxe />,
  active: <Activity />,
  monitored: <Radar />,
  opportunities: <Flame />,
  advertisers: <Building2 />,
  saved: <Bookmark />,
};

const METRIC_ACCENTS: Record<string, "brand" | "heat" | "ok" | "info"> = {
  found: "brand",
  active: "ok",
  monitored: "info",
  opportunities: "heat",
  advertisers: "brand",
  saved: "info",
};

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const data = await loadDashboard(session);

  const firstName = (session.user.name ?? session.user.email).split(/[\s@]/)[0];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow={
          <>
            <LayoutDashboard className="size-3.5" />
            Visão geral
          </>
        }
        title={`Olá, ${firstName}`}
        description="O panorama do que você já minerou, o que segue no ar e onde estão as oportunidades."
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/library">
                <Bookmark />
                Biblioteca
              </Link>
            </Button>
            <Button asChild variant="heat">
              <Link href="/mine">
                <Pickaxe />
                Minerar agora
              </Link>
            </Button>
          </>
        }
      />

      <section
        aria-label="Métricas principais"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {data.metrics.map((metric) => (
          <StatsCard
            key={metric.key}
            label={metric.label}
            value={metric.value}
            hint={metric.hint}
            icon={METRIC_ICONS[metric.key]}
            accent={METRIC_ACCENTS[metric.key] ?? "brand"}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Anúncios que entraram no ar</CardTitle>
                <CardDescription>
                  Contagem por semana, pela data de início de veiculação observada.
                </CardDescription>
              </div>
              <Badge variant="info" size="sm">
                Cálculo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <AreaChart data={data.discoveryTrend} height={180} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Ad Score</CardTitle>
            <CardDescription>Da amostra mais recente coletada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <BarChart
              data={data.scoreDistribution.map((item) => ({
                ...item,
                color: scoreColor(
                  item.label === "85–100" ? 90 : item.label === "65–84" ? 70 : item.label === "40–64" ? 50 : 20,
                ),
              }))}
              height={120}
            />
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Mix de formatos
              </p>
              <DonutChart
                data={data.formatMix.map((item) => ({
                  label: FORMAT_LABEL[item.label as keyof typeof FORMAT_LABEL] ?? item.label,
                  value: item.value,
                }))}
                size={112}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Section
        title="Top anúncios por Ad Score"
        description="Persistência e volume de criativos acima da média. Não é métrica de performance."
        href="/mine?sort=score"
        icon={<Flame className="size-3.5 text-heat" />}
      >
        {data.topAds.length === 0 ? (
          <EmptyState
            icon={<Pickaxe />}
            title="Nenhum anúncio minerado ainda"
            description="Faça sua primeira mineração para popular o dashboard."
            action={
              <Button asChild variant="heat">
                <Link href="/mine">Minerar anúncios</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {data.topAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="Ofertas em destaque"
          description="Agrupamentos com mais criativos e mais tempo de atividade."
          href="/offers"
          icon={<Boxes className="size-3.5 text-brand-hi" />}
        >
          <div className="grid gap-3">
            {data.topOffers.slice(0, 4).map((offer) => (
              <OfferCard key={offer.id} offer={offer} compact />
            ))}
          </div>
        </Section>

        <Section
          title="Anunciantes ativos"
          description="Páginas com maior volume de anúncios no ar."
          href="/advertisers"
          icon={<Building2 className="size-3.5 text-info" />}
        >
          <div className="grid gap-3">
            {data.activeAdvertisers.slice(0, 4).map((advertiser) => (
              <AdvertiserCard key={advertiser.id} advertiser={advertiser} compact />
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-3.5 text-info" />
              Eventos de monitoramento
            </CardTitle>
            <CardDescription>Diferenças detectadas entre snapshots.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentEvents.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                Nenhum evento ainda. Monitore uma oferta ou página para receber alertas.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recentEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-3 py-3">
                    <span
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
                        event.severity === "positive"
                          ? "bg-ok"
                          : event.severity === "warning"
                            ? "bg-warn"
                            : "bg-info"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{event.title}</p>
                      <p className="line-clamp-2 text-[12px] leading-relaxed text-ink-faint">
                        {event.description}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1 text-right">
                      <Badge variant="outline" size="sm">
                        {MONITORING_EVENT_LABEL[event.type]}
                      </Badge>
                      <p className="text-[11px] text-ink-faint">
                        {formatRelative(event.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-heat" />
              Últimas descobertas
            </CardTitle>
            <CardDescription>Anúncios mais recentes no seu catálogo.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-line">
              {data.latestDiscoveries.map((ad) => (
                <li key={ad.id} className="py-2.5">
                  <Link
                    href={`/ads/${ad.id}`}
                    className="flex items-center gap-3 rounded-md transition-colors hover:bg-surface/60"
                  >
                    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-surface-2 text-[10px] text-ink-faint">
                      {ad.creatives[0]?.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ad.creatives[0].thumbnailUrl}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        FORMAT_LABEL[ad.format].slice(0, 3)
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">
                        {ad.headline ?? ad.advertiserName}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-faint">
                        {ad.advertiserName} · {formatNumber(ad.activeDays)} dias no ar
                      </span>
                    </span>
                    <Badge variant="neutral" size="sm">
                      {ad.score.value}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  href,
  icon,
  children,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
            {icon}
            {title}
          </h2>
          <p className="text-[12.5px] text-ink-faint">{description}</p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>
            Ver tudo
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
      {children}
    </section>
  );
}
