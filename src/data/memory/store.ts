import type { AdSnapshot } from "@/core/types/ad";
import type {
  CopyAnalysis,
  CreativeAnalysis,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import type { Collection, CollectionItem, Tag } from "@/core/types/library";
import type {
  Monitor,
  MonitoringEvent,
  MonitoringSnapshot,
  Notification,
} from "@/core/types/monitoring";
import type { SearchRecord } from "@/core/types/search";
import type {
  AppUser,
  Subscription,
  Workspace,
  WorkspaceMember,
} from "@/core/types/workspace";
import { getMockDataset, type MockDataset } from "@/mock/dataset";
import { Rng } from "@/mock/rng";
import type { LogRecord } from "@/data/types";

export const DEMO_USER_ID = "usr_demo";
export const DEMO_WORKSPACE_ID = "ws_demo";
export const DEMO_EMAIL = "demo@adminer.local";

const DAY = 86_400_000;

/**
 * Estado mutável do driver `memory`.
 *
 * Vive no processo. Sobrevive a hot reload porque é guardado em `globalThis` —
 * sem isso, cada recompilação em desenvolvimento apagaria coleções e
 * monitoramentos criados pelo usuário, o que faria a demonstração parecer
 * quebrada.
 */
export interface MemoryStore {
  dataset: MockDataset;

  users: AppUser[];
  workspaces: Workspace[];
  members: WorkspaceMember[];
  subscriptions: Subscription[];

  collections: Collection[];
  collectionItems: CollectionItem[];
  tags: Tag[];
  adTags: Map<string, Set<string>>;

  monitors: Monitor[];
  monitoringSnapshots: MonitoringSnapshot[];
  monitoringEvents: MonitoringEvent[];
  notifications: Notification[];

  copyAnalyses: Map<string, CopyAnalysis>;
  creativeAnalyses: Map<string, CreativeAnalysis>;
  transcriptions: Map<string, Transcription>;
  insightReports: InsightReport[];

  searches: SearchRecord[];
  searchResults: Map<string, string[]>;

  usage: Map<string, number>;
  logs: LogRecord[];
  adSnapshots: AdSnapshot[];

  sequence: number;
}

declare global {
  // `var` é obrigatório aqui: `let`/`const` não criam propriedade em
  // `globalThis`, e é isso que faz o store sobreviver ao hot reload do dev.
  var __adminerMemoryStore: MemoryStore | undefined;
}

export function getMemoryStore(): MemoryStore {
  globalThis.__adminerMemoryStore ??= seedStore();
  return globalThis.__adminerMemoryStore;
}

/** Apenas para testes. */
export function resetMemoryStore(): void {
  globalThis.__adminerMemoryStore = undefined;
}

export function nextId(prefix: string): string {
  const store = getMemoryStore();
  store.sequence += 1;
  return `${prefix}_${store.sequence.toString(36)}${Date.now().toString(36).slice(-4)}`;
}

/* ---------------------------------------------------------------- seed --- */

function seedStore(): MemoryStore {
  const dataset = getMockDataset();
  const now = new Date();
  const rng = new Rng("seed-store-v1");

  const store: MemoryStore = {
    dataset,
    users: [
      {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        name: "Conta de demonstração",
        avatarUrl: null,
        createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
      },
    ],
    workspaces: [
      {
        id: DEMO_WORKSPACE_ID,
        name: "Workspace de demonstração",
        slug: "demo",
        planId: "agency",
        ownerId: DEMO_USER_ID,
        createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
      },
    ],
    members: [
      {
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_USER_ID,
        role: "owner",
        email: DEMO_EMAIL,
        name: "Conta de demonstração",
        avatarUrl: null,
        createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
      },
    ],
    subscriptions: [
      {
        id: "sub_demo",
        workspaceId: DEMO_WORKSPACE_ID,
        planId: "agency",
        status: "active",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodStart: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        currentPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString(),
        cancelAtPeriodEnd: false,
      },
    ],
    collections: [],
    collectionItems: [],
    tags: [],
    adTags: new Map(),
    monitors: [],
    monitoringSnapshots: [],
    monitoringEvents: [],
    notifications: [],
    copyAnalyses: new Map(),
    creativeAnalyses: new Map(),
    transcriptions: new Map(),
    insightReports: [],
    searches: [],
    searchResults: new Map(),
    usage: new Map(),
    logs: [],
    adSnapshots: [],
    sequence: 0,
  };

  globalThis.__adminerMemoryStore = store;

  seedCollections(store, dataset, rng, now);
  seedMonitors(store, dataset, rng, now);
  seedUsage(store, now);
  seedSearches(store, now);

  return store;
}

const SEED_COLLECTIONS: Array<{ name: string; description: string; color: string }> = [
  { name: "Odonto — Concorrentes", description: "Clínicas que rodam implante há meses.", color: "brand" },
  { name: "Hooks que seguram scroll", description: "Aberturas para adaptar.", color: "heat" },
  { name: "VSL / Vídeo longo", description: "Vídeos acima de 60 segundos.", color: "info" },
  { name: "Infoprodutos", description: "Cursos e mentorias em escala.", color: "ok" },
];

function seedCollections(store: MemoryStore, dataset: MockDataset, rng: Rng, now: Date): void {
  const longRunners = [...dataset.ads]
    .filter((ad) => ad.status === "active")
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  SEED_COLLECTIONS.forEach((seed, index) => {
    const collection: Collection = {
      id: `col_seed_${index}`,
      workspaceId: DEMO_WORKSPACE_ID,
      name: seed.name,
      description: seed.description,
      color: seed.color,
      icon: null,
      itemCount: 0,
      coverThumbnails: [],
      createdBy: DEMO_USER_ID,
      createdAt: new Date(now.getTime() - (30 - index * 4) * DAY).toISOString(),
      updatedAt: new Date(now.getTime() - index * DAY).toISOString(),
    };
    store.collections.push(collection);

    const picks = rng.sample(longRunners.slice(0, 90), rng.int(3, 7));
    for (const ad of picks) {
      store.collectionItems.push({
        id: `ci_seed_${collection.id}_${ad.id}`,
        collectionId: collection.id,
        workspaceId: DEMO_WORKSPACE_ID,
        kind: "ad",
        entityId: ad.id,
        note: null,
        addedBy: DEMO_USER_ID,
        createdAt: new Date(now.getTime() - rng.int(1, 20) * DAY).toISOString(),
      });
    }
  });

  for (const name of ["odonto", "vídeo", "prova social", "whatsapp", "black friday"]) {
    store.tags.push({
      id: `tag_${name.replace(/\s+/g, "-")}`,
      workspaceId: DEMO_WORKSPACE_ID,
      name,
      color: "brand",
      usageCount: 0,
      createdAt: now.toISOString(),
    });
  }
}

/**
 * Monitoramentos com histórico: a linha do tempo só é convincente se houver
 * snapshots reais espaçados e eventos derivados das diferenças entre eles.
 */
function seedMonitors(store: MemoryStore, dataset: MockDataset, rng: Rng, now: Date): void {
  const topOffers = [...dataset.offers]
    .sort((a, b) => b.stats.score - a.stats.score)
    .slice(0, 3);
  const topAdvertisers = [...dataset.advertisers]
    .sort((a, b) => b.stats.activeAds - a.stats.activeAds)
    .slice(0, 2);

  const targets: Array<{
    target: Monitor["target"];
    entityId: string;
    label: string;
    thumbnail: string | null;
    baseline: number;
  }> = [
    ...topOffers.map((offer) => ({
      target: "offer" as const,
      entityId: offer.id,
      label: offer.name,
      thumbnail:
        dataset.index.adsByOfferId.get(offer.id)?.[0]?.creatives[0]?.thumbnailUrl ?? null,
      baseline: Math.max(2, offer.stats.totalAds - rng.int(2, 6)),
    })),
    ...topAdvertisers.map((advertiser) => ({
      target: "advertiser" as const,
      entityId: advertiser.id,
      label: advertiser.name,
      thumbnail: advertiser.avatarUrl,
      baseline: Math.max(3, advertiser.stats.activeAds - rng.int(3, 8)),
    })),
  ];

  targets.forEach((target, index) => {
    const monitorId = `mon_seed_${index}`;
    const createdAt = new Date(now.getTime() - 32 * DAY);

    store.monitors.push({
      id: monitorId,
      workspaceId: DEMO_WORKSPACE_ID,
      target: target.target,
      entityId: target.entityId,
      entityLabel: target.label,
      entityThumbnail: target.thumbnail,
      frequency: "daily",
      active: true,
      lastCheckedAt: new Date(now.getTime() - rng.int(0, 20) * 3_600_000).toISOString(),
      nextCheckAt: new Date(now.getTime() + 6 * 3_600_000).toISOString(),
      unseenEvents: 0,
      createdBy: DEMO_USER_ID,
      createdAt: createdAt.toISOString(),
    });

    // Sete snapshots ao longo de ~30 dias, com crescimento monotônico.
    let adCount = target.baseline;
    let creativeCount = adCount * rng.int(1, 3);

    for (let step = 6; step >= 0; step -= 1) {
      const capturedAt = new Date(now.getTime() - step * 5 * DAY);
      const addedAds = step === 6 ? 0 : rng.int(0, 3);
      const addedCreatives = step === 6 ? 0 : rng.int(0, 5);
      adCount += addedAds;
      creativeCount += addedCreatives;

      store.monitoringSnapshots.push({
        id: `snap_seed_${monitorId}_${step}`,
        monitorId,
        workspaceId: DEMO_WORKSPACE_ID,
        capturedAt: capturedAt.toISOString(),
        adCount,
        activeAdCount: Math.max(1, adCount - rng.int(0, 2)),
        creativeCount,
        contentHash: `hash_${monitorId}_${step}`,
      });

      if (addedAds > 0) {
        store.monitoringEvents.push({
          id: `evt_seed_${monitorId}_${step}_new`,
          workspaceId: DEMO_WORKSPACE_ID,
          monitorId,
          type: target.target === "advertiser" ? "volume_increase" : "offer_creatives_added",
          severity: "positive",
          title:
            target.target === "advertiser"
              ? `${target.label} subiu ${addedAds} anúncio(s)`
              : `${target.label} ganhou ${addedAds} criativo(s)`,
          description: `Detectado na coleta de ${capturedAt.toLocaleDateString("pt-BR")}. Total observado agora: ${adCount} anúncios.`,
          payload: { addedAds, addedCreatives, adCount },
          relatedAdId: null,
          seen: step > 2,
          createdAt: capturedAt.toISOString(),
        });
      }
      if (addedCreatives > 2) {
        store.monitoringEvents.push({
          id: `evt_seed_${monitorId}_${step}_var`,
          workspaceId: DEMO_WORKSPACE_ID,
          monitorId,
          type: "new_variation",
          severity: "info",
          title: `Nova variação em ${target.label}`,
          description: `${addedCreatives} criativos novos apareceram sob a mesma oferta.`,
          payload: { addedCreatives },
          relatedAdId: null,
          seen: step > 1,
          createdAt: capturedAt.toISOString(),
        });
      }
    }
  });

  // Contagem de eventos não lidos por monitoramento.
  for (const monitor of store.monitors) {
    monitor.unseenEvents = store.monitoringEvents.filter(
      (e) => e.monitorId === monitor.id && !e.seen,
    ).length;
  }

  // Notificações in-app a partir dos eventos recentes não vistos.
  for (const event of store.monitoringEvents.filter((e) => !e.seen).slice(0, 8)) {
    store.notifications.push({
      id: `ntf_${event.id}`,
      workspaceId: DEMO_WORKSPACE_ID,
      userId: DEMO_USER_ID,
      kind: "monitoring",
      title: event.title,
      body: event.description,
      href: `/monitoring/${event.monitorId}`,
      read: false,
      createdAt: event.createdAt,
    });
  }
}

function seedUsage(store: MemoryStore, now: Date): void {
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const seeds: Array<[string, number]> = [
    ["searches", 37],
    ["analyses", 21],
    ["ai_calls", 21],
    ["transcriptions", 3],
    ["monitors", store.monitors.length],
    ["saved_items", store.collectionItems.length],
  ];
  for (const [metric, amount] of seeds) {
    store.usage.set(`${DEMO_WORKSPACE_ID}:${metric}:${period}`, amount);
  }
}

const SEED_QUERIES = [
  "implante dentário",
  "energia solar",
  "curso de inglês",
  "harmonização facial",
  "crm para clínicas",
  "emagrecimento",
];

function seedSearches(store: MemoryStore, now: Date): void {
  SEED_QUERIES.forEach((query, index) => {
    store.searches.push({
      id: `search_seed_${index}`,
      workspaceId: DEMO_WORKSPACE_ID,
      userId: DEMO_USER_ID,
      params: { query, countries: ["BR"], status: "active", minActiveDays: 30, sort: "score" },
      provider: "mock",
      resultCount: 12 + index * 3,
      durationMs: 240 + index * 40,
      status: "ok",
      errorMessage: null,
      createdAt: new Date(now.getTime() - (index + 1) * 6 * 3_600_000).toISOString(),
    });
  });
}
