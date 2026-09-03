import type { Ad, AdEnriched } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import { EMPTY_ADVERTISER_STATS } from "@/core/types/advertiser";
import type { CountryCode } from "@/core/types/common";
import type {
  MonitorFrequency,
  MonitorTarget,
  MonitoringEvent,
  Monitor,
} from "@/core/types/monitoring";
import type { SessionContext } from "@/core/types/workspace";
import { InvalidAdLibraryLinkError, parseAdLibraryLink } from "@/core/meta/ad-library-link";
import { avatarDataUrl } from "@/lib/avatar";
import { getRepositories } from "@/data";
import { getAdProvider } from "@/providers/ads";
import { assertFeature, assertQuota } from "./quota";
import { errorContext, log } from "./logging";

export interface MonitorSubject {
  target: MonitorTarget;
  entityId: string;
  label: string;
  thumbnail?: string | null;
  frequency?: MonitorFrequency;
}

/** Cria (ou reaproveita) um monitoramento e captura o primeiro snapshot. */
export async function startMonitoring(
  ctx: SessionContext,
  subject: MonitorSubject,
  options: { refresh?: boolean } = {},
): Promise<Monitor> {
  assertFeature(ctx, "monitoring");
  // Hora a hora é o único intervalo que pesa na fonte; por isso é de plano.
  if (subject.frequency === "hourly") assertFeature(ctx, "advanced_monitoring");

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
    frequency: subject.frequency ?? "daily",
  });

  await repositories.usage.increment(ctx, "monitors");
  await runMonitorCheck(ctx, monitor, options);
  await log(
    {
      level: "info",
      scope: "monitoring",
      message: `Monitoramento criado para ${subject.target} ${subject.label}`,
      context: { monitorId: monitor.id, frequency: monitor.frequency },
    },
    ctx,
  );

  return monitor;
}

export async function stopMonitoring(ctx: SessionContext, monitorId: string): Promise<void> {
  await getRepositories().monitoring.deleteMonitor(ctx, monitorId);
}

/* ------------------------------------------- salvar o link de uma página -- */

export interface WatchAdLibraryLinkInput {
  /** URL colada da Biblioteca de Anúncios (ou o `page_id` cru). */
  url: string;
  frequency?: MonitorFrequency;
}

export interface WatchAdLibraryLinkOutcome {
  monitor: Monitor;
  advertiser: Advertiser;
  /** Anúncios que a fonte devolveu para a página nesta primeira coleta. */
  collected: number;
  /** A página já estava sendo acompanhada; nada foi criado. */
  alreadyWatching: boolean;
  /** Limites honestos da coleta, para exibir junto do resultado. */
  warnings: string[];
}

/**
 * Passa a acompanhar a página de um link da Biblioteca de Anúncios.
 *
 * O link é a única coisa que o usuário tem em mãos, então ele é o ponto de
 * entrada: daqui sai o `page_id`, dele sai (ou nasce) o anunciante no catálogo
 * e sobre o anunciante fica o monitoramento. As coletas seguintes reusam o
 * mesmo caminho — ver `runMonitorCheck`.
 */
export async function watchAdLibraryLink(
  ctx: SessionContext,
  input: WatchAdLibraryLinkInput,
): Promise<WatchAdLibraryLinkOutcome> {
  assertFeature(ctx, "monitoring");

  const parsed = parseAdLibraryLink(input.url);
  if (!parsed.ok) throw new InvalidAdLibraryLinkError(parsed.message);
  if (parsed.link.kind === "ad") {
    throw new InvalidAdLibraryLinkError(
      "Esse link aponta para um anúncio específico, não para a página do anunciante. " +
        "Abra “Ver todos os anúncios desta página” na Biblioteca e cole a URL com “view_all_page_id” — " +
        "ou monitore o anúncio pelo ícone de radar dentro dele.",
    );
  }

  const { pageId, country } = parsed.link;
  const repositories = getRepositories();
  const warnings: string[] = [];

  const known = await repositories.monitoring.listMonitors(ctx);
  const previous = await repositories.catalog.findAdvertiserByMetaPageId(ctx, pageId);
  const alreadyWatching = Boolean(
    previous && known.some((m) => m.target === "advertiser" && m.entityId === previous.id),
  );

  // Coleta imediata: sem ela o primeiro snapshot seria de um catálogo vazio e a
  // primeira semana de monitoramento não teria base de comparação.
  const collected = await collectPage(ctx, pageId, country);
  warnings.push(...collected.warnings);

  const advertiser =
    previous ??
    (await repositories.catalog.findAdvertiserByMetaPageId(ctx, pageId)) ??
    (await advertiserOfFirstAd(ctx, collected.ads)) ??
    (await createAdvertiserPlaceholder(ctx, pageId, country));

  if (collected.ads.length === 0 && !previous) {
    warnings.push(
      getAdProvider().name === "mock"
        ? "Nenhum anúncio coletado: a fonte ativa é o dataset de demonstração, que não conhece essa página. " +
          "Configure ADS_PROVIDER=meta com um token da Ad Library para coletar a página real."
        : "A fonte não devolveu anúncios para essa página agora — ela pode não ter anúncios no país do link. " +
          "O monitoramento fica ativo e a próxima coleta tenta de novo.",
    );
  }

  const monitor = await startMonitoring(
    ctx,
    {
      target: "advertiser",
      entityId: advertiser.id,
      label: advertiser.name,
      thumbnail: advertiser.avatarUrl,
      frequency: input.frequency ?? "daily",
    },
    // A coleta acabou de acontecer; repetir agora só gastaria a fonte.
    { refresh: false },
  );

  return { monitor, advertiser, collected: collected.ads.length, alreadyWatching, warnings };
}

/* ------------------------------------------------------------- verificação -- */

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
  options: { refresh?: boolean } = {},
): Promise<{ events: MonitoringEvent[]; adCount: number }> {
  const repositories = getRepositories();

  // Sem reconsultar a fonte, a comparação seria entre duas leituras do mesmo
  // catálogo — e nenhum anúncio novo apareceria nunca.
  if (options.refresh !== false) await refreshFromSource(ctx, monitor);

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

export interface SweepOutcome {
  /** Monitoramentos vencidos encontrados. */
  due: number;
  /** Quantos foram verificados sem erro. */
  checked: number;
  /** Eventos emitidos na varredura. */
  events: number;
}

/**
 * Verifica todos os monitoramentos vencidos do workspace.
 *
 * É o que faz "acompanhar durante a semana" acontecer sem ninguém clicando:
 * cada monitoramento tem `nextCheckAt` conforme sua frequência, e esta função
 * é o consumidor dessa fila. Roda a partir da própria interface (ao abrir
 * Monitoramento) e de `POST /api/jobs/run`, para quem preferir um cron.
 */
export async function sweepDueMonitors(
  ctx: SessionContext,
  options: { limit?: number } = {},
): Promise<SweepOutcome> {
  const due = await getRepositories().monitoring.listDueMonitors(ctx, {
    limit: options.limit ?? 10,
  });

  let checked = 0;
  let events = 0;

  // Em série de propósito: a fonte é externa e compartilhada entre alvos.
  for (const monitor of due) {
    try {
      const result = await runMonitorCheck(ctx, monitor);
      events += result.events.length;
      checked += 1;
    } catch (error) {
      await log(
        {
          level: "warn",
          scope: "monitoring",
          message: `Falha ao verificar ${monitor.entityLabel}`,
          context: { monitorId: monitor.id, ...errorContext(error) },
        },
        ctx,
      );
    }
  }

  if (due.length > 0) {
    await log(
      {
        level: "info",
        scope: "monitoring",
        message: `Varredura: ${checked}/${due.length} verificado(s), ${events} evento(s)`,
      },
      ctx,
    );
  }

  return { due: due.length, checked, events };
}

/* ------------------------------------------------------------- coleta ----- */

/**
 * Reconsulta a fonte para o alvo monitorado.
 *
 * A Ad Library só sabe responder por página, então os três tipos de alvo
 * convergem para o mesmo lugar: a página do anunciante. É isso que faz o
 * acompanhamento de uma **oferta** encontrar anúncios novos — sem este passo,
 * a comparação seria entre duas leituras do mesmo catálogo e o crescimento
 * nunca apareceria.
 *
 * Não consome a cota de buscas: quem pediu a coleta foi o agendamento, não o
 * usuário.
 */
async function refreshFromSource(ctx: SessionContext, monitor: Monitor): Promise<void> {
  const page = await sourcePageOf(ctx, monitor);
  if (!page) return;
  await collectPage(ctx, page.pageId, page.country);
}

/** A página da Meta por trás do alvo, seja ele anúncio, oferta ou anunciante. */
async function sourcePageOf(
  ctx: SessionContext,
  monitor: Monitor,
): Promise<{ pageId: string; country: CountryCode | null } | null> {
  const catalog = getRepositories().catalog;

  const advertiserId = await (async (): Promise<string | null> => {
    switch (monitor.target) {
      case "advertiser":
        return monitor.entityId;
      case "offer": {
        // Oferta é agrupamento nosso; quem tem página é o anunciante dela.
        const offer = await catalog.getOffer(ctx, monitor.entityId);
        return offer?.advertiserId ?? null;
      }
      case "ad": {
        const ad = await catalog.getAd(ctx, monitor.entityId);
        return ad?.advertiserId ?? null;
      }
    }
  })();
  if (!advertiserId) return null;

  const advertiser = await catalog.getAdvertiser(ctx, advertiserId);
  if (!advertiser?.metaPageId) return null;
  return { pageId: advertiser.metaPageId, country: advertiser.country };
}

/**
 * Coleta os anúncios de uma página na fonte ativa e grava no catálogo.
 *
 * Nunca lança: uma fonte fora do ar não pode derrubar a verificação, senão o
 * histórico ganharia buracos justamente quando mais importa.
 */
async function collectPage(
  ctx: SessionContext,
  pageId: string,
  country: CountryCode | null,
): Promise<{ ads: Ad[]; warnings: string[] }> {
  const warnings: string[] = [];
  try {
    const result = await getAdProvider().searchAds({
      advertiser: pageId,
      status: "all",
      limit: 96,
      ...(country ? { countries: [country] } : {}),
    });
    warnings.push(...result.warnings);

    if (result.items.length > 0) {
      await getRepositories().catalog.upsertBatch(ctx, { ads: result.items });
    }
    return { ads: result.items, warnings };
  } catch (error) {
    await log(
      {
        level: "warn",
        scope: "monitoring",
        message: `Falha ao coletar a página ${pageId} na fonte`,
        context: { pageId, ...errorContext(error) },
      },
      ctx,
    );
    warnings.push(
      "A fonte de anúncios não respondeu nesta coleta. O monitoramento segue ativo e tenta de novo na próxima.",
    );
    return { ads: [], warnings };
  }
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

async function advertiserOfFirstAd(
  ctx: SessionContext,
  ads: Ad[],
): Promise<Advertiser | null> {
  const advertiserId = ads[0]?.advertiserId;
  if (!advertiserId) return null;
  return getRepositories().catalog.getAdvertiser(ctx, advertiserId);
}

/**
 * Cria o anunciante a partir do próprio link, quando a fonte não devolveu nada.
 *
 * O usuário salvou um link válido; recusar por falta de dados perderia a
 * intenção dele. O registro entra com o que o link realmente informa — id da
 * página e país — e o nome verdadeiro chega na primeira coleta que trouxer
 * anúncios. Nenhum número é inventado: as estatísticas ficam zeradas.
 */
async function createAdvertiserPlaceholder(
  ctx: SessionContext,
  pageId: string,
  country: CountryCode | null,
): Promise<Advertiser> {
  const repositories = getRepositories();
  const name = `Página ${pageId}`;
  const now = new Date().toISOString();

  await repositories.catalog.upsertBatch(ctx, {
    advertisers: [
      {
        id: `page_${pageId}`,
        metaPageId: pageId,
        name,
        avatarUrl: avatarDataUrl(name),
        category: null,
        country,
        verified: false,
        websiteUrl: null,
        stats: EMPTY_ADVERTISER_STATS,
        firstSeenAt: now,
        lastSeenAt: now,
      },
    ],
  });

  const created = await repositories.catalog.findAdvertiserByMetaPageId(ctx, pageId);
  if (!created) {
    throw new Error(`Não foi possível registrar a página ${pageId} no catálogo.`);
  }
  return created;
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
