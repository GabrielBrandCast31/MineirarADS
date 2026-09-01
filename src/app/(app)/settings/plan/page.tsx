import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Minus } from "lucide-react";
import { PLANS, PLAN_FEATURE_LABEL, PLAN_ORDER } from "@/core/constants/plans";
import { USAGE_METRIC_LABEL } from "@/core/types/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { requireSession } from "@/server/auth";
import { quotaOverview } from "@/server/services/quota";
import { formatCurrency, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Plano e consumo" };

const ALL_FEATURES = Object.keys(PLAN_FEATURE_LABEL) as Array<keyof typeof PLAN_FEATURE_LABEL>;

export default async function PlanPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const quotas = await quotaOverview(session);
  const currentPlan = PLANS[session.workspace.planId];

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/settings">
          <ArrowLeft />
          Configurações
        </Link>
      </Button>

      <PageHeader
        eyebrow={
          <>
            <CreditCard className="size-3.5" />
            Assinatura
          </>
        }
        title="Plano e consumo"
        description="Cada busca, análise e monitoramento é contabilizado no ciclo corrente. Os limites vêm da definição de plano em src/core/constants/plans.ts."
        actions={<Badge variant="brand" size="lg">Plano {currentPlan.name}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>Consumo do ciclo</CardTitle>
          <CardDescription>Reinicia no primeiro dia de cada mês.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quotas.map((quota) => (
              <li key={quota.metric} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-ink-muted">
                    {USAGE_METRIC_LABEL[quota.metric]}
                  </span>
                  <span className="tnum text-[12.5px] text-ink-faint">
                    {formatNumber(quota.used)}
                    {quota.limit !== null ? ` / ${formatNumber(quota.limit)}` : " / ilimitado"}
                  </span>
                </div>
                <Progress
                  value={quota.ratio !== null ? quota.ratio * 100 : 0}
                  barClassName={cn(
                    quota.ratio !== null && quota.ratio >= 0.9
                      ? "bg-bad"
                      : quota.ratio !== null && quota.ratio >= 0.7
                        ? "bg-warn"
                        : "bg-brand",
                  )}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = planId === session.workspace.planId;

          return (
            <Card
              key={planId}
              className={cn(
                "flex flex-col",
                isCurrent && "border-brand/45 ring-1 ring-brand/20",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent ? (
                    <Badge variant="brand" size="sm">
                      Atual
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>{plan.tagline}</CardDescription>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-4">
                <p className="text-2xl font-semibold text-ink">
                  {plan.priceMonthlyBRL === 0 ? (
                    "Grátis"
                  ) : (
                    <>
                      {formatCurrency(plan.priceMonthlyBRL)}
                      <span className="text-[13px] font-normal text-ink-faint">/mês</span>
                    </>
                  )}
                </p>

                <ul className="space-y-1.5 text-[12.5px]">
                  <LimitRow label="Buscas por mês" value={plan.limits.searchesPerMonth} />
                  <LimitRow label="Análises por mês" value={plan.limits.analysesPerMonth} />
                  <LimitRow label="Transcrições" value={plan.limits.transcriptionsPerMonth} />
                  <LimitRow label="Itens salvos" value={plan.limits.savedItems} />
                  <LimitRow label="Monitoramentos" value={plan.limits.monitors} />
                  <LimitRow label="Assentos" value={plan.limits.seats} />
                </ul>

                <ul className="space-y-1 border-t border-line pt-3 text-[12.5px]">
                  {ALL_FEATURES.map((feature) => {
                    const included = plan.limits.features.includes(feature);
                    return (
                      <li
                        key={feature}
                        className={cn(
                          "flex items-center gap-2",
                          included ? "text-ink-muted" : "text-ink-faint/60",
                        )}
                      >
                        {included ? (
                          <Check className="size-3.5 shrink-0 text-ok" />
                        ) : (
                          <Minus className="size-3.5 shrink-0" />
                        )}
                        {PLAN_FEATURE_LABEL[feature]}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-auto pt-2">
                  <Button
                    variant={isCurrent ? "secondary" : "primary"}
                    className="w-full"
                    disabled
                    title="O checkout via Stripe ainda não foi implementado."
                  >
                    {isCurrent ? "Plano atual" : `Migrar para ${plan.name}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <p className="rounded-lg border border-line bg-surface/50 px-4 py-3 text-[12px] leading-relaxed text-ink-faint">
        O checkout ainda não está implementado. A arquitetura já está pronta: a tabela{" "}
        <code className="font-mono">subscriptions</code> guarda os identificadores do Stripe,{" "}
        <code className="font-mono">usage</code> registra o consumo por métrica e ciclo, e a
        checagem de cota acontece em <code className="font-mono">assertQuota</code>, antes de cada
        ação que consome recurso.
      </p>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number | null }): React.ReactElement {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-ink-faint">{label}</span>
      <span className="tnum text-ink-muted">
        {value === null ? "Ilimitado" : formatNumber(value)}
      </span>
    </li>
  );
}
