import type { Ad, AdEnriched, AdSnapshot } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import type { Paginated } from "@/core/types/common";
import type { Offer, OfferEnriched } from "@/core/types/offer";
import type { SessionContext } from "@/core/types/workspace";
import { enrichAd } from "@/core/enrich";
import { computeAdScore, deriveScoreInput } from "@/core/score";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import { decodeCursor, encodeCursor, sortAds } from "@/data/memory/catalog";
import type { CatalogQuery, CatalogRepository } from "@/data/types";
import { RepositoryError } from "@/data/types";
import {
  fromAd,
  fromAdvertiser,
  fromOffer,
  one,
  toAd,
  toAdSnapshot,
  toAdvertiser,
  toOffer,
  type Row,
} from "./mappers";

const DAY = 86_400_000;

/** Colunas necessárias para montar um `AdEnriched` em uma única consulta. */
const AD_SELECT = `
  *,
  advertiser:advertisers ( id, name, avatar_url ),
  offer:offers ( id, name, stats ),
  creatives ( * )
`;

/**
 * Catálogo sobre Postgres.
 *
 * Leituras usam o cliente com sessão do usuário — a RLS decide o que ele vê
 * (registro global com `workspace_id IS NULL`, ou do próprio workspace).
 * Escritas de ingestão usam o service role, porque alimentam o catálogo
 * global, onde nenhum usuário tem permissão de escrita.
 */
export class SupabaseCatalogRepository implements CatalogRepository {
  async queryAds(ctx: SessionContext, query: CatalogQuery): Promise<Paginated<AdEnriched>> {
    const supabase = await createSupabaseServerClient();
    const limit = Math.min(96, Math.max(1, query.limit ?? 24));
    const offset = decodeCursor(query.cursor);
    const now = new Date();

    let builder = supabase.from("ads").select(AD_SELECT, { count: "exact" });

    if (query.query?.trim()) {
      // `websearch_to_tsquery` aceita a sintaxe que o usuário já conhece
      // ("aspas", -exclusão) sem precisar validar a entrada.
      builder = builder.textSearch(
        "fts",
        query.query.trim(),
        { type: "websearch", config: "portuguese" },
      );
    }
    if (query.status && query.status !== "all") builder = builder.eq("status", query.status);
    if (query.formats?.length) builder = builder.in("format", query.formats);
    if (query.countries?.length && !query.countries.includes("ALL")) {
      builder = builder.overlaps("countries", query.countries);
    }
    if (query.platforms?.length) builder = builder.overlaps("platforms", query.platforms);
    if (query.minActiveDays) builder = builder.gte("active_days", query.minActiveDays);
    if (query.minScore) builder = builder.gte("score", query.minScore);

    const range = resolveRange(query, now);
    if (range) {
      builder = builder.lte("started_at", new Date(range.to).toISOString());
      builder = builder.or(
        `ended_at.is.null,ended_at.gte.${new Date(range.from).toISOString()}`,
      );
    }
    if (query.advertiser?.trim()) {
      const { data: matches } = await supabase
        .from("advertisers")
        .select("id")
        .ilike("name", `%${query.advertiser.trim()}%`)
        .limit(50);
      const ids = (matches ?? []).map((row: Row) => row.id);
      if (ids.length === 0) {
        return { items: [], total: 0, nextCursor: null };
      }
      builder = builder.in("advertiser_id", ids);
    }

    // Ordenação no banco pelo score materializado; a ordenação fina é
    // reaplicada em memória sobre a página, com o score recalculado.
    builder = applyOrder(builder, query.sort ?? "score").range(offset, offset + limit - 1);

    const { data, error, count } = await builder;
    if (error) throw new RepositoryError(`Falha ao consultar anúncios: ${error.message}`, error);

    const [savedIds, monitoredIds] = await Promise.all([
      this.savedAdIds(ctx),
      this.monitoredAdIds(ctx),
    ]);

    const items = (data ?? []).map((row: Row) =>
      this.enrich(row, { savedIds, monitoredIds, now }),
    );
    const total = count ?? items.length;

    return {
      items: sortAds(items, query.sort ?? "score"),
      total,
      nextCursor: offset + items.length < total ? encodeCursor(offset + items.length) : null,
    };
  }

  async getAd(ctx: SessionContext, id: string): Promise<AdEnriched | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("ads").select(AD_SELECT).eq("id", id).maybeSingle();
    if (error) throw new RepositoryError(`Falha ao ler anúncio: ${error.message}`, error);
    if (!data) return null;

    const [savedIds, monitoredIds] = await Promise.all([
      this.savedAdIds(ctx),
      this.monitoredAdIds(ctx),
    ]);
    return this.enrich(data as Row, { savedIds, monitoredIds, now: new Date() });
  }

  async getAdsByIds(ctx: SessionContext, ids: string[]): Promise<AdEnriched[]> {
    if (ids.length === 0) return [];
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("ads").select(AD_SELECT).in("id", ids);
    if (error) throw new RepositoryError(`Falha ao ler anúncios: ${error.message}`, error);

    const [savedIds, monitoredIds] = await Promise.all([
      this.savedAdIds(ctx),
      this.monitoredAdIds(ctx),
    ]);
    const now = new Date();
    const byId = new Map(
      (data ?? []).map((row: Row) => [row.id, this.enrich(row, { savedIds, monitoredIds, now })]),
    );
    // Preserva a ordem pedida — o comparador depende disso.
    return ids.map((id) => byId.get(id)).filter((ad): ad is AdEnriched => Boolean(ad));
  }

  async getAdvertiser(_ctx: SessionContext, id: string): Promise<Advertiser | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("advertisers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new RepositoryError(`Falha ao ler anunciante: ${error.message}`, error);
    return data ? toAdvertiser(data as Row) : null;
  }

  async listAdvertisers(
    _ctx: SessionContext,
    options: { limit?: number; query?: string } = {},
  ): Promise<Advertiser[]> {
    const supabase = await createSupabaseServerClient();
    let builder = supabase.from("advertisers").select("*");
    if (options.query?.trim()) builder = builder.ilike("name", `%${options.query.trim()}%`);

    const { data, error } = await builder
      .order("stats->activeAds", { ascending: false })
      .limit(options.limit ?? 50);
    if (error) throw new RepositoryError(`Falha ao listar anunciantes: ${error.message}`, error);
    return (data ?? []).map((row: Row) => toAdvertiser(row));
  }

  async listAdsByAdvertiser(
    ctx: SessionContext,
    advertiserId: string,
    limit = 200,
  ): Promise<AdEnriched[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ads")
      .select(AD_SELECT)
      .eq("advertiser_id", advertiserId)
      .order("score", { ascending: false })
      .limit(limit);
    if (error) throw new RepositoryError(`Falha ao listar anúncios: ${error.message}`, error);

    const [savedIds, monitoredIds] = await Promise.all([
      this.savedAdIds(ctx),
      this.monitoredAdIds(ctx),
    ]);
    const now = new Date();
    return (data ?? []).map((row: Row) => this.enrich(row, { savedIds, monitoredIds, now }));
  }

  async listOffersByAdvertiser(
    _ctx: SessionContext,
    advertiserId: string,
  ): Promise<OfferEnriched[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("offers")
      .select("*, advertiser:advertisers ( id, name, avatar_url )")
      .eq("advertiser_id", advertiserId);
    if (error) throw new RepositoryError(`Falha ao listar ofertas: ${error.message}`, error);
    return (data ?? [])
      .map((row: Row) => enrichOffer(row))
      .sort((a, b) => b.stats.score - a.stats.score);
  }

  async getOffer(_ctx: SessionContext, id: string): Promise<OfferEnriched | null> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("offers")
      .select("*, advertiser:advertisers ( id, name, avatar_url )")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new RepositoryError(`Falha ao ler oferta: ${error.message}`, error);
    return data ? enrichOffer(data as Row) : null;
  }

  async listAdsByOffer(ctx: SessionContext, offerId: string, limit = 200): Promise<AdEnriched[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ads")
      .select(AD_SELECT)
      .eq("offer_id", offerId)
      .order("active_days", { ascending: false })
      .limit(limit);
    if (error) throw new RepositoryError(`Falha ao listar anúncios: ${error.message}`, error);

    const [savedIds, monitoredIds] = await Promise.all([
      this.savedAdIds(ctx),
      this.monitoredAdIds(ctx),
    ]);
    const now = new Date();
    return (data ?? []).map((row: Row) => this.enrich(row, { savedIds, monitoredIds, now }));
  }

  async listTopOffers(_ctx: SessionContext, limit = 8): Promise<OfferEnriched[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("offers")
      .select("*, advertiser:advertisers ( id, name, avatar_url )")
      .order("stats->score", { ascending: false })
      .limit(limit);
    if (error) throw new RepositoryError(`Falha ao listar ofertas: ${error.message}`, error);
    return (data ?? []).map((row: Row) => enrichOffer(row));
  }

  /**
   * Ingestão. Usa o service role porque grava no catálogo global
   * (`workspace_id IS NULL`), onde a RLS proíbe escrita do usuário.
   * Nunca receba `payload` direto do browser: só de providers no servidor.
   */
  async upsertBatch(
    _ctx: SessionContext,
    payload: { advertisers?: Advertiser[]; offers?: Offer[]; ads?: Ad[] },
  ): Promise<{ ads: number; advertisers: number; offers: number }> {
    const supabase = createSupabaseServiceClient();

    if (payload.advertisers?.length) {
      const { error } = await supabase
        .from("advertisers")
        .upsert(payload.advertisers.map(fromAdvertiser), { onConflict: "meta_page_id" });
      if (error) throw new RepositoryError(`Falha ao gravar anunciantes: ${error.message}`, error);
    }

    if (payload.offers?.length) {
      const { error } = await supabase
        .from("offers")
        .upsert(payload.offers.map(fromOffer), { onConflict: "signature" });
      if (error) throw new RepositoryError(`Falha ao gravar ofertas: ${error.message}`, error);
    }

    let ads = 0;
    if (payload.ads?.length) {
      const rows = payload.ads.map((ad) => {
        const score = computeAdScore(deriveScoreInput(ad));
        return fromAd(ad, {
          value: score.value,
          version: score.version,
          factors: score.factors,
          explanation: score.explanation,
        });
      });

      const { data, error } = await supabase
        .from("ads")
        .upsert(rows, { onConflict: "meta_ad_archive_id" })
        .select("id, meta_ad_archive_id");
      if (error) throw new RepositoryError(`Falha ao gravar anúncios: ${error.message}`, error);
      ads = data?.length ?? 0;

      // Criativos: o id do anúncio só existe após o upsert acima.
      const idByArchive = new Map(
        (data ?? []).map((row: Row) => [row.meta_ad_archive_id, row.id]),
      );
      const creativeRows = payload.ads.flatMap((ad) => {
        const adId = idByArchive.get(ad.metaAdArchiveId);
        if (!adId) return [];
        return ad.creatives.map((creative) => ({
          ad_id: adId,
          workspace_id: ad.workspaceId,
          format: creative.format,
          source_url: creative.sourceUrl,
          storage_path: creative.storagePath,
          thumbnail_url: creative.thumbnailUrl,
          width: creative.width,
          height: creative.height,
          duration_seconds: creative.durationSeconds,
          position: creative.position,
          title: creative.title,
          link_description: creative.linkDescription,
          link_url: creative.linkUrl,
        }));
      });
      if (creativeRows.length > 0) {
        const { error: creativeError } = await supabase.from("creatives").upsert(creativeRows);
        if (creativeError) {
          throw new RepositoryError(
            `Falha ao gravar criativos: ${creativeError.message}`,
            creativeError,
          );
        }
      }
    }

    return {
      ads,
      advertisers: payload.advertisers?.length ?? 0,
      offers: payload.offers?.length ?? 0,
    };
  }

  async appendAdSnapshot(_ctx: SessionContext, snapshot: AdSnapshot): Promise<void> {
    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("ad_snapshots").insert({
      ad_id: snapshot.adId,
      captured_at: snapshot.capturedAt,
      status: snapshot.status,
      body_text: snapshot.bodyText,
      headline: snapshot.headline,
      call_to_action: snapshot.callToAction,
      creative_count: snapshot.creativeCount,
      platforms: snapshot.platforms,
      content_hash: snapshot.contentHash,
    });
    if (error) throw new RepositoryError(`Falha ao gravar snapshot: ${error.message}`, error);
  }

  async listAdSnapshots(
    _ctx: SessionContext,
    adId: string,
    limit = 60,
  ): Promise<AdSnapshot[]> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("ad_snapshots")
      .select("*")
      .eq("ad_id", adId)
      .order("captured_at", { ascending: false })
      .limit(limit);
    if (error) throw new RepositoryError(`Falha ao ler snapshots: ${error.message}`, error);
    return (data ?? []).map((row: Row) => toAdSnapshot(row));
  }

  /* -------------------------------------------------------------- helpers -- */

  private enrich(
    row: Row,
    ctx: { savedIds: Set<string>; monitoredIds: Set<string>; now: Date },
  ): AdEnriched {
    const ad = toAd(row);
    const advertiser = one<Row>(row.advertiser);
    const offer = one<Row>(row.offer);

    return enrichAd(ad, {
      advertiser: advertiser
        ? { name: advertiser.name, avatarUrl: advertiser.avatar_url ?? null }
        : null,
      offer: offer ? { name: offer.name, stats: offer.stats } : null,
      saved: ctx.savedIds.has(ad.id),
      monitored: ctx.monitoredIds.has(ad.id),
      now: ctx.now,
    });
  }

  private async savedAdIds(_ctx: SessionContext): Promise<Set<string>> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("collection_items").select("entity_id").eq("kind", "ad");
    return new Set((data ?? []).map((row: Row) => row.entity_id));
  }

  private async monitoredAdIds(_ctx: SessionContext): Promise<Set<string>> {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("monitors").select("entity_id").eq("target", "ad");
    return new Set((data ?? []).map((row: Row) => row.entity_id));
  }
}

function enrichOffer(row: Row): OfferEnriched {
  const offer = toOffer(row);
  const advertiser = one<Row>(row.advertiser);
  return {
    ...offer,
    advertiserName: advertiser?.name ?? "Anunciante desconhecido",
    advertiserAvatarUrl: advertiser?.avatar_url ?? null,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function applyOrder(builder: any, sort: string): any {
  switch (sort) {
    case "active_days_desc":
      return builder.order("active_days", { ascending: false });
    case "newest":
      return builder.order("started_at", { ascending: false });
    case "oldest":
      return builder.order("started_at", { ascending: true });
    default:
      return builder.order("score", { ascending: false });
  }
}

function resolveRange(query: CatalogQuery, now: Date): { from: number; to: number } | null {
  const preset = query.datePreset ?? "any";
  if (preset === "any") return null;
  if (preset === "custom") {
    if (!query.dateFrom && !query.dateTo) return null;
    return {
      from: query.dateFrom ? new Date(query.dateFrom).getTime() : 0,
      to: query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`).getTime() : now.getTime(),
    };
  }
  const days = Number.parseInt(preset.replace("d", ""), 10);
  return { from: now.getTime() - days * DAY, to: now.getTime() };
}
