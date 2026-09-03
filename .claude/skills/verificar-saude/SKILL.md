---
name: verificar-saude
description: Roda os quatro gates de saúde do AdMiner (tsc, eslint, test, build) na ordem segura, sem derrubar o dev server nem a sessão do navegador do usuário. Use antes de commitar, antes de abrir PR, ao terminar uma tarefa, ou quando pedirem "verifica se está tudo ok / roda os testes / builda".
---

# Verificar saúde do AdMiner

Quatro gates. O quarto tem uma armadilha que **já derrubou a sessão do
navegador do usuário** — leia o passo 0 antes de rodar qualquer coisa.

## Passo 0 — descubra o que está no ar

```bash
docker ps --format '{{.Names}}\t{{.Ports}}' | grep -i adminer
ps -eo pid,command | grep -E "next (dev|start)|next-server" | grep -v grep
```

`npm run build` e `next dev` **compartilham o diretório `.next`**. Buildar com o
dev no ar apaga os chunks que o browser do usuário já carregou: a página deixa
de responder ao submit (nenhum POST chega ao servidor) e parece bug do produto.

## Passo 1 — gates que não tocam `.next`

Rode os três em paralelo; eles são independentes:

```bash
npx tsc --noEmit    # tipos (strict + noUncheckedIndexedAccess)
npx eslint .        # lint
npm test            # node --test com type stripping e aliases @/*
```

Se `npm test` reclamar de resolução de módulo, o culpado é
`scripts/test-hooks.mjs` (aliases `@/*` e imports sem extensão) — não adicione
bundler nem framework de teste.

## Passo 2 — build (só se for necessário)

Não builde por hábito. Builde quando a mudança afetar build/rota/bundle, ou
quando pedirem explicitamente.

1. Se o app está no container `adminer-web`: **não** rode `npm run build` no
   host. Ou pare o container, ou builde dentro dele.
2. Se há `next dev` no host: pare **os dois** processos — `pkill -f "next dev"`
   deixa o filho `next-server` vivo. Confira com `ps` e mate os PIDs restantes.
3. `npm run build`.
4. Reinicie o que você parou e diga ao usuário que reiniciou (a aba dele
   precisa de um reload).

## Relato

Diga o resultado de cada gate que rodou, quais **não** rodou e por quê, e cole a
saída real da falha (não parafraseie). Se o build ficou de fora porque o dev
server estava no ar, diga isso — é informação, não omissão.
