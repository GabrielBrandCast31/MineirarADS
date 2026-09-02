import type {
  CopyAnalysis,
  CreativeAnalysis,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import type {
  Collection,
  CollectionItem,
  CollectionItemKind,
  Tag,
} from "@/core/types/library";
import type {
  Monitor,
  MonitorFrequency,
  MonitorTarget,
  MonitoringEvent,
  MonitoringSnapshot,
  Notification,
} from "@/core/types/monitoring";
import { isMonitorDue, nextCheckAtFor } from "@/core/types/monitoring";
import type { SearchRecord } from "@/core/types/search";
import type {
  AppUser,
  PlanId,
  SessionContext,
  Subscription,
  UsageMetric,
  UsageRecord,
  Workspace,
  WorkspaceMember,
} from "@/core/types/workspace";
import { ROLE_RANK } from "@/core/types/workspace";
import {
  ForbiddenError,
  NotFoundError,
  type AnalysisRepository,
  type LibraryRepository,
  type LogEntryInput,
  type LogRecord,
  type LogRepository,
  type MonitoringRepository,
  type SearchRepository,
  type UsageRepository,
  type WorkspaceRepository,
} from "@/data/types";
import { getMemoryStore, nextId, type MemoryStore } from "./store";

const store = (): MemoryStore => getMemoryStore();

/** Papel mínimo para escrever. Viewer é somente leitura em todo o produto. */
function assertCanWrite(ctx: SessionContext): void {
  if (ROLE_RANK[ctx.role] < ROLE_RANK.member) throw new ForbiddenError();
}

function periodKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

/* ============================================================= biblioteca == */

export class MemoryLibraryRepository implements LibraryRepository {
  async listCollections(ctx: SessionContext): Promise<Collection[]> {
    const s = store();
    return s.collections
      .filter((c) => c.workspaceId === ctx.workspace.id)
      .map((c) => this.decorate(c))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async getCollection(ctx: SessionContext, id: string): Promise<Collection | null> {
    const found = store().collections.find(
      (c) => c.id === id && c.workspaceId === ctx.workspace.id,
    );
    return found ? this.decorate(found) : null;
  }

  async createCollection(
    ctx: SessionContext,
    input: { name: string; description?: string | null; color?: string },
  ): Promise<Collection> {
    assertCanWrite(ctx);
    const s = store();
    const name = input.name.trim();
    if (!name) throw new NotFoundError("Coleção", "nome vazio");
    const duplicate = s.collections.find(
      (c) => c.workspaceId === ctx.workspace.id && c.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return this.decorate(duplicate);

    const now = new Date().toISOString();
    const collection: Collection = {
      id: nextId("col"),
      workspaceId: ctx.workspace.id,
      name,
      description: input.description ?? null,
      color: input.color ?? "brand",
      icon: null,
      itemCount: 0,
      coverThumbnails: [],
      createdBy: ctx.user.id,
      createdAt: now,
      updatedAt: now,
    };
    s.collections.push(collection);
    return collection;
  }

  async updateCollection(
    ctx: SessionContext,
    id: string,
    patch: Partial<Pick<Collection, "name" | "description" | "color">>,
  ): Promise<Collection> {
    assertCanWrite(ctx);
    const collection = store().collections.find(
      (c) => c.id === id && c.workspaceId === ctx.workspace.id,
    );
    if (!collection) throw new NotFoundError("Coleção", id);
    Object.assign(collection, patch, { updatedAt: new Date().toISOString() });
    return this.decorate(collection);
  }

  async deleteCollection(ctx: SessionContext, id: string): Promise<void> {
    assertCanWrite(ctx);
    const s = store();
    s.collections = s.collections.filter(
      (c) => !(c.id === id && c.workspaceId === ctx.workspace.id),
    );
    s.collectionItems = s.collectionItems.filter((item) => item.collectionId !== id);
  }

  async listItems(ctx: SessionContext, collectionId: string): Promise<CollectionItem[]> {
    return store()
      .collectionItems.filter(
        (item) => item.collectionId === collectionId && item.workspaceId === ctx.workspace.id,
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addItem(
    ctx: SessionContext,
    input: {
      collectionId: string;
      kind: CollectionItemKind;
      entityId: string;
      note?: string | null;
    },
  ): Promise<CollectionItem> {
    assertCanWrite(ctx);
    const s = store();
    const collection = s.collections.find(
      (c) => c.id === input.collectionId && c.workspaceId === ctx.workspace.id,
    );
    if (!collection) throw new NotFoundError("Coleção", input.collectionId);

    const existing = s.collectionItems.find(
      (item) =>
        item.collectionId === input.collectionId &&
        item.kind === input.kind &&
        item.entityId === input.entityId,
    );
    if (existing) return existing;

    const item: CollectionItem = {
      id: nextId("ci"),
      collectionId: input.collectionId,
      workspaceId: ctx.workspace.id,
      kind: input.kind,
      entityId: input.entityId,
      note: input.note ?? null,
      addedBy: ctx.user.id,
      createdAt: new Date().toISOString(),
    };
    s.collectionItems.push(item);
    collection.updatedAt = item.createdAt;
    return item;
  }

  async removeItem(ctx: SessionContext, itemId: string): Promise<void> {
    assertCanWrite(ctx);
    const s = store();
    s.collectionItems = s.collectionItems.filter(
      (item) => !(item.id === itemId && item.workspaceId === ctx.workspace.id),
    );
  }

  async collectionsContaining(
    ctx: SessionContext,
    kind: CollectionItemKind,
    entityId: string,
  ): Promise<string[]> {
    return store()
      .collectionItems.filter(
        (item) =>
          item.workspaceId === ctx.workspace.id &&
          item.kind === kind &&
          item.entityId === entityId,
      )
      .map((item) => item.collectionId);
  }

  async savedEntityIds(ctx: SessionContext, kind: CollectionItemKind): Promise<Set<string>> {
    return new Set(
      store()
        .collectionItems.filter(
          (item) => item.workspaceId === ctx.workspace.id && item.kind === kind,
        )
        .map((item) => item.entityId),
    );
  }

  async listTags(ctx: SessionContext): Promise<Tag[]> {
    const s = store();
    return s.tags
      .filter((t) => t.workspaceId === ctx.workspace.id)
      .map((tag) => ({
        ...tag,
        usageCount: [...s.adTags.values()].filter((set) => set.has(tag.id)).length,
      }));
  }

  async createTag(ctx: SessionContext, name: string, color = "brand"): Promise<Tag> {
    assertCanWrite(ctx);
    const s = store();
    const clean = name.trim().toLowerCase();
    const existing = s.tags.find(
      (t) => t.workspaceId === ctx.workspace.id && t.name.toLowerCase() === clean,
    );
    if (existing) return existing;

    const tag: Tag = {
      id: nextId("tag"),
      workspaceId: ctx.workspace.id,
      name: clean,
      color,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    s.tags.push(tag);
    return tag;
  }

  async setAdTags(ctx: SessionContext, adId: string, tagIds: string[]): Promise<void> {
    assertCanWrite(ctx);
    store().adTags.set(`${ctx.workspace.id}:${adId}`, new Set(tagIds));
  }

  async tagsOfAd(ctx: SessionContext, adId: string): Promise<Tag[]> {
    const s = store();
    const ids = s.adTags.get(`${ctx.workspace.id}:${adId}`) ?? new Set<string>();
    return s.tags.filter((t) => ids.has(t.id));
  }

  /** Preenche contagem e capas — dados derivados, não persistidos. */
  private decorate(collection: Collection): Collection {
    const s = store();
    const items = s.collectionItems.filter((item) => item.collectionId === collection.id);
    const thumbnails = items
      .slice(0, 4)
      .map((item) => {
        if (item.kind !== "ad") return null;
        const ad = s.dataset.index.adById.get(item.entityId);
        return ad?.creatives[0]?.thumbnailUrl ?? null;
      })
      .filter((url): url is string => Boolean(url));

    return { ...collection, itemCount: items.length, coverThumbnails: thumbnails };
  }
}

/* ========================================================= monitoramento == */

export class MemoryMonitoringRepository implements MonitoringRepository {
  async listMonitors(ctx: SessionContext): Promise<Monitor[]> {
    const s = store();
    return s.monitors
      .filter((m) => m.workspaceId === ctx.workspace.id)
      .map((m) => ({
        ...m,
        unseenEvents: s.monitoringEvents.filter((e) => e.monitorId === m.id && !e.seen).length,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listDueMonitors(
    ctx: SessionContext,
    options: { limit?: number; now?: string } = {},
  ): Promise<Monitor[]> {
    const now = options.now ? new Date(options.now) : new Date();
    const monitors = await this.listMonitors(ctx);
    return monitors
      .filter((monitor) => isMonitorDue(monitor, now))
      .sort((a, b) => new Date(a.nextCheckAt ?? 0).getTime() - new Date(b.nextCheckAt ?? 0).getTime())
      .slice(0, options.limit ?? 25);
  }

  async getMonitor(ctx: SessionContext, id: string): Promise<Monitor | null> {
    return (
      store().monitors.find((m) => m.id === id && m.workspaceId === ctx.workspace.id) ?? null
    );
  }

  async findMonitor(
    ctx: SessionContext,
    target: MonitorTarget,
    entityId: string,
  ): Promise<Monitor | null> {
    return (
      store().monitors.find(
        (m) =>
          m.workspaceId === ctx.workspace.id && m.target === target && m.entityId === entityId,
      ) ?? null
    );
  }

  async createMonitor(
    ctx: SessionContext,
    input: {
      target: MonitorTarget;
      entityId: string;
      entityLabel: string;
      entityThumbnail?: string | null;
      frequency?: MonitorFrequency;
    },
  ): Promise<Monitor> {
    assertCanWrite(ctx);
    const existing = await this.findMonitor(ctx, input.target, input.entityId);
    if (existing) return existing;

    const now = new Date();
    const frequency = input.frequency ?? "daily";
    const monitor: Monitor = {
      id: nextId("mon"),
      workspaceId: ctx.workspace.id,
      target: input.target,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      entityThumbnail: input.entityThumbnail ?? null,
      frequency,
      active: true,
      lastCheckedAt: null,
      nextCheckAt: nextCheckAtFor(frequency, now),
      unseenEvents: 0,
      createdBy: ctx.user.id,
      createdAt: now.toISOString(),
    };
    store().monitors.push(monitor);
    return monitor;
  }

  async setMonitorActive(ctx: SessionContext, id: string, active: boolean): Promise<Monitor> {
    assertCanWrite(ctx);
    const monitor = await this.getMonitor(ctx, id);
    if (!monitor) throw new NotFoundError("Monitoramento", id);
    monitor.active = active;
    return monitor;
  }

  async deleteMonitor(ctx: SessionContext, id: string): Promise<void> {
    assertCanWrite(ctx);
    const s = store();
    s.monitors = s.monitors.filter((m) => !(m.id === id && m.workspaceId === ctx.workspace.id));
    s.monitoringSnapshots = s.monitoringSnapshots.filter((snap) => snap.monitorId !== id);
    s.monitoringEvents = s.monitoringEvents.filter((event) => event.monitorId !== id);
  }

  async monitoredEntityIds(ctx: SessionContext, target: MonitorTarget): Promise<Set<string>> {
    return new Set(
      store()
        .monitors.filter((m) => m.workspaceId === ctx.workspace.id && m.target === target)
        .map((m) => m.entityId),
    );
  }

  async listSnapshots(
    ctx: SessionContext,
    monitorId: string,
    limit = 60,
  ): Promise<MonitoringSnapshot[]> {
    return store()
      .monitoringSnapshots.filter(
        (snap) => snap.monitorId === monitorId && snap.workspaceId === ctx.workspace.id,
      )
      .sort((a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime())
      .slice(-limit);
  }

  async appendSnapshot(
    ctx: SessionContext,
    snapshot: Omit<MonitoringSnapshot, "id">,
  ): Promise<MonitoringSnapshot> {
    const full: MonitoringSnapshot = { ...snapshot, id: nextId("snap") };
    store().monitoringSnapshots.push(full);
    const monitor = await this.getMonitor(ctx, snapshot.monitorId);
    if (monitor) {
      monitor.lastCheckedAt = snapshot.capturedAt;
      monitor.nextCheckAt = nextCheckAtFor(monitor.frequency, snapshot.capturedAt);
    }
    return full;
  }

  async listEvents(
    ctx: SessionContext,
    options: { monitorId?: string; limit?: number; onlyUnseen?: boolean } = {},
  ): Promise<MonitoringEvent[]> {
    return store()
      .monitoringEvents.filter(
        (event) =>
          event.workspaceId === ctx.workspace.id &&
          (!options.monitorId || event.monitorId === options.monitorId) &&
          (!options.onlyUnseen || !event.seen),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, options.limit ?? 50);
  }

  async appendEvents(
    ctx: SessionContext,
    events: Array<Omit<MonitoringEvent, "id" | "createdAt" | "workspaceId">>,
  ): Promise<MonitoringEvent[]> {
    const s = store();
    const created = events.map((event) => ({
      ...event,
      id: nextId("evt"),
      workspaceId: ctx.workspace.id,
      createdAt: new Date().toISOString(),
    }));
    s.monitoringEvents.push(...created);

    // Espelha o trigger `notify_monitoring_event` do Postgres.
    for (const event of created) {
      s.notifications.push({
        id: nextId("ntf"),
        workspaceId: ctx.workspace.id,
        userId: ctx.user.id,
        kind: "monitoring",
        title: event.title,
        body: event.description,
        href: `/monitoring/${event.monitorId}`,
        read: false,
        createdAt: event.createdAt,
      });
    }
    return created;
  }

  async markEventsSeen(ctx: SessionContext, ids: string[]): Promise<void> {
    const wanted = new Set(ids);
    for (const event of store().monitoringEvents) {
      if (event.workspaceId === ctx.workspace.id && wanted.has(event.id)) event.seen = true;
    }
  }

  async listNotifications(ctx: SessionContext, limit = 20): Promise<Notification[]> {
    return store()
      .notifications.filter(
        (n) =>
          n.workspaceId === ctx.workspace.id && (n.userId === null || n.userId === ctx.user.id),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async markNotificationRead(ctx: SessionContext, id: string): Promise<void> {
    const found = store().notifications.find(
      (n) => n.id === id && n.workspaceId === ctx.workspace.id,
    );
    if (found) found.read = true;
  }
}

/* ============================================================== análises == */

export class MemoryAnalysisRepository implements AnalysisRepository {
  private key(ctx: SessionContext, id: string): string {
    return `${ctx.workspace.id}:${id}`;
  }

  async getCopyAnalysis(ctx: SessionContext, adId: string): Promise<CopyAnalysis | null> {
    return store().copyAnalyses.get(this.key(ctx, adId)) ?? null;
  }

  async saveCopyAnalysis(ctx: SessionContext, analysis: CopyAnalysis): Promise<CopyAnalysis> {
    const record = { ...analysis, workspaceId: ctx.workspace.id };
    store().copyAnalyses.set(this.key(ctx, analysis.adId), record);
    return record;
  }

  async getCopyAnalysesForAds(ctx: SessionContext, adIds: string[]): Promise<CopyAnalysis[]> {
    const s = store();
    return adIds
      .map((id) => s.copyAnalyses.get(this.key(ctx, id)))
      .filter((a): a is CopyAnalysis => Boolean(a));
  }

  async getCreativeAnalysis(
    ctx: SessionContext,
    creativeId: string,
  ): Promise<CreativeAnalysis | null> {
    return store().creativeAnalyses.get(this.key(ctx, creativeId)) ?? null;
  }

  async saveCreativeAnalysis(
    ctx: SessionContext,
    analysis: CreativeAnalysis,
  ): Promise<CreativeAnalysis> {
    const record = { ...analysis, workspaceId: ctx.workspace.id };
    store().creativeAnalyses.set(this.key(ctx, analysis.creativeId), record);
    return record;
  }

  async getTranscription(ctx: SessionContext, creativeId: string): Promise<Transcription | null> {
    return store().transcriptions.get(this.key(ctx, creativeId)) ?? null;
  }

  async saveTranscription(
    ctx: SessionContext,
    transcription: Transcription,
  ): Promise<Transcription> {
    const record = { ...transcription, workspaceId: ctx.workspace.id };
    store().transcriptions.set(this.key(ctx, transcription.creativeId), record);
    return record;
  }

  async saveInsightReport(
    ctx: SessionContext,
    report: InsightReport,
    meta: { title?: string | null; query?: string | null; adIds: string[] },
  ): Promise<InsightReport> {
    const record: InsightReport = {
      ...report,
      id: report.id.startsWith("insight_") ? report.id : nextId("insight"),
      workspaceId: ctx.workspace.id,
    };
    store().insightReports.push(record);
    void meta;
    return record;
  }

  async listInsightReports(ctx: SessionContext, limit = 20): Promise<InsightReport[]> {
    return store()
      .insightReports.filter((r) => r.workspaceId === ctx.workspace.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getInsightReport(ctx: SessionContext, id: string): Promise<InsightReport | null> {
    return (
      store().insightReports.find((r) => r.id === id && r.workspaceId === ctx.workspace.id) ??
      null
    );
  }
}

/* ================================================================ buscas == */

export class MemorySearchRepository implements SearchRepository {
  async record(
    ctx: SessionContext,
    input: Omit<SearchRecord, "id" | "createdAt" | "workspaceId" | "userId">,
    adIds: string[],
  ): Promise<SearchRecord> {
    const s = store();
    const record: SearchRecord = {
      ...input,
      id: nextId("search"),
      workspaceId: ctx.workspace.id,
      userId: ctx.user.id,
      createdAt: new Date().toISOString(),
    };
    s.searches.unshift(record);
    s.searchResults.set(record.id, adIds);
    // Histórico não precisa crescer para sempre no driver de memória.
    if (s.searches.length > 200) s.searches.length = 200;
    return record;
  }

  async listRecent(ctx: SessionContext, limit = 12): Promise<SearchRecord[]> {
    return store()
      .searches.filter((s) => s.workspaceId === ctx.workspace.id)
      .slice(0, limit);
  }

  async countInCurrentPeriod(ctx: SessionContext): Promise<number> {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return store().searches.filter(
      (s) => s.workspaceId === ctx.workspace.id && new Date(s.createdAt) >= start,
    ).length;
  }
}

/* ======================================================= consumo e logs == */

export class MemoryUsageRepository implements UsageRepository {
  async increment(ctx: SessionContext, metric: UsageMetric, amount = 1): Promise<number> {
    const s = store();
    const key = `${ctx.workspace.id}:${metric}:${periodKey()}`;
    const next = (s.usage.get(key) ?? 0) + amount;
    s.usage.set(key, next);
    return next;
  }

  async current(ctx: SessionContext, metric: UsageMetric): Promise<number> {
    return store().usage.get(`${ctx.workspace.id}:${metric}:${periodKey()}`) ?? 0;
  }

  async snapshot(ctx: SessionContext): Promise<UsageRecord[]> {
    const s = store();
    const period = periodKey();
    const out: UsageRecord[] = [];
    for (const [key, amount] of s.usage) {
      const [workspaceId, metric, recordPeriod] = key.split(":");
      if (workspaceId !== ctx.workspace.id || recordPeriod !== period) continue;
      out.push({
        id: key,
        workspaceId: ctx.workspace.id,
        metric: metric as UsageMetric,
        period,
        amount,
        updatedAt: new Date().toISOString(),
      });
    }
    return out;
  }
}

export class MemoryLogRepository implements LogRepository {
  async append(entry: LogEntryInput): Promise<void> {
    const s = store();
    s.logs.unshift({ ...entry, id: nextId("log"), createdAt: new Date().toISOString() });
    if (s.logs.length > 1000) s.logs.length = 1000;
  }

  async list(
    options: {
      limit?: number;
      level?: LogEntryInput["level"];
      scope?: string;
      workspaceId?: string;
    } = {},
  ): Promise<LogRecord[]> {
    return store()
      .logs.filter(
        (log) =>
          (!options.level || log.level === options.level) &&
          (!options.scope || log.scope === options.scope) &&
          (!options.workspaceId || log.workspaceId === options.workspaceId),
      )
      .slice(0, options.limit ?? 100);
  }
}

/* ============================================================ workspaces == */

export class MemoryWorkspaceRepository implements WorkspaceRepository {
  async getWorkspace(id: string): Promise<Workspace | null> {
    return store().workspaces.find((w) => w.id === id) ?? null;
  }

  async listWorkspacesOfUser(userId: string): Promise<Workspace[]> {
    const s = store();
    const ids = new Set(s.members.filter((m) => m.userId === userId).map((m) => m.workspaceId));
    return s.workspaces.filter((w) => ids.has(w.id));
  }

  async listMembers(ctx: SessionContext): Promise<WorkspaceMember[]> {
    return store().members.filter((m) => m.workspaceId === ctx.workspace.id);
  }

  async getSubscription(ctx: SessionContext): Promise<Subscription | null> {
    return store().subscriptions.find((s) => s.workspaceId === ctx.workspace.id) ?? null;
  }

  async updatePlan(ctx: SessionContext, planId: PlanId): Promise<Workspace> {
    if (ROLE_RANK[ctx.role] < ROLE_RANK.admin) throw new ForbiddenError();
    const workspace = await this.getWorkspace(ctx.workspace.id);
    if (!workspace) throw new NotFoundError("Workspace", ctx.workspace.id);
    workspace.planId = planId;
    const subscription = await this.getSubscription(ctx);
    if (subscription) subscription.planId = planId;
    return workspace;
  }

  async listAllWorkspaces(limit = 100): Promise<Array<Workspace & { memberCount: number }>> {
    const s = store();
    return s.workspaces.slice(0, limit).map((w) => ({
      ...w,
      memberCount: s.members.filter((m) => m.workspaceId === w.id).length,
    }));
  }

  async listAllUsers(limit = 100): Promise<AppUser[]> {
    return store().users.slice(0, limit);
  }
}
