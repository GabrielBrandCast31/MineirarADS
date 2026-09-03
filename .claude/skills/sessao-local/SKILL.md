---
name: sessao-local
description: Opera o modo local do AdMiner (sem Supabase) — contas, cookie de sessão, workspace de demonstração e o estado em `.data/store.json`. Use ao criar/inspecionar conta de teste, depurar login ou redirecionamento em laço, limpar estado local, ou entender por que uma edição em `.data/store.json` "voltou sozinha".
---

# Modo local do AdMiner

Sem chaves do Supabase, `isDemoMode()` é true e o app roda em **modo local**:
contas de verdade em memória e em disco, senha em hash scrypt
(`src/data/memory/accounts.ts`). Todo o resto da aplicação só vê
`SessionContext` e não sabe qual modo está ativo.

- Conta de demonstração: `demo@adminer.local` / `demo1234` → workspace com
  dataset sintético.
- Cadastro cria conta e workspace **próprio e vazio**.
- E-mail desconhecido ou senha errada são **recusados** com mensagem (antes
  qualquer credencial abria a demonstração — isso era pior que um erro).

## Cookies

| Cookie | Conteúdo |
| --- | --- |
| `adminer_demo_session` | **id do usuário** (`usr_demo`, `usr_<slug>`). `"1"` é legado = demonstração. |
| `adminer_workspace` | workspace ativo, quando há mais de um |

Nomes em `src/lib/session-cookies.ts` — módulo próprio porque `proxy.ts` (Edge) e
`server/auth.ts` (Node) não podem se importar.

## Inspecionar o estado

```bash
python3 -m json.tool .data/store.json | head -60
grep -o '"id": "usr_[^"]*"' .data/store.json | sort -u   # contas existentes
```

## Editar o estado — a armadilha

O processo do `next dev` mantém o store em memória e **regrava por cima do
arquivo** (autosave a cada 3s). Editar com o servidor no ar é desfeito no
próximo tique, e a depuração parece bug do produto.

```bash
ps -eo pid,command | grep -E "next dev|next-server" | grep -v grep   # mate os DOIS
# edite .data/store.json
npm run dev
```

`pkill -f "next dev"` deixa o filho `next-server` vivo. Confirme por `ps`.

## Depurar login em laço

Se o usuário fica preso fora da aplicação, o suspeito é **cookie que sobreviveu
ao usuário** (`.data` apagado, conta removida, `MEMORY_STORE_FILE` trocado). O
proxy já trata isso: só desvia de `/login` com sessão comprovada
(`sessionVerified`), deixando `(auth)/layout.tsx` decidir quando não há certeza.
Se o laço voltar, verifique se alguém confiou na simples presença do cookie no
proxy.

## Em teste

Primeira linha executável do arquivo de teste, **antes** de qualquer acesso ao
store:

```ts
import { disableStorePersistence } from "@/data/memory/persistence";
disableStorePersistence();
```

Sem isso o teste grava por cima do estado real de quem está desenvolvendo.
Modelo: `src/server/services/__tests__/monitoring.test.ts`.
