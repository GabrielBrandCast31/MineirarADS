import type { Ad, AdEnriched, AdSnapshot } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type {
  CopyAnalysis,
  CreativeAnalysis,
  InsightReport,
  Transcription,
} from "@/core/types/analysis";
import type { Offer, OfferEnriched } from "@/core/types/offer";
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
import type { SearchAdsParams, SearchRecord, SortOption } from "@/core/types/search";
import type {
  AppUser,
  SessionContext,
  Subscription,
  UsageMetric,
  UsageRecord,
  Workspace,
  WorkspaceMember,
} from "@/core/types/workspace";
import type { Paginated } from "@/core/types/common";

/* ------------------------------------------------------------- catálogo -- */

export interface CatalogQuery extends SearchAdsParams {
  /** Ordenação aplicada após o cálculo de score. */
  sort?: SortOption;
}

export interface CatalogRepository {
  /** Consulta o catálogo já persistido (não chama provider externo). */
  queryAds(ctx: SessionContext, query: CatalogQuery): Promise<Paginated<AdEnriched>>;
  getAd(ctx: SessionContext, id: string): Promise<AdEnriched | null>;
  getAdsByIds(ctx: SessionContext, ids: string[]): Promise<AdEnriched[]>;

  getAdvertiser(ctx: SessionContext, id: string): Promise<Advertiser | null>;
  /**
   * Busca pela chave natural da Meta (`page_id`).
   *
   * É o que permite partir de um link colado da Biblioteca de Anúncios: o link
   * traz o `page_id`, não o nosso identificador interno.
   */
  findAdvertiserByMetaPageId(
    ctx: SessionContext,
    metaPageId: string,
  ): Promise<Advertiser | null>;
  listAdvertisers(
    ctx: SessionContext,
    options?: { limit?: number; query?: string },
  ): Promise<Advertiser[]>;
  listAdsByAdvertiser(ctx: SessionContext, advertiserId: string, limit?: number): Promise<AdEnriched[]>;
  listOffersByAdvertiser(ctx: SessionContext, advertiserId: string): Promise<OfferEnriched[]>;

  getOffer(ctx: SessionContext, id: string): Promise<OfferEnriched | null>;
  listAdsByOffer(ctx: SessionContext, offerId: string, limit?: number): Promise<AdEnriched[]>;
  listTopOffers(ctx: SessionContext, limit?: number): Promise<OfferEnriched[]>;

  /**
   * Persiste (upsert) o que veio de um provider externo.
   * Deduplicação por `metaAdArchiveId`.
   */
  upsertBatch(
    ctx: SessionContext,
    payload: { advertisers?: Advertiser[]; offers?: Offer[]; ads?: Ad[] },
  ): Promise<{ ads: number; advertisers: number; offers: number }>;

  appendAdSnapshot(ctx: SessionContext, snapshot: AdSnapshot): Promise<void>;
  listAdSnapshots(ctx: SessionContext, adId: string, limit?: number): Promise<AdSnapshot[]>;
}

/* ------------------------------------------------------------ biblioteca -- */

export interface LibraryRepository {
  listCollections(ctx: SessionContext): Promise<Collection[]>;
  getCollection(ctx: SessionContext, id: string): Promise<Collection | null>;
  createCollection(
    ctx: SessionContext,
    input: { name: string; description?: string | null; color?: string },
  ): Promise<Collection>;
  updateCollection(
    ctx: SessionContext,
    id: string,
    patch: Partial<Pick<Collection, "name" | "description" | "color">>,
  ): Promise<Collection>;
  deleteCollection(ctx: SessionContext, id: string): Promise<void>;

  listItems(ctx: SessionContext, collectionId: string): Promise<CollectionItem[]>;
  addItem(
    ctx: SessionContext,
    input: { collectionId: string; kind: CollectionItemKind; entityId: string; note?: string | null },
  ): Promise<CollectionItem>;
  removeItem(ctx: SessionContext, itemId: string): Promise<void>;
  /** Coleções em que a entidade já está salva — usado para marcar cards. */
  collectionsContaining(
    ctx: SessionContext,
    kind: CollectionItemKind,
    entityId: string,
  ): Promise<string[]>;
  savedEntityIds(ctx: SessionContext, kind: CollectionItemKind): Promise<Set<string>>;

  listTags(ctx: SessionContext): Promise<Tag[]>;
  createTag(ctx: SessionContext, name: string, color?: string): Promise<Tag>;
  setAdTags(ctx: SessionContext, adId: string, tagIds: string[]): Promise<void>;
  tagsOfAd(ctx: SessionContext, adId: string): Promise<Tag[]>;
}

/* --------------------------------------------------------- monitoramento -- */

export interface MonitoringRepository {
  listMonitors(ctx: SessionContext): Promise<Monitor[]>;
  /** Ativos cuja próxima coleta já venceu — a fila de trabalho da varredura. */
  listDueMonitors(
    ctx: SessionContext,
    options?: { limit?: number; now?: string },
  ): Promise<Monitor[]>;
  getMonitor(ctx: SessionContext, id: string): Promise<Monitor | null>;
  findMonitor(
    ctx: SessionContext,
    target: MonitorTarget,
    entityId: string,
  ): Promise<Monitor | null>;
  createMonitor(
    ctx: SessionContext,
    input: {
      target: MonitorTarget;
      entityId: string;
      entityLabel: string;
      entityThumbnail?: string | null;
      frequency?: MonitorFrequency;
    },
  ): Promise<Monitor>;
  setMonitorActive(ctx: SessionContext, id: string, active: boolean): Promise<Monitor>;
  deleteMonitor(ctx: SessionContext, id: string): Promise<void>;
  monitoredEntityIds(ctx: SessionContext, target: MonitorTarget): Promise<Set<string>>;

  listSnapshots(ctx: SessionContext, monitorId: string, limit?: number): Promise<MonitoringSnapshot[]>;
  appendSnapshot(
    ctx: SessionContext,
    snapshot: Omit<MonitoringSnapshot, "id">,
  ): Promise<MonitoringSnapshot>;

  listEvents(
    ctx: SessionContext,
    options?: { monitorId?: string; limit?: number; onlyUnseen?: boolean },
  ): Promise<MonitoringEvent[]>;
  appendEvents(
    ctx: SessionContext,
    events: Array<Omit<MonitoringEvent, "id" | "createdAt" | "workspaceId">>,
  ): Promise<MonitoringEvent[]>;
  markEventsSeen(ctx: SessionContext, ids: string[]): Promise<void>;

  listNotifications(ctx: SessionContext, limit?: number): Promise<Notification[]>;
  markNotificationRead(ctx: SessionContext, id: string): Promise<void>;
}

/* -------------------------------------------------------------- análises -- */

export interface AnalysisRepository {
  getCopyAnalysis(ctx: SessionContext, adId: string): Promise<CopyAnalysis | null>;
  saveCopyAnalysis(ctx: SessionContext, analysis: CopyAnalysis): Promise<CopyAnalysis>;
  getCopyAnalysesForAds(ctx: SessionContext, adIds: string[]): Promise<CopyAnalysis[]>;

  getCreativeAnalysis(ctx: SessionContext, creativeId: string): Promise<CreativeAnalysis | null>;
  saveCreativeAnalysis(ctx: SessionContext, analysis: CreativeAnalysis): Promise<CreativeAnalysis>;

  getTranscription(ctx: SessionContext, creativeId: string): Promise<Transcription | null>;
  saveTranscription(ctx: SessionContext, transcription: Transcription): Promise<Transcription>;

  saveInsightReport(
    ctx: SessionContext,
    report: InsightReport,
    meta: { title?: string | null; query?: string | null; adIds: string[] },
  ): Promise<InsightReport>;
  listInsightReports(ctx: SessionContext, limit?: number): Promise<InsightReport[]>;
  getInsightReport(ctx: SessionContext, id: string): Promise<InsightReport | null>;
}

/* --------------------------------------------------------------- buscas --- */

export interface SearchRepository {
  record(
    ctx: SessionContext,
    input: Omit<SearchRecord, "id" | "createdAt" | "workspaceId" | "userId">,
    adIds: string[],
  ): Promise<SearchRecord>;
  listRecent(ctx: SessionContext, limit?: number): Promise<SearchRecord[]>;
  countInCurrentPeriod(ctx: SessionContext): Promise<number>;
}

/* ------------------------------------------------------- consumo e logs --- */

export interface UsageRepository {
  increment(ctx: SessionContext, metric: UsageMetric, amount?: number): Promise<number>;
  current(ctx: SessionContext, metric: UsageMetric): Promise<number>;
  snapshot(ctx: SessionContext): Promise<UsageRecord[]>;
}

export interface LogEntryInput {
  level: "debug" | "info" | "warn" | "error";
  scope: string;
  message: string;
  context?: Record<string, unknown>;
  workspaceId?: string | null;
  userId?: string | null;
}

export interface LogRecord extends LogEntryInput {
  id: string;
  createdAt: string;
}

export interface LogRepository {
  append(entry: LogEntryInput): Promise<void>;
  list(options?: {
    limit?: number;
    level?: LogEntryInput["level"];
    scope?: string;
    workspaceId?: string;
  }): Promise<LogRecord[]>;
}

/* ------------------------------------------------------------ workspaces -- */

export interface WorkspaceRepository {
  getWorkspace(id: string): Promise<Workspace | null>;
  listWorkspacesOfUser(userId: string): Promise<Workspace[]>;
  listMembers(ctx: SessionContext): Promise<WorkspaceMember[]>;
  getSubscription(ctx: SessionContext): Promise<Subscription | null>;
  updatePlan(ctx: SessionContext, planId: Workspace["planId"]): Promise<Workspace>;
  /** Só o painel administrativo usa. */
  listAllWorkspaces(limit?: number): Promise<Array<Workspace & { memberCount: number }>>;
  listAllUsers(limit?: number): Promise<AppUser[]>;
}

/* -------------------------------------------------------------- conjunto -- */

export interface Repositories {
  readonly driver: "memory" | "supabase";
  readonly catalog: CatalogRepository;
  readonly library: LibraryRepository;
  readonly monitoring: MonitoringRepository;
  readonly analysis: AnalysisRepository;
  readonly searches: SearchRepository;
  readonly usage: UsageRepository;
  readonly logs: LogRepository;
  readonly workspaces: WorkspaceRepository;
}

export class RepositoryError extends Error {
  override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.cause = cause;
    this.name = "RepositoryError";
  }
}

export class NotFoundError extends RepositoryError {
  constructor(entity: string, id: string) {
    super(`${entity} não encontrado: ${id}`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends RepositoryError {
  constructor(message = "Você não tem permissão para esta ação neste workspace.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
