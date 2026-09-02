import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Radar } from "lucide-react";
import { MONITOR_FREQUENCY_LABEL, MONITOR_TARGET_LABEL, MONITORING_EVENT_LABEL } from "@/core/types/monitoring";
import { adLibraryPageUrlFor } from "@/core/constants/meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Timeline } from "@/components/monitoring/timeline";
import { MonitorActions } from "@/components/monitoring/monitor-actions";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatDateShort, formatRelative } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requireSession();
  const monitor = await getRepositories().monitoring.getMonitor(session, id);
  return { title: monitor ? `Monitorando ${monitor.entityLabel}` : "Monitoramento" };
}

/** Rota do alvo monitorado, conforme o tipo. */
function targetHref(target: string, entityId: string): string {
  if (target === "offer") return `/offers/${entityId}`;
  if (target === "advertiser") return `/advertisers/${entityId}`;
  return `/ads/${entityId}`;
}

export default async function MonitorPage({ params }: PageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const session = await requireSession();
  const repositories = getRepositories();

  const monitor = await repositories.monitoring.getMonitor(session, id);
  if (!monitor) notFound();

  const [snapshots, events, advertiser] = await Promise.all([
    repositories.monitoring.listSnapshots(session, monitor.id, 60),
    repositories.monitoring.listEvents(session, { monitorId: monitor.id, limit: 40 }),
    monitor.target === "advertiser"
      ? repositories.catalog.getAdvertiser(session, monitor.entityId)
      : Promise.resolve(null),
  ]);

  // A página pública da Biblioteca é a fonte deste monitoramento; deixá-la a um
  // clique é o que permite conferir na mão o que a coleta afirma.
  const libraryUrl = advertiser?.metaPageId
    ? adLibraryPageUrlFor(advertiser.metaPageId, advertiser.country ?? "BR")
    : null;

  const latest = snapshots.at(-1);
  const first = snapshots[0];
  const growth = latest && first ? latest.adCount - first.adCount : 0;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/monitoring">
          <ArrowLeft />
          Monitoramentos
        </Link>
      </Button>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
            <Radar className="size-3.5" />
            {MONITOR_TARGET_LABEL[monitor.target]}
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink">
            {monitor.entityLabel}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={monitor.active ? "ok" : "neutral"} size="sm">
              {monitor.active ? "Ativo" : "Pausado"}
            </Badge>
            <Badge variant="outline" size="sm">
              {MONITOR_FREQUENCY_LABEL[monitor.frequency]}
            </Badge>
            <Badge variant="neutral" size="sm">
              {monitor.lastCheckedAt
                ? `Verificado ${formatRelative(monitor.lastCheckedAt)}`
                : "Nunca verificado"}
            </Badge>
            {monitor.active && monitor.nextCheckAt ? (
              <Badge variant="neutral" size="sm">
                Próxima coleta {formatRelative(monitor.nextCheckAt)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={targetHref(monitor.target, monitor.entityId)}>Abrir alvo</Link>
          </Button>
          {libraryUrl ? (
            <Button asChild variant="outline" size="sm">
              <a href={libraryUrl} target="_blank" rel="noreferrer noopener">
                Biblioteca de Anúncios
                <ExternalLink />
              </a>
            </Button>
          ) : null}
          <MonitorActions monitorId={monitor.id} />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Anúncios agora"
          value={latest?.adCount ?? 0}
          accent="brand"
          hint="Contagem no snapshot mais recente."
        />
        <StatsCard
          label="Ativos agora"
          value={latest?.activeAdCount ?? 0}
          accent="ok"
          hint="Quantos desses ainda estavam veiculando."
        />
        <StatsCard
          label="Criativos"
          value={latest?.creativeCount ?? 0}
          accent="info"
          hint="Peças distintas observadas no alvo."
        />
        <StatsCard
          label="Variação no período"
          value={growth > 0 ? `+${growth}` : String(growth)}
          accent={growth >= 0 ? "ok" : "heat"}
          hint="Diferença entre o primeiro e o último snapshot registrados."
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Evolução do volume</CardTitle>
          <CardDescription>Um ponto por coleta realizada.</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart
            data={snapshots.map((snapshot) => ({
              label: formatDateShort(snapshot.capturedAt),
              value: snapshot.adCount,
            }))}
            height={180}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
            <CardDescription>Cada ponto é uma coleta, com o delta da anterior.</CardDescription>
          </CardHeader>
          <CardContent>
            <Timeline snapshots={snapshots} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos detectados</CardTitle>
            <CardDescription>
              Gerados automaticamente pela comparação entre snapshots consecutivos.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {events.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                Nenhuma mudança detectada até agora.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {events.map((event) => (
                  <li key={event.id} className="py-3">
                    <div className="flex items-start gap-2.5">
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
                        <p className="text-[13px] font-medium text-ink">{event.title}</p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-faint">
                          {event.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Badge variant="outline" size="sm">
                            {MONITORING_EVENT_LABEL[event.type]}
                          </Badge>
                          <span className="text-[11px] text-ink-faint">
                            {formatRelative(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
