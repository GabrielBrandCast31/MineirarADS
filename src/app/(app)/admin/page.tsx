import type { Metadata } from "next";
import { Activity, Building2, Search, Users } from "lucide-react";
import { PLANS } from "@/core/constants/plans";
import { USAGE_METRIC_LABEL } from "@/core/types/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Administração" };

export default async function AdminPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const repositories = getRepositories();

  const [workspaces, users, searches, usage, logs] = await Promise.all([
    repositories.workspaces.listAllWorkspaces(50),
    repositories.workspaces.listAllUsers(50),
    repositories.searches.listRecent(session, 20),
    repositories.usage.snapshot(session),
    repositories.logs.list({ limit: 8, level: "error" }),
  ]);

  const searchCount = searches.length;
  const errorCount = logs.length;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Workspaces"
          value={workspaces.length}
          icon={<Building2 />}
          accent="brand"
          hint="Total de workspaces na instalação."
        />
        <StatsCard
          label="Usuários"
          value={users.length}
          icon={<Users />}
          accent="info"
          hint="Contas registradas."
        />
        <StatsCard
          label="Buscas recentes"
          value={searchCount}
          icon={<Search />}
          accent="ok"
          hint="Buscas do workspace atual no histórico."
        />
        <StatsCard
          label="Erros registrados"
          value={errorCount}
          icon={<Activity />}
          accent="heat"
          hint="Logs de nível error mais recentes."
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workspaces</CardTitle>
            <CardDescription>Planos e tamanho de equipe.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[420px] overflow-y-auto pt-0">
            <ul className="divide-y divide-line">
              {workspaces.map((workspace) => (
                <li key={workspace.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] text-ink">{workspace.name}</p>
                    <p className="text-[11.5px] text-ink-faint">
                      /{workspace.slug} · criado em {formatDate(workspace.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline" size="sm">
                      {workspace.memberCount} membro(s)
                    </Badge>
                    <Badge variant="brand" size="sm">
                      {PLANS[workspace.planId].name}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Consumo do workspace atual</CardTitle>
            <CardDescription>Ciclo corrente, por métrica.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {usage.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-faint">
                Nenhum consumo registrado neste ciclo.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {usage.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-[13px] text-ink-muted">
                      {USAGE_METRIC_LABEL[record.metric]}
                    </span>
                    <span className="tnum text-[13px] font-medium text-ink">
                      {formatNumber(record.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscas recentes</CardTitle>
          <CardDescription>Cada mineração fica registrada com provider e duração.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-ink-faint">
                <th className="py-2 font-medium">Termo</th>
                <th className="py-2 font-medium">Provider</th>
                <th className="py-2 text-right font-medium">Resultados</th>
                <th className="py-2 text-right font-medium">Duração</th>
                <th className="py-2 text-right font-medium">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {searches.map((search) => (
                <tr key={search.id}>
                  <td className="py-2.5 text-ink">
                    {String(search.params.query ?? "—")}
                    {search.status !== "ok" ? (
                      <Badge variant="warn" size="sm" className="ml-2">
                        {search.status}
                      </Badge>
                    ) : null}
                  </td>
                  <td className="py-2.5 text-ink-faint">{search.provider}</td>
                  <td className="tnum py-2.5 text-right text-ink-muted">
                    {formatNumber(search.resultCount)}
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-muted">{search.durationMs} ms</td>
                  <td className="py-2.5 text-right text-ink-faint">
                    {formatDateTime(search.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
