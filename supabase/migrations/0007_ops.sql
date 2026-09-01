-- ============================================================================
-- AdMiner — 0007: buscas, consumo, jobs e logs
-- ============================================================================

create table public.searches (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  params        jsonb not null default '{}'::jsonb,
  provider      text not null default 'mock',
  result_count  integer not null default 0,
  duration_ms   integer not null default 0,
  status        public.search_status not null default 'ok',
  error_message text,
  created_at    timestamptz not null default now()
);

create index searches_ws_idx on public.searches (workspace_id, created_at desc);
-- Consulta de cota: quantas buscas o workspace fez no ciclo atual.
create index searches_quota_idx on public.searches (workspace_id, created_at);

-- Resultado materializado da busca: permite reabrir uma mineração antiga
-- exatamente como ela era, sem reconsultar o provider.
create table public.search_results (
  search_id  uuid not null references public.searches (id) on delete cascade,
  ad_id      uuid not null references public.ads (id) on delete cascade,
  position   integer not null,
  score      smallint not null default 0,
  primary key (search_id, ad_id)
);

create index search_results_search_idx on public.search_results (search_id, position);

-- ------------------------------------------------------------------ cotas --

create table public.usage (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  metric       public.usage_metric not null,
  -- Primeiro dia do ciclo (YYYY-MM-01), para reset mensal simples.
  period       date not null,
  amount       bigint not null default 0 check (amount >= 0),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, metric, period)
);

create index usage_ws_period_idx on public.usage (workspace_id, period desc);

-- ------------------------------------------------------------------ jobs ---

create table public.jobs (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces (id) on delete cascade,
  queue         text not null,
  name          text not null,
  payload       jsonb not null default '{}'::jsonb,
  status        public.job_status not null default 'queued',
  attempts      smallint not null default 0,
  max_attempts  smallint not null default 3,
  run_at        timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  error_message text,
  result        jsonb,
  created_at    timestamptz not null default now()
);

-- Ordem de consumo do worker.
create index jobs_pending_idx on public.jobs (queue, run_at)
  where status = 'queued';
create index jobs_ws_idx on public.jobs (workspace_id, created_at desc);

-- ------------------------------------------------------------------ logs ---

create table public.logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces (id) on delete set null,
  user_id      uuid references public.profiles (id) on delete set null,
  level        public.log_level not null default 'info',
  -- Domínio do evento: search, ingestion, ai, job, auth, billing...
  scope        text not null,
  message      text not null,
  context      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index logs_created_idx on public.logs (created_at desc);
create index logs_scope_idx on public.logs (scope, created_at desc);
create index logs_level_idx on public.logs (level, created_at desc) where level in ('warn', 'error');
