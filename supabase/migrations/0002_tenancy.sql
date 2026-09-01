-- ============================================================================
-- AdMiner — 0002: usuários, workspaces e associações
--
-- Modelo multi-tenant: TUDO que pertence ao cliente carrega `workspace_id`.
-- Dados públicos de anúncio (catálogo) são globais e ficam em 0003.
-- ============================================================================

-- Espelho de `auth.users`. Só o que a aplicação precisa exibir.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  name         text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil público do usuário, espelhado de auth.users pelo trigger handle_new_user.';

create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  plan_id     public.plan_id not null default 'free',
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workspaces_owner_idx on public.workspaces (owner_id);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.workspace_role not null default 'member',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- Convites pendentes por e-mail (plano Agency).
create table public.workspace_invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email        text not null,
  role         public.workspace_role not null default 'member',
  invited_by   uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  workspace_id           uuid not null unique references public.workspaces (id) on delete cascade,
  plan_id                public.plan_id not null default 'free',
  status                 public.subscription_status not null default 'none',
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscriptions is
  'Estrutura pronta para Stripe. Sem billing ativo, todo workspace opera no plano do campo plan_id.';
