import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext, WorkspaceRole } from "@/core/types/workspace";
import { adminEmails, isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/session-cookies";
import { DEMO_USER_ID, getMemoryStore } from "@/data/memory/store";
import {
  createLocalAccount,
  findCredentialByEmail,
  verifyPassword,
} from "@/data/memory/accounts";

/**
 * Resolve a sessão atual.
 *
 * Dois modos, mesma saída:
 *  - **Supabase configurado**: sessão real via Supabase Auth + RLS.
 *  - **Modo local** (sem Supabase): contas guardadas em memória e em disco,
 *    com cookie próprio apontando para o usuário — a de demonstração inclusa.
 *
 * Todo o resto da aplicação recebe apenas `SessionContext` e não sabe qual
 * modo está ativo. Isso é o que permite construir e validar o produto inteiro
 * antes de existir um banco.
 */
export async function getSession(): Promise<SessionContext | null> {
  return isDemoMode() ? getDemoSession() : getSupabaseSession();
}

export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Para rotas de API: devolve `null` em vez de redirecionar. */
export async function getApiSession(): Promise<SessionContext | null> {
  return getSession();
}

/* ------------------------------------------------------------- local ----- */

/**
 * Sessão local (sem Supabase).
 *
 * O cookie guarda o `id` do usuário, e não um simples "1": é o que permite
 * mais de uma conta no mesmo modo — a de demonstração, com dados sintéticos, e
 * as contas reais criadas pelo cadastro, cada uma no seu workspace. O valor
 * legado `"1"` continua valendo como "conta de demonstração", para não invalidar
 * sessões (e scripts) já existentes.
 */
async function getDemoSession(): Promise<SessionContext | null> {
  const store = getMemoryStore();
  const jar = await cookies();

  const cookieValue = jar.get(DEMO_SESSION_COOKIE)?.value;
  if (!cookieValue) return null;

  const userId = cookieValue === "1" ? DEMO_USER_ID : cookieValue;
  const user = store.users.find((candidate) => candidate.id === userId);
  if (!user) return null;

  const memberships = store.members.filter((member) => member.userId === user.id);
  const preferred = jar.get(WORKSPACE_COOKIE)?.value;
  const membership =
    memberships.find((member) => member.workspaceId === preferred) ?? memberships[0];
  const workspace = store.workspaces.find(
    (candidate) => candidate.id === membership?.workspaceId,
  );
  if (!membership || !workspace) return null;

  return {
    user,
    workspace,
    role: membership.role,
    demo: true,
    // Instalação local é de um dono só; o painel administrativo continua
    // acessível como sempre foi neste modo.
    isPlatformAdmin: true,
  };
}

export interface LocalAuthOutcome {
  ok: boolean;
  userId?: string;
  error?: string;
}

/**
 * Confere e-mail e senha das contas locais.
 *
 * Antes, qualquer credencial abria o workspace de demonstração. Isso ficou
 * ruim assim que passou a existir uma conta de verdade: um e-mail digitado
 * errado levava, sem avisar, para os dados sintéticos de outra conta.
 */
export async function authenticateLocal(
  email: string,
  password: string,
): Promise<LocalAuthOutcome> {
  // Garante que a conta de demonstração já esteja semeada.
  getMemoryStore();

  const credential = findCredentialByEmail(email);
  if (!credential) {
    return {
      ok: false,
      error: "Não encontramos uma conta com esse e-mail. Crie sua conta para começar.",
    };
  }
  if (!verifyPassword(credential, password)) {
    return { ok: false, error: "E-mail ou senha incorretos." };
  }
  return { ok: true, userId: credential.userId };
}

/** Cadastro no modo local: conta nova, workspace próprio e vazio. */
export async function registerLocalAccount(input: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<LocalAuthOutcome> {
  getMemoryStore();

  if (findCredentialByEmail(input.email)) {
    return { ok: false, error: "Já existe uma conta com esse e-mail. Faça login." };
  }
  const { user } = createLocalAccount(input);
  return { ok: true, userId: user.id };
}

/** Abre a sessão local para um usuário conhecido. */
export async function startLocalSession(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  // Sessão nova não deve herdar o workspace ativo da sessão anterior.
  jar.delete(WORKSPACE_COOKIE);
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_SESSION_COOKIE);
  jar.delete(WORKSPACE_COOKIE);
  if (!isDemoMode()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
}

/* ------------------------------------------------------------ supabase --- */

async function getSupabaseSession(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, avatar_url, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const jar = await cookies();
  const preferredWorkspace = jar.get(WORKSPACE_COOKIE)?.value;

  // A RLS já restringe a consulta às associações do próprio usuário.
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces (id, name, slug, plan_id, owner_id, created_at)")
    .order("created_at", { ascending: true });

  type MembershipRow = {
    role: WorkspaceRole;
    workspace: {
      id: string;
      name: string;
      slug: string;
      plan_id: "free" | "pro" | "agency";
      owner_id: string;
      created_at: string;
    } | null;
  };

  // O supabase-js tipa relações aninhadas como array; aqui é 1:1.
  const rows = (memberships ?? []) as unknown as MembershipRow[];
  const chosen =
    rows.find((row) => row.workspace?.id === preferredWorkspace) ?? rows[0];
  if (!chosen?.workspace) return null;

  const email = profile?.email ?? user.email ?? "";

  return {
    user: {
      id: user.id,
      email,
      name: profile?.name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      createdAt: profile?.created_at ?? user.created_at,
    },
    workspace: {
      id: chosen.workspace.id,
      name: chosen.workspace.name,
      slug: chosen.workspace.slug,
      planId: chosen.workspace.plan_id,
      ownerId: chosen.workspace.owner_id,
      createdAt: chosen.workspace.created_at,
    },
    role: chosen.role,
    demo: false,
    isPlatformAdmin: adminEmails().includes(email.toLowerCase()),
  };
}

/** Troca o workspace ativo (plano Agency). */
export async function setActiveWorkspace(workspaceId: string): Promise<void> {
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}
