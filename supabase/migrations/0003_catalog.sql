-- ============================================================================
-- AdMiner — 0003: catálogo de anúncios
--
-- Decisão de arquitetura: o catálogo (anunciantes, ofertas, anúncios,
-- criativos) é **compartilhado** entre workspaces quando `workspace_id IS NULL`.
-- Anúncio da Meta Ad Library é dado público: duplicar por tenant desperdiça
-- armazenamento e impede deduplicação por `meta_ad_archive_id`.
--
-- Registros com `workspace_id` preenchido são importações privadas do cliente
-- e ficam visíveis apenas para o workspace dono. A RLS em 0008 aplica os dois
-- casos na mesma política.
-- ============================================================================

create table public.advertisers (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces (id) on delete cascade,
  meta_page_id  text,
  name          text not null,
  avatar_url    text,
  category      text,
  country       text check (country is null or country ~ '^[A-Z]{2}$'),
  verified      boolean not null default false,
  website_url   text,
  -- Métricas agregadas, recalculadas pela ingestão (evita N+1 na listagem).
  stats         jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Deduplicação por página da Meta dentro do escopo (global ou workspace).
create unique index advertisers_meta_page_global_uidx
  on public.advertisers (meta_page_id)
  where workspace_id is null and meta_page_id is not null;

create unique index advertisers_meta_page_ws_uidx
  on public.advertisers (workspace_id, meta_page_id)
  where workspace_id is not null and meta_page_id is not null;

create index advertisers_name_trgm_idx on public.advertisers using gin (name gin_trgm_ops);
create index advertisers_workspace_idx on public.advertisers (workspace_id);

-- ---------------------------------------------------------------- ofertas --

create table public.offers (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid references public.workspaces (id) on delete cascade,
  advertiser_id       uuid not null references public.advertisers (id) on delete cascade,
  name                text not null,
  signature           text not null,
  origin              public.offer_origin not null default 'auto',
  first_ad_started_at timestamptz not null default now(),
  last_ad_seen_at     timestamptz not null default now(),
  stats               jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create unique index offers_signature_global_uidx
  on public.offers (signature) where workspace_id is null;
create unique index offers_signature_ws_uidx
  on public.offers (workspace_id, signature) where workspace_id is not null;

create index offers_advertiser_idx on public.offers (advertiser_id);
create index offers_name_trgm_idx on public.offers using gin (name gin_trgm_ops);
-- Ordenar por score da oferta é operação de dashboard: índice dedicado.
create index offers_score_idx on public.offers (((stats->>'score')::int) desc nulls last);

-- --------------------------------------------------------------- anúncios --

create table public.ads (
  id                       uuid primary key default gen_random_uuid(),
  workspace_id             uuid references public.workspaces (id) on delete cascade,
  meta_ad_archive_id       text not null,
  ad_library_url           text not null,
  advertiser_id            uuid not null references public.advertisers (id) on delete cascade,
  offer_id                 uuid references public.offers (id) on delete set null,

  status                   public.ad_status not null default 'unknown',
  format                   public.ad_format not null default 'unknown',
  platforms                public.ad_platform[] not null default '{}',
  countries                text[] not null default '{}',

  body_text                text,
  headline                 text,
  link_description         text,
  call_to_action           text,
  destination_url          text,
  body_variations          text[] not null default '{}',

  started_at               timestamptz not null,
  ended_at                 timestamptz,

  impressions_lower_bound  bigint,
  impressions_upper_bound  bigint,
  spend_lower_bound        numeric(14, 2),
  spend_upper_bound        numeric(14, 2),
  currency                 text,

  -- Score materializado: recalculado na ingestão para permitir ordenação
  -- eficiente. A verdade continua sendo o algoritmo em src/core/score.
  score                    smallint not null default 0 check (score between 0 and 100),
  score_version            text not null default 'ad_score_v1',
  score_factors            jsonb not null default '[]'::jsonb,
  score_explanation        text,

  -- Dias ativos, considerando anúncio ainda no ar.
  --
  -- Não pode ser `generated always as (...) stored`: a expressão depende de
  -- `now()`, que é STABLE, e o Postgres exige IMMUTABLE em coluna gerada
  -- (falha com "generation expression is not immutable"). Fica materializada
  -- pelo trigger `ads_touch_active_days`, logo abaixo — a mesma escolha já
  -- feita para `score`.
  active_days              integer not null default 0,

  -- Vetor de busca em português, mantido pelo banco.
  fts                      tsvector generated always as (
    to_tsvector('portuguese', coalesce(headline, '') || ' ' || coalesce(body_text, ''))
  ) stored,

  first_seen_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Mantém `active_days` a cada escrita na linha. A ingestão regrava o anúncio
-- a cada mineração (nem que seja para mover `last_seen_at`), então o valor
-- acompanha os anúncios no ar sem exigir job periódico. Entre duas ingestões
-- ele envelhece — é o mesmo compromisso já aceito para `score`.
create or replace function public.ads_set_active_days()
returns trigger
language plpgsql
as $$
begin
  new.active_days := greatest(
    0,
    extract(day from (coalesce(new.ended_at, now()) - new.started_at))::int
  );
  return new;
end;
$$;

create trigger ads_touch_active_days
  before insert or update on public.ads
  for each row execute function public.ads_set_active_days();

create unique index ads_archive_global_uidx
  on public.ads (meta_ad_archive_id) where workspace_id is null;
create unique index ads_archive_ws_uidx
  on public.ads (workspace_id, meta_ad_archive_id) where workspace_id is not null;

create index ads_advertiser_idx on public.ads (advertiser_id);
create index ads_offer_idx on public.ads (offer_id);
create index ads_status_score_idx on public.ads (status, score desc);
create index ads_started_idx on public.ads (started_at desc);
create index ads_active_days_idx on public.ads (active_days desc);
create index ads_countries_idx on public.ads using gin (countries);
create index ads_platforms_idx on public.ads using gin (platforms);

-- Busca textual em português sobre título + corpo.
create index ads_fts_idx on public.ads using gin (fts);

-- -------------------------------------------------------------- criativos --

create table public.creatives (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid references public.workspaces (id) on delete cascade,
  ad_id            uuid not null references public.ads (id) on delete cascade,
  format           public.ad_format not null default 'unknown',
  source_url       text,
  storage_path     text,
  thumbnail_url    text,
  width            integer,
  height           integer,
  duration_seconds numeric(8, 2),
  position         smallint not null default 0,
  title            text,
  link_description text,
  link_url         text,
  -- Hash do arquivo, quando armazenado: permite deduplicar criativo reusado.
  content_hash     text,
  created_at       timestamptz not null default now()
);

create index creatives_ad_idx on public.creatives (ad_id, position);
create index creatives_hash_idx on public.creatives (content_hash) where content_hash is not null;

-- -------------------------------------------------------------- snapshots --

-- Fotografia do anúncio a cada coleta. Base do monitoramento e do diff.
create table public.ad_snapshots (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references public.workspaces (id) on delete cascade,
  ad_id          uuid not null references public.ads (id) on delete cascade,
  captured_at    timestamptz not null default now(),
  status         public.ad_status not null,
  body_text      text,
  headline       text,
  call_to_action text,
  creative_count smallint not null default 0,
  platforms      public.ad_platform[] not null default '{}',
  content_hash   text not null
);

create index ad_snapshots_ad_time_idx on public.ad_snapshots (ad_id, captured_at desc);
-- Snapshot idêntico consecutivo não precisa ser gravado duas vezes.
create unique index ad_snapshots_dedupe_uidx on public.ad_snapshots (ad_id, content_hash, captured_at);

create table public.creative_snapshots (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete cascade,
  creative_id  uuid not null references public.creatives (id) on delete cascade,
  captured_at  timestamptz not null default now(),
  content_hash text not null,
  storage_path text
);

create index creative_snapshots_creative_idx
  on public.creative_snapshots (creative_id, captured_at desc);
