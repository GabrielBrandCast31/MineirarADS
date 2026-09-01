import type { AdEnriched } from "@/core/types/ad";
import type { MonitorTarget, MonitoringEvent, Monitor } from "@/core/types/monitoring";
import type { SessionContext } from "@/core/types/workspace";
import { getRepositories } from "@/data";
import { assertFeature, assertQuota } from "./quota";
import { log } from "./logging";

export interface MonitorSubject {
  target: MonitorTarget;
  entityId: string;
  label: string;
  thumbnail?: string | null;
}

/** Cria (ou reaproveita) um monitoramento e captura o primeiro snapshot. */
export async function startMonitoring(
  ctx: SessionContext,
  subject: MonitorSubject,
): Promise<Monitor> {
  assertFeature(ctx, "monitoring");
  const repositories = getRepositories();

  const existing = await repositories.monitoring.findMonitor(
    ctx,
    subject.target,
    subject.entityId,
  );
  if (existing) return existing;

  await assertQuota(ctx, "monitors");

  const monitor = await repositories.monitoring.createMonitor(ctx, {
    target: subject.target,
    entityId: subject.entityId,
    entityLabel: subject.label,
    entityThumbnail: subject.thumbnail ?? null,
  });

  await repositories.usage.increment(ctx, "monitors");
  await runMonitorCheck(ctx, monitor);
  await log(
    {
      level: "info",
      scope: "monitoring",
      message: `Monitoramento criado para ${subject.target} ${subject.label}`,
      context: { monitorId: monitor.id },
    },
    ctx,
  );

  return monitor;
}

export async function stopMonitoring(ctx: SessionContext, monitorId: string): Promise<void> {
  await getRepositories().monitoring.deleteMonitor(ctx, monitorId);
}

/**
 * Executa uma verificação: coleta o estado atual, compara com o último
 * snapshot e emite eventos para cada diferença observada.
 *
 * É a mesma função que o worker roda em background — ver `src/jobs/handlers`.
 * Manter uma única implementação evita que "o que o botão faz" e "o que o job
 * faz" divirjam com o tempo.
 */
export async function runMonitorCheck(
  ctx: SessionContext,
  monitor: Monitor,
): Promise<{ events: MonitoringEvent[]; adCount: number }> {
  const repositories = getRepositories();
  const ads = await collectAds(ctx, monitor);

  const activeAds = ads.filter((ad) => ad.status === "active");
  const creativeCount = ads.reduce((sum, ad) => sum + ad.creatives.length, 0);
  const contentHash = hashOf(ads.map((ad) => `${ad.id}:${ad.status}:${ad.creatives.length}`));

  const previous = (await repositories.monitoring.listSnapshots(ctx, monitor.id, 2)).at(-1);

  await repositories.monitoring.appendSnapshot(ctx, {
    monitorId: monitor.id,
    workspaceId: ctx.workspace.id,
    capturedAt: new Date().toISOString(),
    adCount: ads.length,
    activeAdCount: activeAds.length,
    creativeCount,
    contentHash,
  });

  if (!previous || previous.contentHash === contentHash) {
    return { events: [], adCount: ads.length };
  }

  const pending: Array<Omit<MonitoringEvent, "id" | "createdAt" | "workspaceId">> = [];
  const adDelta = ads.length - previous.adCount;
  const creativeDelta = creativeCount - previous.creativeCount;

  if (adDelta > 0) {
    pending.push({
      monitorId: monitor.id,
      type: monitor.target === "advertiser" ? "volume_increase" : "new_ad",
      severity: "positive",
      title: `${monitor.entityLabel}: ${adDelta} anúncio(s) novo(s)`,
      description: `De ${previous.adCount} para ${ads.length} anúncios observados.`,
      payload: { from: previous.adCount, to: ads.length },
      relatedAdId: null,
      seen: false,
    });
  } else if (adDelta < 0) {
    pending.push({
      monitorId: monitor.id,
      type: monitor.target === "advertiser" ? "volume_decrease" : "ad_removed",
      severity: "warning",
      title: `${monitor.entityLabel}: ${Math.abs(adDelta)} anúncio(s) saiu(ram) do ar`,
      description: `De ${previous.adCount} para ${ads.length} anúncios observados.`,
      payload: { from: previous.adCount, to: ads.length },
      relatedAdId: null,
      seen: false,
    });
  }

  if (creativeDelta > 0) {
    pending.push({
      monitorId: monitor.id,
      type: monitor.target === "offer" ? "offer_creatives_added" : "new_variation",
      severity: "info",
      title: `${monitor.entityLabel}: ${creativeDelta} criativo(s) novo(s)`,
      description: "Novas variações apareceram sob o mesmo alvo monitorado.",
      payload: { from: previous.creativeCount, to: creativeCount },
      relatedAdId: null,
      seen: false,
    });
  }

  const events =
    pending.length > 0 ? await repositories.monitoring.appendEvents(ctx, pending) : [];
  return { events, adCount: ads.length };
}

async function collectAds(ctx: SessionContext, monitor: Monitor): Promise<AdEnriched[]> {
  const repositories = getRepositories();
  switch (monitor.target) {
    case "advertiser":
      return repositories.catalog.listAdsByAdvertiser(ctx, monitor.entityId);
    case "offer":
      return repositories.catalog.listAdsByOffer(ctx, monitor.entityId);
    case "ad": {
      const ad = await repositories.catalog.getAd(ctx, monitor.entityId);
      return ad ? [ad] : [];
    }
  }
}

/** Hash estável e barato — só precisa detectar mudança, não resistir a colisão. */
function hashOf(parts: string[]): string {
  const joined = [...parts].sort().join("|");
  let hash = 2166136261;
  for (let i = 0; i < joined.length; i += 1) {
    hash ^= joined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
