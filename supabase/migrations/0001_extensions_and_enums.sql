-- ============================================================================
-- AdMiner — 0001: extensões e tipos enumerados
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- busca textual por similaridade
create extension if not exists "unaccent";      -- normalização pt-BR

-- ---------------------------------------------------------------- domínio --

create type public.ad_status as enum ('active', 'inactive', 'unknown');

create type public.ad_format as enum ('image', 'video', 'carousel', 'dco', 'unknown');

create type public.ad_platform as enum (
  'facebook', 'instagram', 'messenger', 'audience_network', 'threads'
);

create type public.offer_origin as enum ('auto', 'manual');

-- ------------------------------------------------------------- tenancy ----

create type public.plan_id as enum ('free', 'pro', 'agency');

create type public.workspace_role as enum ('owner', 'admin', 'member', 'viewer');

create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'none'
);

-- ----------------------------------------------------------- biblioteca ---

create type public.collection_item_kind as enum ('ad', 'creative', 'offer', 'advertiser');

-- -------------------------------------------------------- monitoramento ---

create type public.monitor_target as enum ('ad', 'offer', 'advertiser');

create type public.monitor_frequency as enum ('hourly', 'daily', 'weekly');

create type public.monitoring_event_type as enum (
  'new_ad', 'ad_removed', 'new_variation', 'copy_changed', 'creative_changed',
  'cta_changed', 'volume_increase', 'volume_decrease', 'offer_creatives_added'
);

create type public.event_severity as enum ('info', 'positive', 'warning');

create type public.notification_kind as enum ('monitoring', 'system', 'quota', 'job');

-- ---------------------------------------------------------------- ops -----

create type public.usage_metric as enum (
  'searches', 'analyses', 'transcriptions', 'ai_calls', 'storage_bytes',
  'monitors', 'saved_items'
);

create type public.job_status as enum ('queued', 'running', 'done', 'failed', 'canceled');

create type public.log_level as enum ('debug', 'info', 'warn', 'error');

create type public.search_status as enum ('ok', 'partial', 'error');
