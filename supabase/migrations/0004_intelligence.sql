-- ============================================================================
-- AdMiner — 0004: camada de inteligência (análises, transcrições, insights)
--
-- Tudo aqui é workspace-scoped: análise consome cota e pode usar IA paga.
-- `engine` registra quem produziu (heuristic:v1, ai:anthropic:claude-opus-5),
-- permitindo reprocessar quando o motor mudar.
-- ============================================================================

create table public.copy_analysis (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  ad_id             uuid not null references public.ads (id) on delete cascade,
  engine            text not null,

  -- Cada campo guarda o envelope { value, provenance, source, confidence, note }
  -- para que a interface consiga distinguir dado observado de inferência.
  hook              jsonb,
  hook_type         jsonb,
  problem           jsonb,
  promise           jsonb,
  mechanism         jsonb,
  benefits          jsonb,
  proof             jsonb,
  objections        jsonb,
  cta               jsonb,
  specificity       jsonb,
  structure         jsonb,
  emotions          jsonb,
  dominant_emotion  jsonb,

  -- Métricas contadas deterministicamente. Nunca produzidas por IA.
  metrics           jsonb not null default '{}'::jsonb,

  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (workspace_id, ad_id, engine)
);

create index copy_analysis_ad_idx on public.copy_analysis (ad_id);
create index copy_analysis_ws_idx on public.copy_analysis (workspace_id, created_at desc);

create table public.creative_analysis (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces (id) on delete cascade,
  creative_id       uuid not null references public.creatives (id) on delete cascade,
  ad_id             uuid not null references public.ads (id) on delete cascade,
  engine            text not null,
  format            public.ad_format not null default 'unknown',

  aspect_ratio      jsonb,
  duration_seconds  jsonb,
  has_person        jsonb,
  has_on_screen_text jsonb,
  has_captions      jsonb,
  has_product       jsonb,
  text_density      jsonb,
  visual_headline   jsonb,
  visual_cta        jsonb,
  opening_beats     jsonb,
  visual_structure  jsonb,

  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  unique (workspace_id, creative_id, engine)
);

create index creative_analysis_ad_idx on public.creative_analysis (ad_id);

create table public.transcriptions (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  creative_id      uuid not null references public.creatives (id) on delete cascade,
  ad_id            uuid not null references public.ads (id) on delete cascade,
  engine           text not null,
  language         text not null default 'pt-BR',
  full_text        text not null default '',
  -- [{ startSeconds, endSeconds, text, role }]
  segments         jsonb not null default '[]'::jsonb,
  summary          jsonb,
  hook_segment     jsonb,
  cta_segment      jsonb,
  duration_seconds numeric(8, 2),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  unique (workspace_id, creative_id, engine)
);

create index transcriptions_ad_idx on public.transcriptions (ad_id);
create index transcriptions_fts_idx on public.transcriptions
  using gin (to_tsvector('portuguese', full_text));

create table public.insight_reports (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  engine        text not null,
  title         text,
  query         text,
  sample_size   integer not null default 0,
  -- Conjunto analisado, para reprodutibilidade.
  ad_ids        uuid[] not null default '{}',
  payload       jsonb not null default '{}'::jsonb,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index insight_reports_ws_idx on public.insight_reports (workspace_id, created_at desc);
