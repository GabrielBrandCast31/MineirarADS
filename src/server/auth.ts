import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SessionContext, WorkspaceRole } from "@/core/types/workspace";
import { adminEmails, isDemoMode } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_SESSION_COOKIE, WORKSPACE_COOKIE } from "@/lib/session-cookies";
import {
  DEMO_EMAIL,
  DEMO_USER_ID,
  DEMO_WORKSPACE_ID,
  getMemoryStore,
} from "@/data/memory/store";

/**
 * Resolve a sessão atual.
 *
 * Dois modos, mesma saída:
 *  - **Supabase configurado**: sessão real via Supabase Auth + RLS.
 *  - **Modo demonstração**: cookie próprio apontando para o workspace mockado.
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

/* -------------------------------------------------------------- demo ----- */

async function getDemoSession(): Promise<SessionContext | null> {
  const store = getMemoryStore();
  const jar = await cookies();
  if (!jar.get(DEMO_SESSION_COOKIE)) return null;

  const workspaceId = jar.get(WORKSPACE_COOKIE)?.value ?? DEMO_WORKSPACE_ID;
  const workspace =
    store.workspaces.find((w) => w.id === workspaceId) ?? store.workspaces[0];
  const user = store.users.find((u) => u.id === DEMO_USER_ID) ?? store.users[0];
  if (!workspace || !user) return null;

  return {
    user,
    workspace,
    role: "owner",
    demo: true,
    isPlatformAdmin: true,
  };
}

/** Cria a sessão de demonstração (usada pelo formulário de login sem Supabase). */
export async function startDemoSession(name?: string): Promise<void> {
  const store = getMemoryStore();
  if (name?.trim()) {
    const user = store.users.find((u) => u.id === DEMO_USER_ID);
    if (user) user.name = name.trim();
  }
  const jar = await cookies();
  jar.set(DEMO_SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
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

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: "demo1234" };

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
