import type { Ad, AdSnapshot } from "@/core/types/ad";
import type { Advertiser } from "@/core/types/advertiser";
import { EMPTY_ADVERTISER_STATS } from "@/core/types/advertiser";
import type {
  AdFormat,
  AdStatus,
  CallToAction,
  CountryCode,
  Platform,
} from "@/core/types/common";
import type { Creative } from "@/core/types/creative";
import type { Offer, OfferStats } from "@/core/types/offer";
import type { Collection, CollectionItem, Tag } from "@/core/types/library";
import type {
  Monitor,
  MonitoringEvent,
  MonitoringSnapshot,
  Notification,
} from "@/core/types/monitoring";
import type { SearchRecord } from "@/core/types/search";
import type { Subscription, Workspace, WorkspaceMember } from "@/core/types/workspace";

/**
 * Conversão linha do Postgres <-> tipo de domínio.
 *
 * Escrito à mão em vez de gerado: as tabelas guardam campos `jsonb`
 * (stats, envelopes de proveniência) cujo formato o gerador de tipos do
 * Supabase devolveria como `Json`, sem ganho real de segurança.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Row = Record<string, any>;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
/** Relações 1:1 chegam como objeto ou array de um item, dependendo da consulta. */
export const one = <T>(value: unknown): T | null =>
  Array.isArray(value) ? ((value[0] as T) ?? null) : ((value as T) ?? null);

export function toCreative(row: Row): Creative {
  return {
    id: row.id,
    adId: row.ad_id,
    format: (row.format ?? "unknown") as AdFormat,
    sourceUrl: row.source_url ?? null,
    storagePath: row.storage_path ?? null,
    thumbnailUrl: row.thumbnail_url ?? null,
    width: row.width ?? null,
    height: row.height ?? null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    position: row.position ?? 0,
    title: row.title ?? null,
    linkDescription: row.link_description ?? null,
    linkUrl: row.link_url ?? null,
    createdAt: row.created_at,
  };
}

export function toAd(row: Row): Ad {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? null,
    metaAdArchiveId: row.meta_ad_archive_id,
    adLibraryUrl: row.ad_library_url,
    advertiserId: row.advertiser_id,
    offerId: row.offer_id ?? null,
    status: (row.status ?? "unknown") as AdStatus,
    format: (row.format ?? "unknown") as AdFormat,
    platforms: asArray<Platform>(row.platforms),
    countries: asArray<CountryCode>(row.countries),
    bodyText: row.body_text ?? null,
    headline: row.headline ?? null,
    linkDescription: row.link_description ?? null,
    callToAction: (row.call_to_action ?? null) as CallToAction | null,
    destinationUrl: row.destination_url ?? null,
    bodyVariations: asArray<string>(row.body_variations),
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
    impressionsLowerBound: row.impressions_lower_bound ?? null,
    impressionsUpperBound: row.impressions_upper_bound ?? null,
    spendLowerBound: row.spend_lower_bound != null ? Number(row.spend_lower_bound) : null,
    spendUpperBound: row.spend_upper_bound != null ? Number(row.spend_upper_bound) : null,
    currency: row.currency ?? null,
    creatives: asArray<Row>(row.creatives).map(toCreative).sort((a, b) => a.position - b.position),
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export function fromAd(ad: Ad, score: { value: number; version: string; factors: unknown; explanation: string }): Row {
  return {
    workspace_id: ad.workspaceId,
    meta_ad_archive_id: ad.metaAdArchiveId,
    ad_library_url: ad.adLibraryUrl,
    advertiser_id: ad.advertiserId,
    offer_id: ad.offerId,
    status: ad.status,
    format: ad.format,
    platforms: ad.platforms,
    countries: ad.countries,
    body_text: ad.bodyText,
    headline: ad.headline,
    link_description: ad.linkDescription,
    call_to_action: ad.callToAction,
    destination_url: ad.destinationUrl,
    body_variations: ad.bodyVariations,
    started_at: ad.startedAt,
    ended_at: ad.endedAt,
    impressions_lower_bound: ad.impressionsLowerBound,
    impressions_upper_bound: ad.impressionsUpperBound,
    spend_lower_bound: ad.spendLowerBound,
    spend_upper_bound: ad.spendUpperBound,
    currency: ad.currency,
    score: score.value,
    score_version: score.version,
    score_factors: score.factors,
    score_explanation: score.explanation,
    first_seen_at: ad.firstSeenAt,
    last_seen_at: ad.lastSeenAt,
  };
}

export function toAdvertiser(row: Row): Advertiser {
  return {
    id: row.id,
    metaPageId: row.meta_page_id ?? null,
    name: row.name,
    avatarUrl: row.avatar_url ?? null,
    category: row.category ?? null,
    country: (row.country ?? null) as CountryCode | null,
    verified: Boolean(row.verified),
    websiteUrl: row.website_url ?? null,
    stats: { ...EMPTY_ADVERTISER_STATS, ...(row.stats ?? {}) },
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function fromAdvertiser(advertiser: Advertiser): Row {
  return {
    workspace_id: null,
    meta_page_id: advertiser.metaPageId,
    name: advertiser.name,
    avatar_url: advertiser.avatarUrl,
    category: advertiser.category,
    country: advertiser.country,
    verified: advertiser.verified,
    website_url: advertiser.websiteUrl,
    stats: advertiser.stats,
    first_seen_at: advertiser.firstSeenAt,
    last_seen_at: advertiser.lastSeenAt,
  };
}

const EMPTY_OFFER_STATS: OfferStats = {
  totalAds: 0,
  activeAds: 0,
  totalCreatives: 0,
  activeDays: 0,
  formatBreakdown: {},
  topCallToAction: null,
  score: 0,
};

export function toOffer(row: Row): Offer {
  return {
    id: row.id,
    workspaceId: row.workspace_id ?? null,
    advertiserId: row.advertiser_id,
    name: row.name,
    signature: row.signature,
    origin: row.origin ?? "auto",
    firstAdStartedAt: row.first_ad_started_at,
    lastAdSeenAt: row.last_ad_seen_at,
    stats: { ...EMPTY_OFFER_STATS, ...(row.stats ?? {}) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromOffer(offer: Offer): Row {
  return {
    workspace_id: offer.workspaceId,
    advertiser_id: offer.advertiserId,
    name: offer.name,
    signature: offer.signature,
    origin: offer.origin,
    first_ad_started_at: offer.firstAdStartedAt,
    last_ad_seen_at: offer.lastAdSeenAt,
    stats: offer.stats,
  };
}

export function toAdSnapshot(row: Row): AdSnapshot {
  return {
    id: row.id,
    adId: row.ad_id,
    capturedAt: row.captured_at,
    status: row.status as AdStatus,
    bodyText: row.body_text ?? null,
    headline: row.headline ?? null,
    callToAction: (row.call_to_action ?? null) as CallToAction | null,
    creativeCount: row.creative_count ?? 0,
    platforms: asArray<Platform>(row.platforms),
    contentHash: row.content_hash,
  };
}

export function toCollection(row: Row): Collection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? null,
    color: row.color ?? "brand",
    icon: row.icon ?? null,
    itemCount: row.item_count ?? row.collection_items?.[0]?.count ?? 0,
    coverThumbnails: asArray<string>(row.cover_thumbnails),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCollectionItem(row: Row): CollectionItem {
  return {
    id: row.id,
    collectionId: row.collection_id,
    workspaceId: row.workspace_id,
    kind: row.kind,
    entityId: row.entity_id,
    note: row.note ?? null,
    addedBy: row.added_by ?? null,
    createdAt: row.created_at,
  };
}

export function toTag(row: Row): Tag {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color ?? "brand",
    usageCount: row.usage_count ?? 0,
    createdAt: row.created_at,
  };
}

export function toMonitor(row: Row): Monitor {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    target: row.target,
    entityId: row.entity_id,
    entityLabel: row.entity_label,
    entityThumbnail: row.entity_thumbnail ?? null,
    frequency: row.frequency,
    active: Boolean(row.active),
    lastCheckedAt: row.last_checked_at ?? null,
    nextCheckAt: row.next_check_at ?? null,
    unseenEvents: row.unseen_events ?? 0,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
  };
}

export function toMonitoringEvent(row: Row): MonitoringEvent {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    monitorId: row.monitor_id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    description: row.description ?? "",
    payload: row.payload ?? {},
    relatedAdId: row.related_ad_id ?? null,
    seen: Boolean(row.seen),
    createdAt: row.created_at,
  };
}

export function toMonitoringSnapshot(row: Row): MonitoringSnapshot {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    workspaceId: row.workspace_id,
    capturedAt: row.captured_at,
    adCount: row.ad_count ?? 0,
    activeAdCount: row.active_ad_count ?? 0,
    creativeCount: row.creative_count ?? 0,
    contentHash: row.content_hash,
  };
}

export function toNotification(row: Row): Notification {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id ?? null,
    kind: row.kind,
    title: row.title,
    body: row.body ?? "",
    href: row.href ?? null,
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

export function toSearchRecord(row: Row): SearchRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id ?? null,
    params: row.params ?? {},
    provider: row.provider ?? "mock",
    resultCount: row.result_count ?? 0,
    durationMs: row.duration_ms ?? 0,
    status: row.status ?? "ok",
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at,
  };
}

export function toWorkspace(row: Row): Workspace {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    planId: row.plan_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  };
}

export function toWorkspaceMember(row: Row): WorkspaceMember {
  const profile = one<Row>(row.profile);
  return {
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    email: profile?.email ?? "",
    name: profile?.name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    createdAt: row.created_at,
  };
}

export function toSubscription(row: Row): Subscription {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    planId: row.plan_id,
    status: row.status,
    stripeCustomerId: row.stripe_customer_id ?? null,
    stripeSubscriptionId: row.stripe_subscription_id ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
  };
}
