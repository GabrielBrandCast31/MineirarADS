"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

/**
 * Cliente Supabase do browser. Só a chave anônima chega aqui — toda a
 * proteção real vem da RLS definida em `supabase/migrations/0009_rls.sql`.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!clientEnv.NEXT_PUBLIC_SUPABASE_URL || !clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Supabase não configurado no client.");
  }
  browserClient ??= createBrowserClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return browserClient;
}
