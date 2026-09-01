-- ============================================================================
-- Base que o stack Supabase espera encontrar no Postgres.
--
-- A imagem usada é o `postgres` oficial, não a `supabase/postgres`: assim
-- cada papel e cada função abaixo é explícito e auditável, em vez de vir
-- pronto de uma imagem cujo conteúdo muda entre versões.
--
-- Roda uma única vez, na criação do volume. Para reaplicar:
--   docker compose down -v
-- ============================================================================

-- ------------------------------------------------------------- extensões ---
-- `pgcrypto` é usada pelo GoTrue; as demais pelas migrations da aplicação.
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ----------------------------------------------------------------- papéis ---
-- Os três papéis que o PostgREST assume conforme o JWT apresentado.
-- `nologin`: ninguém se conecta como eles, o `authenticator` é que troca.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
-- `bypassrls` é o que faz a service role enxergar tudo, como no Supabase.
create role service_role nologin noinherit bypassrls;

create user authenticator noinherit login password 'postgres';
grant anon, authenticated, service_role to authenticator;

create user supabase_auth_admin noinherit createrole login password 'postgres';
create user supabase_storage_admin noinherit createrole login password 'postgres';

-- --------------------------------------------------------------- schemas ---
-- GoTrue e Storage criam as próprias tabelas dentro destes schemas.
create schema if not exists auth authorization supabase_auth_admin;
create schema if not exists storage authorization supabase_storage_admin;

alter user supabase_auth_admin set search_path = 'auth';
alter user supabase_storage_admin set search_path = 'storage';

-- As migrations do GoTrue e do Storage criam objetos próprios; sem CREATE no
-- banco o Storage falha com "permission denied for database postgres".
grant create on database postgres to supabase_auth_admin, supabase_storage_admin;

grant usage on schema public to anon, authenticated, service_role;

-- No Supabase hospedado, anon/authenticated já nascem com privilégios amplos
-- em `public`: quem restringe de fato é a RLS, não o GRANT. Sem isto o
-- PostgREST responde "permission denied for table" antes mesmo de avaliar
-- qualquer política. Vale para tudo que o `postgres` criar daqui em diante —
-- ou seja, para as tabelas das migrations.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role, postgres;
grant usage on schema storage to anon, authenticated, service_role, postgres;

-- `profiles` referencia `auth.users` e um trigger em `auth.users` chama uma
-- função de `public` (migration 0008), então os dois lados precisam se ver.
grant all on schema public to supabase_auth_admin;

-- ------------------------------------------------------------- observação ---
-- Os helpers auth.uid()/auth.role()/auth.jwt()/auth.email() NÃO são criados
-- aqui. O GoTrue cria as duas primeiras nas próprias migrations e, como o
-- schema é dele, não conseguiria substituir funções pertencentes a `postgres`
-- ("must be owner of function uid").
--
-- Só que a versão do GoTrue lê o GUC legado `request.jwt.claim.sub`, que o
-- PostgREST 12 não publica — `auth.uid()` voltaria nulo e a RLS de 0009
-- negaria tudo. Por isso as quatro funções são redefinidas depois que o
-- GoTrue termina, em docker/postgres/auth-helpers.sql, aplicado pelo
-- docker/migrate.sh como superusuário.
