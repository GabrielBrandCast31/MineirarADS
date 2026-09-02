import type { Metadata } from "next";
import Link from "next/link";
import { Radar } from "lucide-react";
import { MONITORING_EVENT_LABEL, isMonitorDue } from "@/core/types/monitoring";
import { adLibraryPageUrlFor } from "@/core/constants/meta";
import { planHasFeature } from "@/core/constants/plans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { MonitoringCard } from "@/components/monitoring/monitor-card";
import { DueSweep } from "@/components/monitoring/due-sweep";
import { WatchLinkForm } from "@/components/monitoring/watch-link-form";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatNumber, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Monitoramento" };

export default async function MonitoringPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const repositories = getRepositories();

  const [monitors, events, sample] = await Promise.all([
    repositories.monitoring.listMonitors(session),
    repositories.monitoring.listEvents(session, { limit: 30 }),
    // Só no driver de demonstração faz sentido oferecer um link de exemplo:
    // ele aponta para uma página do dataset sintético.
    repositories.driver === "memory"
      ? repositories.catalog.listAdvertisers(session, { limit: 12 })
      : Promise.resolve([]),
  ]);

  const now = new Date();
  const dueCount = monitors.filter((monitor) => isMonitorDue(monitor, now)).length;

  // O exemplo tem de ser uma página ainda não acompanhada, senão o clique só
  // responde "já estava sendo acompanhada" e não demonstra nada.
  const watchedPages = new Set(
    monitors.filter((monitor) => monitor.target === "advertiser").map((m) => m.entityId),
  );
  const samplePageId =
    sample.find((advertiser) => advertiser.metaPageId && !watchedPages.has(advertiser.id))
      ?.metaPageId ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Radar className="size-3.5" />
            Vigilância
          </>
        }
        title="Monitoramento"
        description="Snapshots periódicos de anúncios, ofertas e páginas. A diferença entre duas coletas vira evento: anúncio novo, variação, mudança de copy ou queda de volume."
        actions={
          <Badge variant="neutral" size="lg">
            {formatNumber(monitors.length)} alvos monitorados
          </Badge>
        }
      />

      <WatchLinkForm
        allowHourly={planHasFeature(session.workspace.planId, "advanced_monitoring")}
        exampleUrl={samplePageId ? adLibraryPageUrlFor(samplePageId) : null}
      />

      <DueSweep due={dueCount} />

      {monitors.length === 0 ? (
        <EmptyState
          icon={<Radar />}
          title="Nenhum monitoramento ativo"
          description="Cole o link da Biblioteca de Anúncios de um anunciante no campo acima, ou use o ícone de radar em qualquer anúncio, oferta ou página."
          action={
            <Button asChild variant="heat">
              <Link href="/mine">Minerar anúncios</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-3">
            <h2 className="text-[15px] font-semibold text-ink">Alvos</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {monitors.map((monitor) => (
                <MonitoringCard key={monitor.id} monitor={monitor} />
              ))}
            </div>
          </section>

          <Card className="xl:sticky xl:top-[4.75rem] xl:h-fit">
            <CardHeader>
              <CardTitle>Eventos recentes</CardTitle>
              <CardDescription>Diferenças detectadas entre snapshots.</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto pt-0">
              {events.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">
                  Nenhum evento ainda. Eles aparecem quando uma coleta encontra diferença em
                  relação à anterior.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {events.map((event) => (
                    <li key={event.id} className="py-3">
                      <Link
                        href={`/monitoring/${event.monitorId}`}
                        className="block rounded-md transition-colors hover:bg-surface/60"
                      >
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
                            <p className="text-[13px] font-medium leading-snug text-ink">
                              {event.title}
                            </p>
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
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
