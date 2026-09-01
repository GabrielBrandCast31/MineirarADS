import type { ISODateTime } from "./common";

export type PlanId = "free" | "pro" | "agency";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

/** Ordem de precedência para checagens de autorização. */
export const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: ISODateTime;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  planId: PlanId;
  ownerId: string;
  createdAt: ISODateTime;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: ISODateTime;
}

/** Sessão resolvida no servidor e passada aos repositórios. */
export interface SessionContext {
  user: AppUser;
  workspace: Workspace;
  role: WorkspaceRole;
  /** Modo demonstração: sem Supabase configurado, dados em memória. */
  demo: boolean;
  isPlatformAdmin: boolean;
}

/* ------------------------------------------------------------- cotas ----- */

export type UsageMetric =
  | "searches"
  | "analyses"
  | "transcriptions"
  | "ai_calls"
  | "storage_bytes"
  | "monitors"
  | "saved_items";

export const USAGE_METRIC_LABEL: Record<UsageMetric, string> = {
  searches: "Buscas",
  analyses: "Análises",
  transcriptions: "Transcrições",
  ai_calls: "Chamadas de IA",
  storage_bytes: "Armazenamento",
  monitors: "Monitoramentos",
  saved_items: "Itens salvos",
};

export interface PlanLimits {
  /** `null` = ilimitado. */
  searchesPerMonth: number | null;
  analysesPerMonth: number | null;
  transcriptionsPerMonth: number | null;
  savedItems: number | null;
  monitors: number | null;
  collections: number | null;
  seats: number | null;
  workspaces: number | null;
  features: PlanFeature[];
}

export type PlanFeature =
  | "copy_analysis"
  | "creative_analysis"
  | "transcription"
  | "monitoring"
  | "advanced_monitoring"
  | "compare"
  | "insights"
  | "reports"
  | "api_access"
  | "multi_workspace";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthlyBRL: number;
  limits: PlanLimits;
  /** ID do preço no Stripe — preenchido quando o billing entrar. */
  stripePriceId: string | null;
}

export interface UsageRecord {
  id: string;
  workspaceId: string;
  metric: UsageMetric;
  /** Início do ciclo de cobrança ao qual o consumo pertence (YYYY-MM-01). */
  period: string;
  amount: number;
  updatedAt: ISODateTime;
}

export interface Subscription {
  id: string;
  workspaceId: string;
  planId: PlanId;
  status: "trialing" | "active" | "past_due" | "canceled" | "none";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: ISODateTime | null;
  currentPeriodEnd: ISODateTime | null;
  cancelAtPeriodEnd: boolean;
}
