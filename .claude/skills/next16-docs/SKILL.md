---
name: next16-docs
description: Consulta a documentação do Next.js instalada em node_modules antes de escrever código de framework (rota, layout, cache, cookies, middleware/proxy, Server Action, next/image). Use sempre que a tarefa tocar API do Next 16 — esta versão tem breaking changes em relação ao que o modelo "sabe" de treino.
---

# Consultar a documentação do Next 16 deste repositório

`AGENTS.md` (reescrito pelo próprio `next dev`) manda ler a documentação
instalada antes de escrever código de framework. Isto não é formalidade: a
versão aqui é a **16.3.x** e várias convenções mudaram.

## Onde está

```bash
ls node_modules/next/dist/docs/            # 01-app  02-pages  03-architecture  04-community
grep -rl "<assunto>" node_modules/next/dist/docs/01-app | head
```

Use `01-app` — este projeto é App Router. Procure pelo nome da API, não por
descrição em prosa. Leia a página inteira do assunto e **respeite os avisos de
deprecação**.

## O que já sabemos que mudou (não precisa reconsultar)

- **`middleware.ts` virou `src/proxy.ts`**, exportando `proxy()` + `config`.
  Neste projeto ele existe para renovar o token do Supabase: Server Component
  não pode escrever cookie, então é o único lugar onde o refresh vira
  `Set-Cookie`. Também roda nas rotas de API, que respondem 401 JSON.
- **`cookies()`, `headers()` e o `params` de rota/página são assíncronos** —
  sempre `await`.
- `typedRoutes` está **desligado** em `next.config.ts`; não conte com tipos de
  rota gerados.
- `next/image` só aceita os hosts de `remotePatterns` em `next.config.ts`; host
  novo exige entrada lá.
- Server Action neste projeto devolve `ActionResult<T>` (ver
  `src/server/actions/result.ts`), exceto o fluxo de auth, que usa `AuthState`
  com `useActionState`.

## Regra de conduta

Se a documentação instalada contradisser o que você lembra, **a documentação
instalada ganha**. Se você mudou de abordagem por causa dela, diga qual página
leu — isso poupa a próxima sessão.
