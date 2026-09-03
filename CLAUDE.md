@AGENTS.md

# AdMiner (`MineirarADS`)

Plataforma de mineração de anúncios da Meta Ad Library: minerar → agrupar em
ofertas → pontuar → analisar (copy/criativo/transcrição) → monitorar ao longo
do tempo. Next.js 16 + React 19 + TypeScript strict + Tailwind 4. Comentários,
mensagens de erro e UI em **português**.

Este arquivo existe para você **não precisar reexplorar o repositório**. Se algo
aqui estiver errado ou desatualizado, corrija o arquivo junto com o código.

## Antes de tudo: as três armadilhas que já quebraram sessões

1. **Nunca rode `npm run build` (nem apague `.next`) com o `next dev` no ar.**
   Os dois compartilham `.next`; buildar por cima mata os chunks que o browser
   do usuário já carregou. A página para de responder ao submit (nenhum POST
   chega ao servidor) e *parece* bug do produto. Pare o dev primeiro.
2. **`pkill -f "next dev"` deixa o filho `next-server` vivo.** Confira com
   `ps -eo pid,command | grep next` e mate os dois PIDs.
3. **A app normalmente já está no ar** no container `adminer-web`
   (`docker compose --profile demo up`), em **localhost:3000**, com bind-mount
   do repo rodando `next dev` — edições no host dão hot-reload lá dentro.
   Rode `docker ps` antes de subir outro `npm run dev`, que cairia calado na
   porta 3001 e te faria depurar a instância errada.

## Comandos

```bash
npm run dev          # next dev            (confira docker ps antes)
npx tsc --noEmit     # gate 1 — tipos
npx eslint .         # gate 2 — lint
npm test             # gate 3 — node --test com type stripping
npm run build        # gate 4 — pare o dev server antes
npm run worker       # worker de jobs (fila fora do request)
```

Os quatro gates estavam verdes em 2026-09-03. Rode-os antes de declarar
qualquer trabalho pronto — ou use a skill `verificar-saude`, que já cobre as
armadilhas acima.

Testes usam o runner nativo do Node (`--experimental-strip-types`) com
`scripts/test-hooks.mjs` resolvendo os aliases `@/*`. Não há Jest/Vitest; não
adicione um.

## Arquitetura — a regra que não se quebra

Dependência flui **para dentro**. Camada de fora conhece a de dentro, nunca o
contrário:

```
app/ (RSC, rotas)  →  server/ (actions, services)  →  data/ (repositórios)  →  core/
components/        →  core/ (tipos, cálculo)          providers/ (fontes externas)
```

| Diretório | Papel | Regra |
| --- | --- | --- |
| `src/core/` | Tipos, cálculo de score, heurísticas de copy/criativo, agrupamento em ofertas, planos | **Puro**. Sem I/O, sem `process.env`, sem React. É onde a regra de negócio é testável de graça. |
| `src/data/` | Repositórios por trás de interfaces em `data/types.ts`; drivers `memory/` e `supabase/` | Serviço nenhum sabe qual driver está ativo. Toda assinatura recebe `SessionContext` como 1º argumento. |
| `src/providers/` | Fontes externas: `ads/` (mock \| meta), `ai/` (heuristic \| anthropic \| openai) | Fábrica por env var, com cache no módulo e `setXProvider()` para teste. |
| `src/server/` | `auth.ts`, `services/` (regra que orquestra), `actions/` (Server Actions) | Cota e feature de plano são checadas **aqui**, nunca na UI. |
| `src/jobs/` | Fila (`memory` \| `redis`), handlers, worker | Não conhece auth: recebe um resolver de contexto via `setJobContextResolver`. |
| `src/app/` | Rotas. `(app)` protegido, `(auth)` público, `api/` JSON | Páginas são RSC `async`; guard em `(app)/layout.tsx` via `requireSession()`. |
| `src/components/` | `ui/` (primitivas Radix + cva), depois por domínio | Client component só quando há interação. |
| `src/mock/` | Dataset sintético determinístico (`rng.ts`) | É o que faz a demonstração parecer produto real. |

Trocar comportamento de infraestrutura é **variável de ambiente**, não código:
`DATA_DRIVER`, `ADS_PROVIDER`, `AI_PROVIDER`, `JOB_DRIVER`.

## Invariantes (o revisor vai cobrar)

- **Env só por `@/lib/env`.** `process.env` espalhado é proibido. `serverEnv()`
  lança se chamado no client — isso é intencional. Novas variáveis entram no
  schema Zod *e* em `.env.example`.
- **Server Action devolve `ActionResult<T>`**, nunca lança para o cliente:
  `try { ... success(x) } catch (e) { return failure(e) }`. `failure()`
  (`src/server/actions/result.ts`) mapeia erro tipado → `code` que a UI usa
  (ex.: `quota` abre o modal de upgrade). Exceção: os fluxos de auth em
  `app/(auth)/actions.ts` usam `AuthState` porque vivem em `useActionState`.
- **Rota de API sempre dentro de `apiHandler`** (`@/lib/api/handler`): sessão,
  rate limit, erro tipado → status e log já vêm de graça. Corpo e query por
  `readJson`/`readQuery` com schema Zod.
- **Cota antes de gastar recurso:** `assertQuota(ctx, metric)` e
  `assertFeature(ctx, feature)` **lançam** de propósito — retornar booleano
  seria um furo silencioso de faturamento. Limites só em
  `core/constants/plans.ts`; nunca escreva um número de limite no código.
- **Mensagem de erro é texto de produto**, em português, dizendo o que fazer.
- **`noUncheckedIndexedAccess` está ligado**: `array[0]` é `T | undefined`.
  Trate, não use `!` por reflexo.
- `import type` inline é a convenção (`consistent-type-imports`, fixStyle inline).

## Next 16 — o que difere do que você "sabe"

`AGENTS.md` manda ler `node_modules/next/dist/docs/` antes de escrever código de
framework. Vale mesmo. Os pontos que já custaram tempo aqui:

- **`src/proxy.ts` é o antigo `middleware`.** Existe por um motivo que guard de
  página não cobre: o token do Supabase expira e **Server Component não pode
  escrever cookie** — é só ali que o refresh vira `Set-Cookie`. Roda também nas
  rotas de API (que respondem 401 JSON, sem redirect).
- No proxy, use sempre `supabase.auth.getUser()`; `getSession()` não valida o
  JWT no servidor.
- O desvio de `/login` só acontece com sessão **comprovada**
  (`sessionVerified`). Confiar na mera presença do cookie criava laço infinito
  quando o cookie sobrevivia ao usuário (`.data` apagado, conta removida).
- `cookies()`, `headers()` e `params` de rota são **assíncronos** (`await`).

## Sessão: dois modos, uma saída

`getSession()` devolve `SessionContext` e o resto da aplicação **não sabe** qual
modo está ativo. Sem chaves do Supabase, `isDemoMode()` é true e vale o **modo
local**: contas de verdade, em memória e em disco, senha em hash scrypt
(`data/memory/accounts.ts`). A conta de demonstração é só uma delas —
`demo@adminer.local` / `demo1234`, apontando para o workspace com dados
sintéticos. Cadastro cria conta e workspace próprio e vazio.

O cookie `adminer_demo_session` guarda o **id do usuário** (`usr_demo`,
`usr_<slug>`), não `"1"` — `"1"` sobrevive só como legado = conta de
demonstração. Nomes de cookie em `lib/session-cookies.ts`, compartilhados entre
`proxy.ts` (Edge) e `server/auth.ts` (Node).

Para bater em rota protegida pela shell:
`-H "Cookie: adminer_demo_session=usr_demo"`.

## Estado do driver `memory`

Persiste em `.data/store.json` (`MEMORY_STORE_FILE`), autosave a cada 3s; o
dataset sintético e os logs não são gravados — são reconstruídos no boot. O
arquivo é ignorado pelo git.

- **Editar `.data/store.json` com o servidor no ar não funciona:** o processo
  tem o store em memória e regrava por cima no próximo tique. Pare o servidor
  (os dois PIDs), edite, reinicie.
- **Todo teste que toca o store começa com `disableStorePersistence()`**,
  importado *antes* de qualquer acesso — senão o teste grava por cima do estado
  real de quem está desenvolvendo. Veja
  `src/server/services/__tests__/monitoring.test.ts` como modelo.

## Design system

Dark-first, tokens OKLCH em `src/app/globals.css` (`@theme` do Tailwind 4). Use
os tokens, **não** cores literais nem a paleta padrão do Tailwind:

- Superfícies: `canvas`, `bg`, `surface`, `surface-2`, `surface-3`
- Bordas: `line`, `line-strong` · Texto: `ink`, `ink-muted`, `ink-faint`
- Marca: `brand`, `brand-hi`, `brand-lo`, `brand-ink` · Score: `heat*`
- Semânticas: `ok`, `warn`, `bad`, `info` · Raios `--radius-*`, animações `--animate-*`

Primitivas em `components/ui/` usam `cva` + `cn` (`@/lib/utils`) com variantes
nomeadas. Antes de criar componente, veja se a primitiva já existe.

## Onde procurar o quê

| Preciso de… | Arquivo |
| --- | --- |
| Fluxo central (minerar) | `server/services/search.ts` → `mineAds` |
| Acompanhar oferta no tempo | `server/services/monitoring.ts` |
| Score de anúncio | `core/score/` (`factors`, `ad-score`, `derive`) |
| Link colado da Ad Library | `core/meta/ad-library-link.ts` |
| Planos, limites, features | `core/constants/plans.ts` |
| Contrato de repositório | `data/types.ts` |
| Mapa de navegação / rotas | `components/layout/nav-items.ts` |
| Stack Supabase local | `compose.yaml` (profile `supabase`), `docker/README.md` |
| Chaves JWT do Supabase local | `node scripts/supabase-keys.mjs` (o trio é assinado junto) |

## Estado do repositório

Um único commit histórico (`f23ddf1 first`) + `385cd98 feat/frontend`; qualquer
coisa anterior é invisível ao `git log` — para arqueologia pré-commit, ordene por
mtime. **Leia `git status` / `git diff` primeiro: é ali que está a frente de
trabalho ativa.** O bloco `nextjs-agent-rules` em `AGENTS.md` é reescrito pelo
`next dev`; commite-o com o seu trabalho em vez de tentar removê-lo.

## Ferramentas deste projeto

Skills: `verificar-saude`, `testar-server-action`, `next16-docs`,
`recurso-de-plano`, `sessao-local`.
Agentes: `adminer-explorador`, `adminer-dados`, `adminer-revisor`, `adminer-ui`.
