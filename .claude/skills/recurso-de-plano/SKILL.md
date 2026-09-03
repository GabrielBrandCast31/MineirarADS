---
name: recurso-de-plano
description: Adiciona ao AdMiner um recurso que consome cota ou depende de plano (Free/Pro/Agency), na ordem correta — plano, tipo de métrica, checagem no serviço, incremento de uso, código de erro e reação da UI. Use ao criar qualquer funcionalidade cobrável, ao mudar limite de plano, ou quando pedirem para "travar isso no Pro".
---

# Adicionar recurso cobrável

Cota é faturamento. A falha aqui não aparece como erro: aparece como recurso
liberado de graça, ou como usuário travado sem explicação. Siga a ordem.

## 1. Declare no plano

`src/core/constants/plans.ts` é a **fonte única** de limites, features e preço.

- Recurso ligado/desligado por plano → novo `PlanFeature` + rótulo em
  `PLAN_FEATURE_LABEL` + entrada na lista `features` de cada plano.
- Recurso contado por mês → novo `UsageMetric` em
  `src/core/types/workspace.ts`, rótulo em `USAGE_METRIC_LABEL`, a chave de
  limite em `METRIC_TO_LIMIT` e o valor em cada plano (`null` = ilimitado).
  Esquecer `METRIC_TO_LIMIT` não dá erro de tipo: `limitFor()` devolve `null` e
  a métrica passa a ser **ilimitada em todos os planos**, calada.

Nunca escreva um número de limite fora deste arquivo.

## 2. Ensine o repositório a contar

Métrica nova precisa de leitura e escrita em `usage` **nos dois drivers**
(`src/data/memory/`, `src/data/supabase/`). Ver o agente `adminer-dados`.

## 3. Cheque no serviço, antes de gastar

Em `src/server/services/`, no começo da operação:

```ts
assertFeature(ctx, "minha_feature");     // plano permite?
await assertQuota(ctx, "minha_metrica"); // ainda cabe?
// ... executa ...
await getRepositories().usage.increment(ctx, "minha_metrica");
```

As duas **lançam** de propósito — retornar booleano seria um furo silencioso.
Cheque no serviço, nunca só na UI: a UI é sugestão, não controle. Incremente
**depois** do sucesso, para o usuário não pagar por falha do provider.

## 4. Traduza o erro na borda

Já está pronto e não precisa de código novo: `QuotaExceededError` e
`FeatureLockedError` viram `code: "quota"` / `"feature_locked"` em
`src/server/actions/result.ts` (Server Action) e `402` em
`src/lib/api/handler.ts` (rota de API).

## 5. Reaja na interface

Client component que chama a ação trata `result.ok === false` e usa
`result.code`: `quota` e `feature_locked` levam a `/settings/plan` com a
mensagem do erro (que já vem em português e já diz o limite), não a um toast
genérico. Se o recurso aparece no menu, esconder não basta — o servidor precisa
recusar.

## 6. Prove

Teste no serviço com sessão de workspace `free`: deve lançar; com `pro`, deve
passar e incrementar. Modelo em `src/server/services/__tests__/monitoring.test.ts`
(note o `disableStorePersistence()` na primeira linha). Depois, gates da skill
`verificar-saude`.
