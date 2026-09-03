import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AppUser, Workspace } from "@/core/types/workspace";
import { slugify } from "@/core/text/normalize";
import { getMemoryStore, nextId, type MemoryStore, type StoredCredential } from "./store";
import { saveStore } from "./persistence";

/**
 * Contas locais do driver `memory`.
 *
 * Sem Supabase configurado, é aqui que vive a autenticação: uma credencial por
 * e-mail, com a senha guardada como hash scrypt (nunca em texto puro, nem no
 * arquivo de estado). Cada conta ganha o seu próprio workspace, e todos os
 * repositórios já filtram por `workspace_id` — é isso que faz uma conta nova
 * nascer vazia sem tocar no workspace de demonstração.
 */

const KEY_LENGTH = 32;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): {
  passwordHash: string;
  salt: string;
} {
  return {
    passwordHash: scryptSync(password, salt, KEY_LENGTH).toString("hex"),
    salt,
  };
}

/** Comparação em tempo constante — o custo é zero e evita oráculo de tempo. */
export function verifyPassword(credential: StoredCredential, password: string): boolean {
  const candidate = scryptSync(password, credential.salt, KEY_LENGTH);
  const expected = Buffer.from(credential.passwordHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findCredentialByEmail(email: string): StoredCredential | null {
  const wanted = normalizeEmail(email);
  return getMemoryStore().credentials.find((c) => c.email === wanted) ?? null;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  name?: string | null;
  /** Plano do workspace novo. */
  planId?: Workspace["planId"];
}

export interface CreatedAccount {
  user: AppUser;
  workspace: Workspace;
}

/**
 * Cria conta, workspace próprio e credencial.
 *
 * O workspace entra sem coleções, monitoramentos, buscas ou consumo: a única
 * coisa compartilhada com a demonstração é o catálogo de anúncios, que é
 * público por natureza (e, sem token da Meta, sintético).
 */
export function createLocalAccount(input: CreateAccountInput): CreatedAccount {
  const store = getMemoryStore();
  const email = normalizeEmail(input.email);
  if (findCredentialByEmail(email)) {
    throw new Error(`Já existe uma conta com o e-mail ${email}.`);
  }

  const name = input.name?.trim() || email.split("@")[0] || "Conta";
  const handle = uniqueHandle(store, slugify(email.split("@")[0] ?? "conta"));
  const now = new Date().toISOString();

  const user: AppUser = {
    id: `usr_${handle}`,
    email,
    name,
    avatarUrl: null,
    createdAt: now,
  };
  const workspace: Workspace = {
    id: `ws_${handle}`,
    name: `Workspace de ${name}`,
    slug: handle,
    planId: input.planId ?? "agency",
    ownerId: user.id,
    createdAt: now,
  };

  store.users.push(user);
  store.workspaces.push(workspace);
  store.members.push({
    workspaceId: workspace.id,
    userId: user.id,
    role: "owner",
    email,
    name,
    avatarUrl: null,
    createdAt: now,
  });
  store.subscriptions.push({
    id: `sub_${handle}`,
    workspaceId: workspace.id,
    planId: workspace.planId,
    status: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    currentPeriodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
    cancelAtPeriodEnd: false,
  });
  store.credentials.push({
    userId: user.id,
    email,
    ...hashPassword(input.password),
    createdAt: now,
  });

  // Conta nova é o tipo de coisa que não pode esperar o próximo tique do
  // salvamento automático: um reinício no meio perderia o cadastro.
  saveStore(store);

  return { user, workspace };
}

/**
 * Identificador legível e livre.
 *
 * O `handle` vira `usr_<handle>` e `ws_<handle>`, então ele precisa ser único —
 * e o slug do e-mail não é. `colide.teste@a.com` e `colide-teste@b.com` caem no
 * mesmo slug, e `demo@qualquer.com` cai em `demo`, que é a demonstração: sem
 * este desempate, a segunda conta ganhava o `id` da primeira e entrava no
 * workspace dela, porque a sessão resolve o usuário por `id`.
 */
function uniqueHandle(store: MemoryStore, base: string): string {
  const taken = (handle: string): boolean =>
    store.users.some((user) => user.id === `usr_${handle}`) ||
    store.workspaces.some((workspace) => workspace.id === `ws_${handle}`);

  const root = base || "conta";
  if (!taken(root)) return root;
  for (let suffix = 2; suffix < 1_000; suffix += 1) {
    const candidate = `${root}-${suffix}`;
    if (!taken(candidate)) return candidate;
  }
  // Improvável ao ponto de não valer um laço maior; o sequencial do store é
  // único por construção.
  return nextId(root);
}
