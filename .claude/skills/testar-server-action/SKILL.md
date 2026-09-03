---
name: testar-server-action
description: Exercita uma Server Action ou rota protegida do AdMiner pela shell, com curl, incluindo o replay dos campos `$ACTION` que o React renderiza e o cookie de sessão local. Use quando pedirem para testar login, cadastro ou qualquer ação de formulário sem abrir o navegador, ou para reproduzir um bug de submit.
---

# Testar Server Action pela shell

## Rota protegida (o caso simples)

A sessão local é um cookie com o **id do usuário**:

```bash
curl -s http://localhost:3000/dashboard \
  -H "Cookie: adminer_demo_session=usr_demo" -o /dev/null -w '%{http_code}\n'
```

Os ids das contas existentes estão em `.data/store.json`. O valor `"1"` ainda
funciona como legado e significa "conta de demonstração".

Rotas de API respondem **401 em JSON** sem sessão (não redirecionam):

```bash
curl -s http://localhost:3000/api/ads -H "Cookie: adminer_demo_session=usr_demo" | head -c 400
```

## Server Action (o caso que engana)

Mandar só o header `Next-Action:` falha com `Error: Connection closed.` — falta
o estado anterior vinculado. O que funciona é **replicar o POST que um browser
sem JS envia**: os quatro campos ocultos que o React renderiza no formulário.

1. Faça GET da página e extraia os ocultos:

```bash
curl -s http://localhost:3000/login | grep -oE '\$ACTION[^"]*"[^"]*"' | head
```

Você precisa de `$ACTION_REF_1`, `$ACTION_1:0`
(`{"id":"<action id>","bound":"$@1"}`), `$ACTION_1:1` (o array de estado
anterior em JSON) e `$ACTION_KEY`.

2. Poste os quatro como `multipart/form-data` junto dos campos reais:

```bash
curl -s -X POST http://localhost:3000/login \
  -F '$ACTION_REF_1=' \
  -F '$ACTION_1:0={"id":"<id>","bound":"$@1"}' \
  -F '$ACTION_1:1=[{"error":null,"notice":null}]' \
  -F '$ACTION_KEY=<key>' \
  -F 'email=demo@adminer.local' -F 'password=demo1234' -D -
```

## Como ler o resultado

- **Sucesso:** `303` + `Location:` + `Set-Cookie:`.
- **Falha de validação:** `200` com a mensagem dentro do payload RSC.
- **`Error: Connection closed.`**: faltou um dos quatro campos.

Os ids de ação **mudam a cada rebuild** — extraia de novo sempre, não reaproveite
de uma sessão anterior.

## Se o submit não responde no navegador do usuário

Antes de procurar bug na ação, verifique se alguém rodou `npm run build` (ou
apagou `.next`) com o `next dev` no ar: isso invalida os chunks já carregados e
nenhum POST sai do browser. A correção é reiniciar o dev server e recarregar a
aba — ver a skill `verificar-saude`.
