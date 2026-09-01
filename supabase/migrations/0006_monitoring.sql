-- ============================================================================
-- AdMiner — 0006: monitoramento, eventos e notificações
-- ============================================================================

create table public.monitors (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  target           public.monitor_target not null,
  entity_id        uuid not null,
  -- Denormalizados para listar sem juntar três tabelas polimórficas.
  entity_label     text not null,
  entity_thumbnail text,
  frequency        public.monitor_frequency not null default 'daily',
  active           boolean not null default true,
  last_checked_at  timestamptz,
  next_check_at    timestamptz not null default now(),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (workspace_id, target, entity_id)
);

-- O worker varre por esta ordem: só o que está ativo e vencido.
create index monitors_due_idx on public.monitors (next_check_at)
  where active;
create index monitors_ws_idx on public.monitors (workspace_id, created_at desc);

create table public.monitoring_snapshots (
  id                uuid primary key default gen_random_uuid(),
  monitor_id        uuid not null references public.monitors (id) on delete cascade,
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  captured_at       timestamptz not null default now(),
  ad_count          integer not null default 0,
  active_ad_count   integer not null default 0,
  creative_count    integer not null default 0,
  content_hash      text not null,
  payload           jsonb not null default '{}'::jsonb
);

create index monitoring_snapshots_timeline_idx
  on public.monitoring_snapshots (monitor_id, captured_at desc);

create table public.monitoring_events (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  monitor_id     uuid not null references public.monitors (id) on delete cascade,
  type           public.monitoring_event_type not null,
  severity       public.event_severity not null default 'info',
  title          text not null,
  description    text not null default '',
  payload        jsonb not null default '{}'::jsonb,
  related_ad_id  uuid references public.ads (id) on delete set null,
  seen           boolean not null default false,
  created_at     timestamptz not null default now()
);

create index monitoring_events_ws_idx on public.monitoring_events (workspace_id, created_at desc);
create index monitoring_events_unseen_idx on public.monitoring_events (workspace_id)
  where not seen;

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid references public.profiles (id) on delete cascade,
  kind         public.notification_kind not null default 'system',
  title        text not null,
  body         text not null default '',
  href         text,
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index notifications_ws_user_idx
  on public.notifications (workspace_id, user_id, created_at desc);
