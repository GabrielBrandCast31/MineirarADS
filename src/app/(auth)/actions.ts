"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { endSession, startDemoSession } from "@/server/auth";

export interface AuthState {
  error: string | null;
  notice: string | null;
}

export const EMPTY_AUTH_STATE: AuthState = { error: null, notice: null };

const credentialsSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres."),
  name: z.string().trim().max(80).optional(),
});

const DEFAULT_DESTINATION = "/dashboard";

/**
 * Destino pós-login a partir do campo `next`.
 *
 * O valor vem da query string, ou seja, do usuário. Só aceitamos caminhos
 * internos: qualquer coisa absoluta ou protocol-relative (`//evil.com`, que o
 * browser trata como host externo) viraria um open redirect.
 */
function safeDestination(raw: FormDataEntryValue | null): string {
  if (typeof raw !== "string") return DEFAULT_DESTINATION;
  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_DESTINATION;
  // `/login` e `/signup` levariam a um laço de redirecionamento.
  if (value === "/login" || value === "/signup") return DEFAULT_DESTINATION;
  return value;
}

/**
 * Entrar.
 *
 * Sem Supabase configurado, a aplicação roda em modo demonstração: o
 * formulário continua existindo (e validando), mas a sessão é um cookie
 * apontando para o workspace mockado. Isso mantém o fluxo de produto igual
 * nos dois modos.
 */
export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", notice: null };
  }

  const destination = safeDestination(formData.get("next"));

  if (isDemoMode()) {
    await startDemoSession();
    redirect(destination);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: translateAuthError(error.message), notice: null };
  }
  redirect(destination);
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", notice: null };
  }

  const destination = safeDestination(formData.get("next"));

  if (isDemoMode()) {
    await startDemoSession(parsed.data.name);
    redirect(destination);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name ?? null } },
  });
  if (error) {
    return { error: translateAuthError(error.message), notice: null };
  }
  // Projeto com confirmação de e-mail ativa não devolve sessão imediatamente.
  if (!data.session) {
    return {
      error: null,
      notice: "Conta criada. Confirme o e-mail que enviamos para entrar.",
    };
  }
  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  await endSession();
  redirect("/login");
}

/** Mensagens do Supabase Auth chegam em inglês; traduzimos as mais comuns. */
function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
    "User already registered": "Já existe uma conta com esse e-mail.",
    "Password should be at least 6 characters":
      "A senha precisa ter ao menos 6 caracteres.",
  };
  return map[message] ?? message;
}
