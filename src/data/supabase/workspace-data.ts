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
import { nextCheckAtFor } from "@/core/types/monitoring";
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
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  NotFoundError,
  RepositoryError,
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
import {
  toCollection,
  toCollectionItem,
  toMonitor,
  toMonitoringEvent,
  toMonitoringSnapshot,
  toNotification,
  toSearchRecord,
  toSubscription,
  toTag,
  toWorkspace,
  toWorkspaceMember,
  type Row,
} from "./mappers";

/**
 * Repositórios de dados do cliente sobre Postgres.
 *
 * Todos usam o cliente com sessão do usuário: o isolamento entre workspaces é
 * garantido pela RLS, não por `where workspace_id = ...` espalhado no código.
 * O filtro explícito ainda aparece onde ajuda o planejador — mas ele nunca é a
 * única linha de defesa.
 */

const fail = (context: string, error: { message: string } | null): void => {
  if (error) throw new RepositoryError(`${context}: ${error.message}`, error);
};

/* ============================================================= biblioteca == */

export class SupabaseLibraryRepository implements LibraryRepository {
  async listCollections(ctx: SessionContext): Promise<Collection[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_items ( id, kind, entity_id )")
      .eq("workspace_id", ctx.workspace.id)
      .order("updated_at", { ascending: false });
    fail("Falha ao listar coleções", error);

    return (data ?? []).map((row: Row) =>
      toCollection({ ...row, item_count: (row.collection_items ?? []).length }),
    );
  }

  async getCollection(ctx: SessionContext, id: string): Promise<Collection | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collections")
      .select("*, collection_items ( id )")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    fail("Falha ao ler coleção", error);
    return data
      ? toCollection({ ...data, item_count: ((data as Row).collection_items ?? []).length })
      : null;
  }

  async createCollection(
    ctx: SessionContext,
    input: { name: string; description?: string | null; color?: string },
  ): Promise<Collection> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collections")
      .upsert(
        {
          workspace_id: ctx.workspace.id,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? "brand",
          created_by: ctx.user.id,
        },
        { onConflict: "workspace_id,name" },
      )
      .select("*")
      .single();
    fail("Falha ao criar coleção", error);
    return toCollection(data as Row);
  }

  async updateCollection(
    ctx: SessionContext,
    id: string,
    patch: Partial<Pick<Collection, "name" | "description" | "color">>,
  ): Promise<Collection> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collections")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      })
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .select("*")
      .maybeSingle();
    fail("Falha ao atualizar coleção", error);
    if (!data) throw new NotFoundError("Coleção", id);
    return toCollection(data as Row);
  }

  async deleteCollection(ctx: SessionContext, id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao remover coleção", error);
  }

  async listItems(ctx: SessionContext, collectionId: string): Promise<CollectionItem[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_items")
      .select("*")
      .eq("collection_id", collectionId)
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false });
    fail("Falha ao listar itens", error);
    return (data ?? []).map((row: Row) => toCollectionItem(row));
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
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_items")
      .upsert(
        {
          collection_id: input.collectionId,
          workspace_id: ctx.workspace.id,
          kind: input.kind,
          entity_id: input.entityId,
          note: input.note ?? null,
          added_by: ctx.user.id,
        },
        { onConflict: "collection_id,kind,entity_id" },
      )
      .select("*")
      .single();
    fail("Falha ao salvar item", error);
    return toCollectionItem(data as Row);
  }

  async removeItem(ctx: SessionContext, itemId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("collection_items")
      .delete()
      .eq("id", itemId)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao remover item", error);
  }

  async collectionsContaining(
    ctx: SessionContext,
    kind: CollectionItemKind,
    entityId: string,
  ): Promise<string[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_items")
      .select("collection_id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("kind", kind)
      .eq("entity_id", entityId);
    fail("Falha ao verificar coleções", error);
    return (data ?? []).map((row: Row) => row.collection_id);
  }

  async savedEntityIds(ctx: SessionContext, kind: CollectionItemKind): Promise<Set<string>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("collection_items")
      .select("entity_id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("kind", kind);
    fail("Falha ao listar itens salvos", error);
    return new Set((data ?? []).map((row: Row) => row.entity_id));
  }

  async listTags(ctx: SessionContext): Promise<Tag[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tags")
      .select("*, ad_tags ( ad_id )")
      .eq("workspace_id", ctx.workspace.id)
      .order("name");
    fail("Falha ao listar tags", error);
    return (data ?? []).map((row: Row) =>
      toTag({ ...row, usage_count: (row.ad_tags ?? []).length }),
    );
  }

  async createTag(ctx: SessionContext, name: string, color = "brand"): Promise<Tag> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tags")
      .upsert(
        { workspace_id: ctx.workspace.id, name: name.trim().toLowerCase(), color },
        { onConflict: "workspace_id,name" },
      )
      .select("*")
      .single();
    fail("Falha ao criar tag", error);
    return toTag(data as Row);
  }

  async setAdTags(ctx: SessionContext, adId: string, tagIds: string[]): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error: deleteError } = await supabase
      .from("ad_tags")
      .delete()
      .eq("ad_id", adId)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao limpar tags", deleteError);

    if (tagIds.length === 0) return;
    const { error } = await supabase.from("ad_tags").insert(
      tagIds.map((tagId) => ({
        workspace_id: ctx.workspace.id,
        ad_id: adId,
        tag_id: tagId,
      })),
    );
    fail("Falha ao aplicar tags", error);
  }

  async tagsOfAd(ctx: SessionContext, adId: string): Promise<Tag[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ad_tags")
      .select("tag:tags ( * )")
      .eq("ad_id", adId)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao ler tags do anúncio", error);
    return (data ?? [])
      .map((row: Row) => (Array.isArray(row.tag) ? row.tag[0] : row.tag))
      .filter(Boolean)
      .map((row: Row) => toTag(row));
  }
}

/* ========================================================= monitoramento == */

export class SupabaseMonitoringRepository implements MonitoringRepository {
  async listMonitors(ctx: SessionContext): Promise<Monitor[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .select("*, monitoring_events ( id, seen )")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false });
    fail("Falha ao listar monitoramentos", error);

    return (data ?? []).map((row: Row) =>
      toMonitor({
        ...row,
        unseen_events: (row.monitoring_events ?? []).filter((e: Row) => !e.seen).length,
      }),
    );
  }

  /** Usa o índice parcial `monitors_due_idx` (ativos, ordenados por vencimento). */
  async listDueMonitors(
    ctx: SessionContext,
    options: { limit?: number; now?: string } = {},
  ): Promise<Monitor[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .eq("active", true)
      .lte("next_check_at", options.now ?? new Date().toISOString())
      .order("next_check_at", { ascending: true })
      .limit(options.limit ?? 25);
    fail("Falha ao listar monitoramentos vencidos", error);
    return (data ?? []).map((row: Row) => toMonitor(row));
  }

  async getMonitor(ctx: SessionContext, id: string): Promise<Monitor | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    fail("Falha ao ler monitoramento", error);
    return data ? toMonitor(data as Row) : null;
  }

  async findMonitor(
    ctx: SessionContext,
    target: MonitorTarget,
    entityId: string,
  ): Promise<Monitor | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .eq("target", target)
      .eq("entity_id", entityId)
      .maybeSingle();
    fail("Falha ao buscar monitoramento", error);
    return data ? toMonitor(data as Row) : null;
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
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .upsert(
        {
          workspace_id: ctx.workspace.id,
          target: input.target,
          entity_id: input.entityId,
          entity_label: input.entityLabel,
          entity_thumbnail: input.entityThumbnail ?? null,
          frequency: input.frequency ?? "daily",
          created_by: ctx.user.id,
        },
        { onConflict: "workspace_id,target,entity_id" },
      )
      .select("*")
      .single();
    fail("Falha ao criar monitoramento", error);
    return toMonitor(data as Row);
  }

  async setMonitorActive(ctx: SessionContext, id: string, active: boolean): Promise<Monitor> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .update({ active })
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .select("*")
      .maybeSingle();
    fail("Falha ao atualizar monitoramento", error);
    if (!data) throw new NotFoundError("Monitoramento", id);
    return toMonitor(data as Row);
  }

  async deleteMonitor(ctx: SessionContext, id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("monitors")
      .delete()
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao remover monitoramento", error);
  }

  async monitoredEntityIds(ctx: SessionContext, target: MonitorTarget): Promise<Set<string>> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitors")
      .select("entity_id")
      .eq("workspace_id", ctx.workspace.id)
      .eq("target", target);
    fail("Falha ao listar alvos monitorados", error);
    return new Set((data ?? []).map((row: Row) => row.entity_id));
  }

  async listSnapshots(
    ctx: SessionContext,
    monitorId: string,
    limit = 60,
  ): Promise<MonitoringSnapshot[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitoring_snapshots")
      .select("*")
      .eq("monitor_id", monitorId)
      .eq("workspace_id", ctx.workspace.id)
      .order("captured_at", { ascending: false })
      .limit(limit);
    fail("Falha ao ler linha do tempo", error);
    // A interface espera ordem cronológica crescente.
    return (data ?? []).map((row: Row) => toMonitoringSnapshot(row)).reverse();
  }

  async appendSnapshot(
    ctx: SessionContext,
    snapshot: Omit<MonitoringSnapshot, "id">,
  ): Promise<MonitoringSnapshot> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitoring_snapshots")
      .insert({
        monitor_id: snapshot.monitorId,
        workspace_id: ctx.workspace.id,
        captured_at: snapshot.capturedAt,
        ad_count: snapshot.adCount,
        active_ad_count: snapshot.activeAdCount,
        creative_count: snapshot.creativeCount,
        content_hash: snapshot.contentHash,
      })
      .select("*")
      .single();
    fail("Falha ao gravar snapshot", error);

    // O intervalo sai do core: "semanal" precisa valer 7 dias aqui e no driver
    // em memória, senão a mesma escolha do usuário significaria coisas diferentes.
    const frequency = (await this.getMonitor(ctx, snapshot.monitorId))?.frequency ?? "daily";
    await supabase
      .from("monitors")
      .update({
        last_checked_at: snapshot.capturedAt,
        next_check_at: nextCheckAtFor(frequency, snapshot.capturedAt),
      })
      .eq("id", snapshot.monitorId);

    return toMonitoringSnapshot(data as Row);
  }

  async listEvents(
    ctx: SessionContext,
    options: { monitorId?: string; limit?: number; onlyUnseen?: boolean } = {},
  ): Promise<MonitoringEvent[]> {
    const supabase = await createSupabaseServerClient();
    let builder = supabase
      .from("monitoring_events")
      .select("*")
      .eq("workspace_id", ctx.workspace.id);
    if (options.monitorId) builder = builder.eq("monitor_id", options.monitorId);
    if (options.onlyUnseen) builder = builder.eq("seen", false);

    const { data, error } = await builder
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 50);
    fail("Falha ao listar eventos", error);
    return (data ?? []).map((row: Row) => toMonitoringEvent(row));
  }

  async appendEvents(
    ctx: SessionContext,
    events: Array<Omit<MonitoringEvent, "id" | "createdAt" | "workspaceId">>,
  ): Promise<MonitoringEvent[]> {
    if (events.length === 0) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("monitoring_events")
      .insert(
        events.map((event) => ({
          workspace_id: ctx.workspace.id,
          monitor_id: event.monitorId,
          type: event.type,
          severity: event.severity,
          title: event.title,
          description: event.description,
          payload: event.payload,
          related_ad_id: event.relatedAdId,
          seen: event.seen,
        })),
      )
      .select("*");
    fail("Falha ao gravar eventos", error);
    // A notificação in-app é criada pelo trigger `notify_monitoring_event`.
    return (data ?? []).map((row: Row) => toMonitoringEvent(row));
  }

  async markEventsSeen(ctx: SessionContext, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("monitoring_events")
      .update({ seen: true })
      .in("id", ids)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao marcar eventos", error);
  }

  async listNotifications(ctx: SessionContext, limit = 20): Promise<Notification[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    fail("Falha ao listar notificações", error);
    return (data ?? []).map((row: Row) => toNotification(row));
  }

  async markNotificationRead(ctx: SessionContext, id: string): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao marcar notificação", error);
  }
}

/* ============================================================== análises == */

export class SupabaseAnalysisRepository implements AnalysisRepository {
  async getCopyAnalysis(ctx: SessionContext, adId: string): Promise<CopyAnalysis | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("copy_analysis")
      .select("*")
      .eq("ad_id", adId)
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail("Falha ao ler análise de copy", error);
    return data ? rowToCopyAnalysis(data as Row) : null;
  }

  async saveCopyAnalysis(ctx: SessionContext, analysis: CopyAnalysis): Promise<CopyAnalysis> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("copy_analysis")
      .upsert(
        {
          workspace_id: ctx.workspace.id,
          ad_id: analysis.adId,
          engine: analysis.engine,
          hook: analysis.hook,
          hook_type: analysis.hookType,
          problem: analysis.problem,
          promise: analysis.promise,
          mechanism: analysis.mechanism,
          benefits: analysis.benefits,
          proof: analysis.proof,
          objections: analysis.objections,
          cta: analysis.cta,
          specificity: analysis.specificity,
          structure: analysis.structure,
          emotions: analysis.emotions,
          dominant_emotion: analysis.dominantEmotion,
          metrics: analysis.metrics,
          created_by: ctx.user.id,
        },
        { onConflict: "workspace_id,ad_id,engine" },
      )
      .select("*")
      .single();
    fail("Falha ao gravar análise de copy", error);
    return rowToCopyAnalysis(data as Row);
  }

  async getCopyAnalysesForAds(ctx: SessionContext, adIds: string[]): Promise<CopyAnalysis[]> {
    if (adIds.length === 0) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("copy_analysis")
      .select("*")
      .in("ad_id", adIds)
      .eq("workspace_id", ctx.workspace.id);
    fail("Falha ao ler análises", error);
    return (data ?? []).map((row: Row) => rowToCopyAnalysis(row));
  }

  async getCreativeAnalysis(
    ctx: SessionContext,
    creativeId: string,
  ): Promise<CreativeAnalysis | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("creative_analysis")
      .select("*")
      .eq("creative_id", creativeId)
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    fail("Falha ao ler análise de criativo", error);
    return data ? rowToCreativeAnalysis(data as Row) : null;
  }

  async saveCreativeAnalysis(
    ctx: SessionContext,
    analysis: CreativeAnalysis,
  ): Promise<CreativeAnalysis> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("creative_analysis")
      .upsert(
        {
          workspace_id: ctx.workspace.id,
          creative_id: analysis.creativeId,
          ad_id: analysis.adId,
          engine: analysis.engine,
          format: analysis.format,
          aspect_ratio: analysis.aspectRatio,
          duration_seconds: analysis.durationSeconds,
          has_person: analysis.hasPerson,
          has_on_screen_text: analysis.hasOnScreenText,
          has_captions: analysis.hasCaptions,
          has_product: analysis.hasProduct,
          text_density: analysis.textDensity,
          visual_headline: analysis.visualHeadline,
          visual_cta: analysis.visualCta,
          opening_beats: analysis.openingBeats,
          visual_structure: analysis.visualStructure,
          created_by: ctx.user.id,
        },
        { onConflict: "workspace_id,creative_id,engine" },
      )
      .select("*")
      .single();
    fail("Falha ao gravar análise de criativo", error);
    return rowToCreativeAnalysis(data as Row);
  }

  async getTranscription(ctx: SessionContext, creativeId: string): Promise<Transcription | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("creative_id", creativeId)
      .eq("workspace_id", ctx.workspace.id)
      .limit(1)
      .maybeSingle();
    fail("Falha ao ler transcrição", error);
    return data ? rowToTranscription(data as Row) : null;
  }

  async saveTranscription(
    ctx: SessionContext,
    transcription: Transcription,
  ): Promise<Transcription> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("transcriptions")
      .upsert(
        {
          workspace_id: ctx.workspace.id,
          creative_id: transcription.creativeId,
          ad_id: transcription.adId,
          engine: transcription.engine,
          language: transcription.language,
          full_text: transcription.fullText,
          segments: transcription.segments,
          summary: transcription.summary,
          hook_segment: transcription.hookSegment,
          cta_segment: transcription.ctaSegment,
          duration_seconds: transcription.durationSeconds,
          created_by: ctx.user.id,
        },
        { onConflict: "workspace_id,creative_id,engine" },
      )
      .select("*")
      .single();
    fail("Falha ao gravar transcrição", error);
    return rowToTranscription(data as Row);
  }

  async saveInsightReport(
    ctx: SessionContext,
    report: InsightReport,
    meta: { title?: string | null; query?: string | null; adIds: string[] },
  ): Promise<InsightReport> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("insight_reports")
      .insert({
        workspace_id: ctx.workspace.id,
        engine: report.engine,
        title: meta.title ?? null,
        query: meta.query ?? null,
        sample_size: report.sampleSize,
        ad_ids: meta.adIds,
        payload: report,
        created_by: ctx.user.id,
      })
      .select("*")
      .single();
    fail("Falha ao gravar relatório", error);
    return { ...(((data as Row).payload ?? report) as InsightReport), id: (data as Row).id };
  }

  async listInsightReports(ctx: SessionContext, limit = 20): Promise<InsightReport[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("insight_reports")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    fail("Falha ao listar relatórios", error);
    return (data ?? []).map((row: Row) => ({ ...(row.payload as InsightReport), id: row.id }));
  }

  async getInsightReport(ctx: SessionContext, id: string): Promise<InsightReport | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("insight_reports")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    fail("Falha ao ler relatório", error);
    return data
      ? { ...((data as Row).payload as InsightReport), id: (data as Row).id }
      : null;
  }
}

function rowToCopyAnalysis(row: Row): CopyAnalysis {
  return {
    id: row.id,
    adId: row.ad_id,
    workspaceId: row.workspace_id,
    engine: row.engine,
    hook: row.hook,
    hookType: row.hook_type,
    problem: row.problem,
    promise: row.promise,
    mechanism: row.mechanism,
    benefits: row.benefits,
    proof: row.proof,
    objections: row.objections,
    cta: row.cta,
    specificity: row.specificity,
    structure: row.structure,
    emotions: row.emotions,
    dominantEmotion: row.dominant_emotion,
    metrics: row.metrics ?? {},
    createdAt: row.created_at,
  } as CopyAnalysis;
}

function rowToCreativeAnalysis(row: Row): CreativeAnalysis {
  return {
    id: row.id,
    creativeId: row.creative_id,
    adId: row.ad_id,
    workspaceId: row.workspace_id,
    engine: row.engine,
    format: row.format,
    aspectRatio: row.aspect_ratio,
    durationSeconds: row.duration_seconds,
    hasPerson: row.has_person,
    hasOnScreenText: row.has_on_screen_text,
    hasCaptions: row.has_captions,
    hasProduct: row.has_product,
    textDensity: row.text_density,
    visualHeadline: row.visual_headline,
    visualCta: row.visual_cta,
    openingBeats: row.opening_beats,
    visualStructure: row.visual_structure,
    createdAt: row.created_at,
  } as CreativeAnalysis;
}

function rowToTranscription(row: Row): Transcription {
  return {
    id: row.id,
    creativeId: row.creative_id,
    adId: row.ad_id,
    workspaceId: row.workspace_id,
    engine: row.engine,
    language: row.language,
    fullText: row.full_text ?? "",
    segments: row.segments ?? [],
    summary: row.summary,
    hookSegment: row.hook_segment,
    ctaSegment: row.cta_segment,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    createdAt: row.created_at,
  } as Transcription;
}

/* ================================================================ buscas == */

export class SupabaseSearchRepository implements SearchRepository {
  async record(
    ctx: SessionContext,
    input: Omit<SearchRecord, "id" | "createdAt" | "workspaceId" | "userId">,
    adIds: string[],
  ): Promise<SearchRecord> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("searches")
      .insert({
        workspace_id: ctx.workspace.id,
        user_id: ctx.user.id,
        params: input.params,
        provider: input.provider,
        result_count: input.resultCount,
        duration_ms: input.durationMs,
        status: input.status,
        error_message: input.errorMessage,
      })
      .select("*")
      .single();
    fail("Falha ao registrar busca", error);

    if (adIds.length > 0) {
      await supabase.from("search_results").insert(
        adIds.map((adId, index) => ({
          search_id: (data as Row).id,
          ad_id: adId,
          position: index,
        })),
      );
    }
    return toSearchRecord(data as Row);
  }

  async listRecent(ctx: SessionContext, limit = 12): Promise<SearchRecord[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("searches")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    fail("Falha ao listar buscas", error);
    return (data ?? []).map((row: Row) => toSearchRecord(row));
  }

  async countInCurrentPeriod(ctx: SessionContext): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from("searches")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", ctx.workspace.id)
      .gte("created_at", start.toISOString());
    fail("Falha ao contar buscas", error);
    return count ?? 0;
  }
}

/* ======================================================= consumo e logs == */

export class SupabaseUsageRepository implements UsageRepository {
  async increment(ctx: SessionContext, metric: UsageMetric, amount = 1): Promise<number> {
    const supabase = await createSupabaseServerClient();
    // Incremento atômico via função no banco — evita corrida de leitura/escrita.
    const { data, error } = await supabase.rpc("increment_usage", {
      ws: ctx.workspace.id,
      m: metric,
      delta: amount,
    });
    fail("Falha ao registrar consumo", error);
    return Number(data ?? 0);
  }

  async current(ctx: SessionContext, metric: UsageMetric): Promise<number> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("current_usage", {
      ws: ctx.workspace.id,
      m: metric,
    });
    fail("Falha ao ler consumo", error);
    return Number(data ?? 0);
  }

  async snapshot(ctx: SessionContext): Promise<UsageRecord[]> {
    const supabase = await createSupabaseServerClient();
    const period = new Date();
    period.setDate(1);

    const { data, error } = await supabase
      .from("usage")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .eq("period", period.toISOString().slice(0, 10));
    fail("Falha ao ler consumo", error);

    return (data ?? []).map((row: Row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      metric: row.metric,
      period: row.period,
      amount: Number(row.amount),
      updatedAt: row.updated_at,
    }));
  }
}

export class SupabaseLogRepository implements LogRepository {
  async append(entry: LogEntryInput): Promise<void> {
    // Logs são gravados com service role: a RLS de `logs` é somente leitura.
    const supabase = createSupabaseServiceClient();
    await supabase.from("logs").insert({
      workspace_id: entry.workspaceId ?? null,
      user_id: entry.userId ?? null,
      level: entry.level,
      scope: entry.scope,
      message: entry.message,
      context: entry.context ?? {},
    });
  }

  async list(
    options: {
      limit?: number;
      level?: LogEntryInput["level"];
      scope?: string;
      workspaceId?: string;
    } = {},
  ): Promise<LogRecord[]> {
    const supabase = createSupabaseServiceClient();
    let builder = supabase.from("logs").select("*");
    if (options.level) builder = builder.eq("level", options.level);
    if (options.scope) builder = builder.eq("scope", options.scope);
    if (options.workspaceId) builder = builder.eq("workspace_id", options.workspaceId);

    const { data } = await builder
      .order("created_at", { ascending: false })
      .limit(options.limit ?? 100);

    return (data ?? []).map((row: Row) => ({
      id: row.id,
      level: row.level,
      scope: row.scope,
      message: row.message,
      context: row.context ?? {},
      workspaceId: row.workspace_id ?? null,
      userId: row.user_id ?? null,
      createdAt: row.created_at,
    }));
  }
}

/* ============================================================ workspaces == */

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  async getWorkspace(id: string): Promise<Workspace | null> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("workspaces").select("*").eq("id", id).maybeSingle();
    return data ? toWorkspace(data as Row) : null;
  }

  async listWorkspacesOfUser(userId: string): Promise<Workspace[]> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("workspace_members")
      .select("workspace:workspaces ( * )")
      .eq("user_id", userId);
    return (data ?? [])
      .map((row: Row) => (Array.isArray(row.workspace) ? row.workspace[0] : row.workspace))
      .filter(Boolean)
      .map((row: Row) => toWorkspace(row));
  }

  async listMembers(ctx: SessionContext): Promise<WorkspaceMember[]> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("workspace_members")
      .select("*, profile:profiles ( email, name, avatar_url )")
      .eq("workspace_id", ctx.workspace.id);
    return (data ?? []).map((row: Row) => toWorkspaceMember(row));
  }

  async getSubscription(ctx: SessionContext): Promise<Subscription | null> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .maybeSingle();
    return data ? toSubscription(data as Row) : null;
  }

  async updatePlan(ctx: SessionContext, planId: PlanId): Promise<Workspace> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("workspaces")
      .update({ plan_id: planId })
      .eq("id", ctx.workspace.id)
      .select("*")
      .maybeSingle();
    fail("Falha ao atualizar plano", error);
    if (!data) throw new NotFoundError("Workspace", ctx.workspace.id);
    await supabase
      .from("subscriptions")
      .update({ plan_id: planId })
      .eq("workspace_id", ctx.workspace.id);
    return toWorkspace(data as Row);
  }

  /** Painel administrativo: service role, autorização feita na aplicação. */
  async listAllWorkspaces(limit = 100): Promise<Array<Workspace & { memberCount: number }>> {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("workspaces")
      .select("*, workspace_members ( user_id )")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row: Row) => ({
      ...toWorkspace(row),
      memberCount: (row.workspace_members ?? []).length,
    }));
  }

  async listAllUsers(limit = 100): Promise<AppUser[]> {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row: Row) => ({
      id: row.id,
      email: row.email,
      name: row.name ?? null,
      avatarUrl: row.avatar_url ?? null,
      createdAt: row.created_at,
    }));
  }
}
