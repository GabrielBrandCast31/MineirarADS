# Ambiente local em Docker

## Os dois comandos

```bash
docker compose up                     # app em modo demo (dados mockados)
docker compose --profile supabase up  # stack Supabase + app sobre Postgres
```

O `.env` define `COMPOSE_PROFILES=demo`, por isso o primeiro não precisa de
flag. Passar `--profile` **substitui** esse valor (não soma), então os dois
serviços `web` nunca sobem juntos nem disputam a porta 3000.

Primeira vez:

```bash
cp .env.docker.example .env
```

## Portas

| Porta   | Serviço                                            |
|---------|----------------------------------------------------|
| `3000`  | Aplicação                                          |
| `8000`  | Gateway do Supabase (`/auth/v1`, `/rest/v1`, `/storage/v1`) |
| `54322` | Postgres (`psql postgres://postgres:postgres@localhost:54322/postgres`) |
| `54323` | Supabase Studio                                    |

A porta do Postgres é 54322, e não 5432, para não colidir com uma instalação
local da máquina.

## O que sobe em cada perfil

**demo** — só `web`. Sem Supabase configurado, `isDemoMode()` é verdadeiro:
repositórios em memória, dataset sintético e sessão por cookie. Não depende de
nada externo.

**supabase** — `db`, `auth` (GoTrue), `rest` (PostgREST), `storage`, `gateway`
(nginx), `migrate`, `meta` + `studio`, e o `web` com `DATA_DRIVER=supabase`.

## Ordem de subida

Não é arbitrária. As migrations da aplicação dependem de tabelas que não são
criadas por elas:

1. `db` fica saudável e roda `docker/postgres/init.sql` (papéis, schemas,
   privilégios padrão);
2. `auth` e `storage` sobem e aplicam as **próprias** migrations, criando
   `auth.users` e `storage.objects`;
3. `migrate` espera essas duas tabelas existirem, redefine os helpers
   `auth.uid()` e companhia, aplica `supabase/migrations/0001..0010` e concede
   privilégios a `anon`/`authenticated`/`service_role`;
4. `web` só inicia depois que o `migrate` termina com sucesso.

O `migrate` registra cada arquivo aplicado em `migrations.applied`, então
repetir `docker compose --profile supabase up` não tenta recriar tipos.

## Chaves

`ANON_KEY` e `SERVICE_ROLE_KEY` são JWTs assinados com `JWT_SECRET` — os três
andam juntos. Para trocar o segredo, regere o trio:

```bash
node scripts/supabase-keys.mjs "seu-novo-segredo-com-32+-caracteres"
```

Os valores do `.env.docker.example` são de desenvolvimento local. Nunca use em
produção.

## Recomeçar do zero

```bash
docker compose --profile supabase down -v   # -v apaga os volumes
docker compose --profile supabase up
```

O `init.sql` só roda na criação do volume do Postgres: sem o `-v`, mudanças
nele não têm efeito.

## Decisões que talvez surpreendam

**Não há Redis.** `src/jobs/redis-queue.ts` é um esqueleto que lança erro em
toda operação, e `bullmq`/`ioredis` não estão instalados. Subir Redis com
`JOB_DRIVER=redis` daria um app que quebra no primeiro job, então o driver
fica fixo em `memory`.

**Não há container de worker.** Com a fila em memória, um worker em processo
separado drenaria a própria fila vazia — os jobs vivem no processo do `web`.
Faz sentido criá-lo junto com o driver Redis, não antes.

**`postgres:16-alpine`, não `supabase/postgres`.** Assim cada papel, schema e
função fica explícito em `docker/postgres/init.sql`, em vez de vir pronto de
uma imagem cujo conteúdo muda entre versões.

**nginx no lugar do Kong.** O gateway só precisa rotear três prefixos. O Kong
exigiria configuração declarativa e substituição de variáveis no boot para o
mesmo resultado.

**`NEXT_PUBLIC_SUPABASE_URL` aponta para `http://gateway:8000`**, um hostname
interno. Quem fala com o Supabase é sempre o servidor (`src/lib/supabase/server.ts`
e `src/proxy.ts`); `getSupabaseBrowserClient` existe mas não é chamado por
ninguém. Se um dia o browser passar a falar direto com o Supabase, esta URL
precisa virar `http://localhost:8000`.
