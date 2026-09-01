import type { Plan, PlanFeature, PlanId, UsageMetric } from "@/core/types/workspace";

export const PLAN_FEATURE_LABEL: Record<PlanFeature, string> = {
  copy_analysis: "Análise de copy",
  creative_analysis: "Análise de criativo",
  transcription: "Transcrição de vídeo",
  monitoring: "Monitoramento",
  advanced_monitoring: "Monitoramento avançado (hora a hora)",
  compare: "Comparador de anúncios",
  insights: "Gerador de insights",
  reports: "Relatórios em PDF",
  api_access: "Acesso à API",
  multi_workspace: "Múltiplos workspaces",
};

/**
 * Definição dos planos. Fonte única de verdade para limites, features e
 * (futuramente) preços no Stripe. A checagem de cota lê daqui — nunca
 * espalhe números de limite pelo código.
 */
export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Para conhecer a mineração de anúncios.",
    priceMonthlyBRL: 0,
    stripePriceId: null,
    limits: {
      searchesPerMonth: 30,
      analysesPerMonth: 10,
      transcriptionsPerMonth: 0,
      savedItems: 50,
      monitors: 2,
      collections: 3,
      seats: 1,
      workspaces: 1,
      features: ["copy_analysis"],
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Para o gestor de tráfego que mina todos os dias.",
    priceMonthlyBRL: 149,
    stripePriceId: null,
    limits: {
      searchesPerMonth: 1_000,
      analysesPerMonth: 500,
      transcriptionsPerMonth: 60,
      savedItems: null,
      monitors: 25,
      collections: null,
      seats: 2,
      workspaces: 1,
      features: [
        "copy_analysis",
        "creative_analysis",
        "transcription",
        "monitoring",
        "compare",
        "insights",
      ],
    },
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "Para agências que operam múltiplos clientes.",
    priceMonthlyBRL: 449,
    stripePriceId: null,
    limits: {
      searchesPerMonth: null,
      analysesPerMonth: null,
      transcriptionsPerMonth: 400,
      savedItems: null,
      monitors: 200,
      collections: null,
      seats: 10,
      workspaces: 10,
      features: [
        "copy_analysis",
        "creative_analysis",
        "transcription",
        "monitoring",
        "advanced_monitoring",
        "compare",
        "insights",
        "reports",
        "api_access",
        "multi_workspace",
      ],
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "agency"];

/** Métrica de consumo associada a cada limite mensal. */
export const METRIC_TO_LIMIT: Partial<
  Record<UsageMetric, keyof Plan["limits"]>
> = {
  searches: "searchesPerMonth",
  analyses: "analysesPerMonth",
  transcriptions: "transcriptionsPerMonth",
  monitors: "monitors",
  saved_items: "savedItems",
};

export function planHasFeature(planId: PlanId, feature: PlanFeature): boolean {
  return PLANS[planId].limits.features.includes(feature);
}

/** Limite mensal da métrica para o plano. `null` = ilimitado. */
export function limitFor(planId: PlanId, metric: UsageMetric): number | null {
  const key = METRIC_TO_LIMIT[metric];
  if (!key) return null;
  const value = PLANS[planId].limits[key];
  return typeof value === "number" ? value : null;
}
