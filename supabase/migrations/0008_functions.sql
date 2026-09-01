-- ============================================================================
-- AdMiner — 0008: funções, triggers e helpers de autorização
-- ============================================================================

-- ------------------------------------------------------------ updated_at ---

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles', 'workspaces', 'subscriptions', 'advertisers', 'offers',
      'ads', 'collections', 'monitors'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t
    );
  end loop;
end;
$$;

-- -------------------------------------------------------- autorização -----

-- Peso numérico do papel, para comparações "pelo menos X".
create or replace function public.role_rank(r public.workspace_role)
returns integer
language sql
immutable
as $$
  select case r
    when 'viewer' then 0
    when 'member' then 1
    when 'admin'  then 2
    when 'owner'  then 3
  end;
$$;

-- SECURITY DEFINER evita recursão infinita: as políticas de
-- `workspace_members` consultariam a própria tabela sob RLS.
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members m
    where m.workspace_id = ws
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role_of(ws uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.workspace_members m
  where m.workspace_id = ws
    and m.user_id = auth.uid();
$$;

create or replace function public.has_workspace_role(ws uuid, minimum public.workspace_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.role_rank(public.workspace_role_of(ws)) >= public.role_rank(minimum),
    false
  );
$$;

-- ----------------------------------------------- provisionamento inicial ---

-- Slug único a partir do nome, com sufixo numérico em caso de colisão.
create or replace function public.unique_workspace_slug(base_name text)
returns text
language plpgsql
as $$
declare
  base text;
  candidate text;
  n integer := 1;
begin
  base := regexp_replace(lower(unaccent(coalesce(nullif(trim(base_name), ''), 'workspace'))),
                         '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if char_length(base) < 2 then base := 'workspace'; end if;
  base := left(base, 50);
  candidate := base;

  while exists (select 1 from public.workspaces w where w.slug = candidate) loop
    n := n + 1;
    candidate := left(base, 50) || '-' || n::text;
  end loop;

  return candidate;
end;
$$;

/*
  Provisionamento de um novo usuário:
    perfil -> workspace pessoal -> associação como owner -> assinatura free.
  Roda como trigger de `auth.users`, portanto SECURITY DEFINER.
*/
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
  ws_id uuid;
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, name, avatar_url)
  values (new.id, new.email, display_name, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.workspaces (name, slug, owner_id, plan_id)
  values (
    coalesce(display_name, 'Meu workspace'),
    public.unique_workspace_slug(coalesce(display_name, 'workspace')),
    new.id,
    'free'
  )
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  insert into public.subscriptions (workspace_id, plan_id, status)
  values (ws_id, 'free', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- consumo ----

-- Incremento atômico de consumo no ciclo corrente.
create or replace function public.increment_usage(
  ws uuid,
  m public.usage_metric,
  delta bigint default 1
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  total bigint;
begin
  insert into public.usage (workspace_id, metric, period, amount)
  values (ws, m, date_trunc('month', now())::date, delta)
  on conflict (workspace_id, metric, period)
  do update set amount = usage.amount + excluded.amount,
                updated_at = now()
  returning amount into total;

  return total;
end;
$$;

-- Consumo do ciclo corrente para uma métrica.
create or replace function public.current_usage(ws uuid, m public.usage_metric)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.amount
       from public.usage u
      where u.workspace_id = ws
        and u.metric = m
        and u.period = date_trunc('month', now())::date),
    0
  );
$$;

-- ------------------------------------------------------------- eventos ----

-- Toda vez que um evento de monitoramento nasce, gera notificação in-app.
create or replace function public.notify_monitoring_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (workspace_id, user_id, kind, title, body, href)
  select
    new.workspace_id,
    m.created_by,
    'monitoring',
    new.title,
    new.description,
    '/monitoring/' || new.monitor_id::text
  from public.monitors m
  where m.id = new.monitor_id;

  return new;
end;
$$;

create trigger on_monitoring_event_created
  after insert on public.monitoring_events
  for each row execute function public.notify_monitoring_event();
