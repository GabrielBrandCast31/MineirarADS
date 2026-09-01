#!/bin/sh
# ============================================================================
# Aplica supabase/migrations/*.sql na ordem numérica.
#
# A ordem importa além do nome dos arquivos: 0002 referencia `auth.users` e
# 0010 escreve em `storage.objects`. Essas tabelas não são criadas por nenhuma
# migration daqui — quem as cria são o GoTrue e o Storage, nas próprias
# migrations, ao subir. Por isso o script espera as duas existirem antes de
# começar.
#
# Cada arquivo aplicado fica registrado, então `docker compose up` repetido
# não tenta recriar tipos e estoura em "type already exists".
# ============================================================================
set -eu

export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"
PSQL="psql -v ON_ERROR_STOP=1 -h db -U postgres -d postgres"

echo "[migrate] aguardando auth.users (GoTrue) e storage.objects (Storage)…"
attempt=0
until [ "$($PSQL -tAc "select to_regclass('auth.users') is not null and to_regclass('storage.objects') is not null" 2>/dev/null || echo f)" = "t" ]; do
  attempt=$((attempt + 1))
  if [ "$attempt" -gt 60 ]; then
    echo "[migrate] ERRO: schemas auth/storage não apareceram em 120s." >&2
    echo "[migrate] verifique os logs: docker compose logs auth storage" >&2
    exit 1
  fi
  sleep 2
done
echo "[migrate] schemas prontos."

# Redefine auth.uid() e companhia por cima do que o GoTrue instalou — ver o
# cabeçalho do arquivo para o motivo. Precisa vir antes das migrations, que
# usam auth.uid() nas políticas de RLS.
echo "[migrate] ajustando helpers de JWT do schema auth"
$PSQL -q -f /auth-helpers.sql

$PSQL -q <<'SQL'
create schema if not exists migrations;
create table if not exists migrations.applied (
  filename    text primary key,
  applied_at  timestamptz not null default now()
);
SQL

applied_count=0
for file in /migrations/*.sql; do
  name=$(basename "$file")

  if [ -n "$($PSQL -tAc "select 1 from migrations.applied where filename = '$name'")" ]; then
    echo "[migrate] $name — já aplicada, pulando"
    continue
  fi

  echo "[migrate] $name — aplicando"
  # --single-transaction: um arquivo que falha no meio não deixa resíduo.
  $PSQL --single-transaction -f "$file"
  $PSQL -q -c "insert into migrations.applied (filename) values ('$name')"
  applied_count=$((applied_count + 1))
done

# As tabelas de `storage` pertencem ao supabase_storage_admin, fora do alcance
# dos default privileges definidos para o `postgres`. E um banco criado antes
# desses defaults existirem também precisa da varredura. É idempotente.
echo "[migrate] concedendo privilégios a anon/authenticated/service_role"
$PSQL -q <<'SQL'
grant all on all tables    in schema public  to anon, authenticated, service_role;
grant all on all sequences in schema public  to anon, authenticated, service_role;
grant all on all routines  in schema public  to anon, authenticated, service_role;
grant all on all tables    in schema storage to anon, authenticated, service_role;
grant all on all sequences in schema storage to anon, authenticated, service_role;
SQL

echo "[migrate] concluído — $applied_count migration(s) nova(s)."
