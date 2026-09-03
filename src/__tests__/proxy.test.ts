import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { DEMO_SESSION_COOKIE } from "@/lib/session-cookies";

/**
 * O laço de redirecionamento que prendia o usuário fora da aplicação.
 *
 * Na borda só se sabe que o cookie existe, não a quem pertence. Quando ele
 * sobrevive ao usuário (conta removida, `.data` apagado, `MEMORY_STORE_FILE`
 * trocado), o proxy mandava para /dashboard pela presença do cookie e
 * `(app)/layout.tsx` mandava de volta para /login — sem fim, e sem a pessoa
 * conseguir nem ver o formulário.
 */

function request(pathname: string, cookie?: string): NextRequest {
  const req = new NextRequest(new URL(`http://localhost:3000${pathname}`));
  if (cookie) req.cookies.set(DEMO_SESSION_COOKIE, cookie);
  return req;
}

/** `null` quando a resposta segue adiante; o destino quando desvia. */
function destinationOf(response: Response): string | null {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

test("com cookie presente, /login continua sendo servido", async () => {
  // O desvio para /dashboard cabe a `(auth)/layout.tsx`, que resolve a sessão
  // de verdade. Desviar aqui, pela presença do cookie, fecha o laço.
  const response = await proxy(request("/login", "usr_fantasma"));
  assert.equal(destinationOf(response), null);
});

test("cookie presente não impede o cadastro", async () => {
  const response = await proxy(request("/signup", "usr_fantasma"));
  assert.equal(destinationOf(response), null);
});

test("rota protegida sem cookie vai para /login com o destino preservado", async () => {
  const response = await proxy(request("/monitoring"));
  assert.equal(destinationOf(response), "/login");
  assert.equal(
    new URL(response.headers.get("location")!).searchParams.get("next"),
    "/monitoring",
  );
});

test("rota protegida com cookie segue adiante — quem valida é o layout", async () => {
  const response = await proxy(request("/dashboard", "usr_demo"));
  assert.equal(destinationOf(response), null);
});

test("rota de API nunca é redirecionada para HTML", async () => {
  // Um fetch que recebesse a página de login quebraria no parse; o handler
  // responde 401 em JSON.
  const response = await proxy(request("/api/search"));
  assert.equal(destinationOf(response), null);
});
