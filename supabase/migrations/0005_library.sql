-- ============================================================================
-- AdMiner — 0005: biblioteca (coleções e tags)
-- ============================================================================

create table public.collections (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 80),
  description  text,
  color        text not null default 'brand',
  icon         text,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

create index collections_ws_idx on public.collections (workspace_id, updated_at desc);

create table public.collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  kind          public.collection_item_kind not null,
  -- Referência polimórfica: valida-se na aplicação conforme `kind`.
  -- FK direta exigiria quatro colunas nuláveis e complicaria a leitura.
  entity_id     uuid not null,
  note          text,
  added_by      uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (collection_id, kind, entity_id)
);

create index collection_items_collection_idx
  on public.collection_items (collection_id, created_at desc);
create index collection_items_entity_idx on public.collection_items (workspace_id, kind, entity_id);

create table public.tags (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  color        text not null default 'brand',
  created_at   timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.ad_tags (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  ad_id        uuid not null references public.ads (id) on delete cascade,
  tag_id       uuid not null references public.tags (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (ad_id, tag_id)
);

create index ad_tags_tag_idx on public.ad_tags (tag_id);

create table public.offer_tags (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  offer_id     uuid not null references public.offers (id) on delete cascade,
  tag_id       uuid not null references public.tags (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (offer_id, tag_id)
);

create index offer_tags_tag_idx on public.offer_tags (tag_id);
