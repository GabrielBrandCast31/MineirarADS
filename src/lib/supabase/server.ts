import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { clientEnv, isSupabaseConfigured, serverEnv } from "@/lib/env";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e rotas.
 *
 * Usa a chave anônima e o cookie de sessão do usuário: **a RLS se aplica**.
 * É o cliente correto para tudo que o usuário faz.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e a anon key.");
  }
  const cookieStore = await cookies();

  return createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL!,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components não podem escrever cookies. A renovação de
            // token acontece nas Server Actions e rotas, onde a escrita é
            // permitida — ignorar aqui é o comportamento recomendado.
          }
        },
      },
    },
  );
}

let serviceClient: SupabaseClient | null = null;

/**
 * Cliente com service role: **ignora RLS**.
 *
 * Use SOMENTE em ingestão, workers e no painel administrativo, sempre no
 * servidor. Nunca exponha esta chave ao browser, nunca passe dados dela para
 * o cliente sem filtrar por workspace na aplicação.
 */
export function createSupabaseServiceClient(): SupabaseClient {
  if (serviceClient) return serviceClient;
  const env = serverEnv();
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ausente. Necessária para ingestão, workers e /admin.",
    );
  }
  serviceClient = createClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return serviceClient;
}
