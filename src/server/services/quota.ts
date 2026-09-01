import type { PlanFeature, SessionContext, UsageMetric } from "@/core/types/workspace";
import { PLANS, limitFor, planHasFeature } from "@/core/constants/plans";
import { getRepositories } from "@/data";

export class QuotaExceededError extends Error {
  constructor(
    public readonly metric: UsageMetric,
    public readonly used: number,
    public readonly limit: number,
    public readonly planName: string,
  ) {
    super(
      `Limite do plano ${planName} atingido: ${used}/${limit}. Faça upgrade para continuar.`,
    );
    this.name = "QuotaExceededError";
  }
}

export class FeatureLockedError extends Error {
  constructor(
    public readonly feature: PlanFeature,
    public readonly planName: string,
  ) {
    super(`Este recurso não está disponível no plano ${planName}.`);
    this.name = "FeatureLockedError";
  }
}

/**
 * Verifica cota antes de executar uma ação que consome recurso.
 * Lança em vez de retornar booleano: esquecer de checar o retorno seria um
 * furo silencioso de faturamento.
 */
export async function assertQuota(
  ctx: SessionContext,
  metric: UsageMetric,
  amount = 1,
): Promise<void> {
  const limit = limitFor(ctx.workspace.planId, metric);
  if (limit === null) return;

  const used = await getRepositories().usage.current(ctx, metric);
  if (used + amount > limit) {
    throw new QuotaExceededError(metric, used, limit, PLANS[ctx.workspace.planId].name);
  }
}

export function assertFeature(ctx: SessionContext, feature: PlanFeature): void {
  if (!planHasFeature(ctx.workspace.planId, feature)) {
    throw new FeatureLockedError(feature, PLANS[ctx.workspace.planId].name);
  }
}

export interface QuotaStatus {
  metric: UsageMetric;
  used: number;
  limit: number | null;
  /** 0..1; `null` quando ilimitado. */
  ratio: number | null;
}

/** Panorama de consumo do ciclo — alimenta a página de configurações e o admin. */
export async function quotaOverview(ctx: SessionContext): Promise<QuotaStatus[]> {
  const repositories = getRepositories();
  const metrics: UsageMetric[] = [
    "searches",
    "analyses",
    "transcriptions",
    "monitors",
    "saved_items",
    "ai_calls",
  ];

  return Promise.all(
    metrics.map(async (metric) => {
      const limit = limitFor(ctx.workspace.planId, metric);
      const used = await repositories.usage.current(ctx, metric);
      return {
        metric,
        used,
        limit,
        ratio: limit === null || limit === 0 ? null : Math.min(1, used / limit),
      };
    }),
  );
}
