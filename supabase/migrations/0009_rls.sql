-- ============================================================================
-- AdMiner — 0009: Row Level Security
--
-- Princípio: nenhuma tabela fica sem RLS. O usuário A nunca alcança dados do
-- usuário B. O catálogo público (workspace_id IS NULL) é legível por qualquer
-- usuário autenticado, mas gravável apenas pelo service role (ingestão).
-- ============================================================================

alter table public.profiles            enable row level security;
alter table public.workspaces          enable row level security;
alter table public.workspace_members   enable row level security;
alter table public.workspace_invites   enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.advertisers         enable row level security;
alter table public.offers              enable row level security;
alter table public.ads                 enable row level security;
alter table public.creatives           enable row level security;
alter table public.ad_snapshots        enable row level security;
alter table public.creative_snapshots  enable row level security;
alter table public.copy_analysis       enable row level security;
alter table public.creative_analysis   enable row level security;
alter table public.transcriptions      enable row level security;
alter table public.insight_reports     enable row level security;
alter table public.collections         enable row level security;
alter table public.collection_items    enable row level security;
alter table public.tags                enable row level security;
alter table public.ad_tags             enable row level security;
alter table public.offer_tags          enable row level security;
alter table public.monitors            enable row level security;
alter table public.monitoring_snapshots enable row level security;
alter table public.monitoring_events   enable row level security;
alter table public.notifications       enable row level security;
alter table public.searches            enable row level security;
alter table public.search_results      enable row level security;
alter table public.usage               enable row level security;
alter table public.jobs                enable row level security;
alter table public.logs                enable row level security;

-- ---------------------------------------------------------------- perfis ---

create policy "profiles_select_self_or_teammate"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and theirs.user_id = public.profiles.id
    )
  );

create policy "profiles_update_self"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ------------------------------------------------------------ workspaces ---

create policy "workspaces_select_member"
  on public.workspaces for select to authenticated
  using (public.is_workspace_member(id));

create policy "workspaces_insert_own"
  on public.workspaces for insert to authenticated
  with check (owner_id = auth.uid());

create policy "workspaces_update_admin"
  on public.workspaces for update to authenticated
  using (public.has_workspace_role(id, 'admin'))
  with check (public.has_workspace_role(id, 'admin'));

create policy "workspaces_delete_owner"
  on public.workspaces for delete to authenticated
  using (public.has_workspace_role(id, 'owner'));

-- --------------------------------------------------------------- membros ---

create policy "members_select_same_workspace"
  on public.workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "members_write_admin"
  on public.workspace_members for all to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "invites_manage_admin"
  on public.workspace_invites for all to authenticated
  using (public.has_workspace_role(workspace_id, 'admin'))
  with check (public.has_workspace_role(workspace_id, 'admin'));

create policy "subscriptions_select_member"
  on public.subscriptions for select to authenticated
  using (public.is_workspace_member(workspace_id));

-- ------------------------------------------------------------- catálogo ----
--
-- Leitura: registro global (workspace_id IS NULL) ou do próprio workspace.
-- Escrita: apenas registros do próprio workspace. O catálogo global é
-- alimentado pela ingestão, que usa o service role e ignora RLS.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'advertisers', 'offers', 'ads', 'creatives',
      'ad_snapshots', 'creative_snapshots'
    ])
  loop
    execute format($f$
      create policy "%1$s_select_public_or_member"
        on public.%1$I for select to authenticated
        using (workspace_id is null or public.is_workspace_member(workspace_id));

      create policy "%1$s_write_member"
        on public.%1$I for all to authenticated
        using (workspace_id is not null and public.has_workspace_role(workspace_id, 'member'))
        with check (workspace_id is not null and public.has_workspace_role(workspace_id, 'member'));
    $f$, t);
  end loop;
end;
$$;

-- ------------------------------------------------- tabelas workspace-only --
--
-- Padrão para tudo que é produzido pelo cliente: leitura para membros,
-- escrita para quem tem papel `member` ou acima.

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'copy_analysis', 'creative_analysis', 'transcriptions', 'insight_reports',
      'collections', 'collection_items', 'tags', 'ad_tags', 'offer_tags',
      'monitors', 'monitoring_snapshots', 'monitoring_events',
      'searches', 'usage'
    ])
  loop
    execute format($f$
      create policy "%1$s_select_member"
        on public.%1$I for select to authenticated
        using (public.is_workspace_member(workspace_id));

      create policy "%1$s_write_member"
        on public.%1$I for all to authenticated
        using (public.has_workspace_role(workspace_id, 'member'))
        with check (public.has_workspace_role(workspace_id, 'member'));
    $f$, t);
  end loop;
end;
$$;

-- --------------------------------------------------------- notificações ----
-- Notificação é pessoal: só o destinatário vê (ou toda a equipe, se global).

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (
    public.is_workspace_member(workspace_id)
    and (user_id is null or user_id = auth.uid())
  );

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ------------------------------------------------------ search_results -----
-- Não tem workspace_id próprio: herda da busca.

create policy "search_results_select_member"
  on public.search_results for select to authenticated
  using (
    exists (
      select 1 from public.searches s
      where s.id = search_id and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "search_results_write_member"
  on public.search_results for all to authenticated
  using (
    exists (
      select 1 from public.searches s
      where s.id = search_id and public.has_workspace_role(s.workspace_id, 'member')
    )
  )
  with check (
    exists (
      select 1 from public.searches s
      where s.id = search_id and public.has_workspace_role(s.workspace_id, 'member')
    )
  );

-- -------------------------------------------------------- jobs e logs ------
-- Somente leitura para o workspace. Escrita é do service role (workers).

create policy "jobs_select_member"
  on public.jobs for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));

create policy "logs_select_member"
  on public.logs for select to authenticated
  using (workspace_id is not null and public.is_workspace_member(workspace_id));

-- ============================================================================
-- Observação sobre o painel /admin:
-- o acesso administrativo NÃO usa uma política especial de RLS. O painel roda
-- no servidor com o service role, que ignora RLS por definição, e a
-- autorização é feita na aplicação por `ADMIN_EMAILS`. Manter isso fora do
-- banco evita criar um caminho de escalonamento de privilégio via cliente.
-- ============================================================================
