import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { clientEnv, isSupabaseConfigured } from "@/lib/env";
import { DEMO_SESSION_COOKIE } from "@/lib/session-cookies";

/**
 * Proxy de sessão (o antigo `middleware`, renomeado no Next 16).
 *
 * Existe por um motivo que os guards de página não conseguem cobrir: o token
 * do Supabase expira (1h por padrão) e **Server Components não podem escrever
 * cookies**. Sem este passo, o refresh nunca é persistido e o usuário é
 * deslogado no meio da navegação. É aqui — e só aqui — que a renovação vira
 * `Set-Cookie`.
 *
 * O redirecionamento é secundário: `(app)/layout.tsx` e `(auth)/layout.tsx` já
 * protegem as rotas. Fazer o desvio na borda apenas evita renderizar uma
 * árvore inteira para depois descartá-la.
 */

/** Rotas acessíveis sem sessão. */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Rotas de API respondem 401 em JSON (ver `@/lib/api/handler`); redirecionar
  // um fetch para HTML de login só produziria erro de parse no cliente.
  const isApi = pathname.startsWith("/api/");

  if (!isSupabaseConfigured()) {
    // Modo local: não há token para renovar, apenas um cookie próprio. E aqui
    // na borda só se sabe que ele **existe** — não a quem ele pertence, porque
    // resolver isso exigiria carregar o store inteiro no proxy.
    const hasLocalSession = request.cookies.has(DEMO_SESSION_COOKIE);
    return (
      guard({ request, authenticated: hasLocalSession, isApi, sessionVerified: false }) ??
      NextResponse.next()
    );
  }

  // `response` é reatribuído dentro de `setAll` para carregar os cookies
  // renovados — por isso não é `const`.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Chamada obrigatória: é ela que dispara o refresh do token quando expirado.
  // Use sempre `getUser()` — `getSession()` não valida o JWT no servidor.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `getUser()` valida o JWT, então aqui a resposta é confiável.
  const redirectResponse = guard({
    request,
    authenticated: Boolean(user),
    isApi,
    sessionVerified: true,
  });
  if (!redirectResponse) return response;

  // Os cookies renovados precisam sobreviver ao redirecionamento, senão o
  // refresh se perde e o próximo request repete o ciclo.
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}

/**
 * Decide o desvio. Devolve `null` quando o request deve seguir normalmente.
 */
function guard({
  request,
  authenticated,
  isApi,
  sessionVerified,
}: {
  request: NextRequest;
  authenticated: boolean;
  isApi: boolean;
  /**
   * Se `authenticated` significa "esta sessão existe de verdade" ou apenas
   * "há um cookie". Ver o desvio de rota pública abaixo.
   */
  sessionVerified: boolean;
}): NextResponse | null {
  if (isApi) return null;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!authenticated && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Preserva o destino para voltar até ele depois do login.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Só desvia de /login com uma sessão comprovada. Com o cookie apenas
  // presente, isto criava um laço infinito: o proxy mandava para /dashboard
  // pela presença do cookie, `(app)/layout.tsx` não achava o usuário e mandava
  // de volta para /login. Acontece sempre que o cookie sobrevive ao usuário —
  // conta removida, `.data` apagado, `MEMORY_STORE_FILE` trocado — e prendia a
  // pessoa fora da aplicação, sem nem conseguir ver o formulário de login.
  // Quando não há certeza, `(auth)/layout.tsx` faz o desvio: ele resolve a
  // sessão de fato.
  if (authenticated && isPublic && sessionVerified) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return null;
}

export const config = {
  /**
   * Roda em tudo menos assets — inclusive nas rotas de API, que também
   * precisam do token renovado, mesmo sem redirecionamento.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
