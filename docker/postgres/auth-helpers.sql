-- ============================================================================
-- Helpers de JWT do schema `auth`.
--
-- Aplicado pelo docker/migrate.sh DEPOIS que o GoTrue roda as próprias
-- migrations, e como `postgres` (superusuário) — só assim é possível
-- substituir funções cujo dono é o `supabase_auth_admin`.
--
-- Por que substituir: a versão que o GoTrue instala lê apenas o GUC legado
-- `request.jwt.claim.sub`. O PostgREST 12 configurado com
-- PGRST_DB_USE_LEGACY_GUCS=false publica as claims como JSON em
-- `request.jwt.claims`. Sem o coalesce abaixo, `auth.uid()` devolveria NULL e
-- todas as políticas de 0009_rls.sql negariam acesso.
-- ============================================================================

create or replace function auth.jwt() returns jsonb
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
  $$;

create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;

create or replace function auth.role() returns text
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    )::text
  $$;

create or replace function auth.email() returns text
  language sql stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
    )::text
  $$;

grant execute on function auth.jwt(), auth.uid(), auth.role(), auth.email()
  to anon, authenticated, service_role;
