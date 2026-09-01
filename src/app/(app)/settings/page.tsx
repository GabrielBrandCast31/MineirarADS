import type { Metadata } from "next";
import Link from "next/link";
import { Database, KeyRound, Settings as SettingsIcon, Users } from "lucide-react";
import { PLANS } from "@/core/constants/plans";
import { ROLE_LABEL } from "@/core/types/workspace";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { getAdProvider } from "@/providers/ads";
import { getAIProvider } from "@/providers/ai";
import { serverEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage(): Promise<React.ReactElement> {
  const session = await requireSession();
  const repositories = getRepositories();
  const env = serverEnv();

  const [members, subscription] = await Promise.all([
    repositories.workspaces.listMembers(session),
    repositories.workspaces.getSubscription(session),
  ]);

  const adProvider = getAdProvider();
  const aiProvider = getAIProvider();
  const plan = PLANS[session.workspace.planId];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <SettingsIcon className="size-3.5" />
            Conta
          </>
        }
        title="Configurações"
        description="Perfil, workspace, equipe e o estado da infraestrutura desta instalação."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Sua identidade dentro da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Avatar
              src={session.user.avatarUrl}
              name={session.user.name ?? session.user.email}
              className="size-14 rounded-2xl"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-[15px] font-medium text-ink">
                {session.user.name ?? "Sem nome"}
              </p>
              <p className="truncate text-[13px] text-ink-faint">{session.user.email}</p>
              <p className="text-[12px] text-ink-faint">
                Na plataforma desde {formatDate(session.user.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Onde ficam as coleções, análises e monitoramentos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-ink">
                  {session.workspace.name}
                </p>
                <p className="text-[12px] text-ink-faint">/{session.workspace.slug}</p>
              </div>
              <Badge variant="brand">{plan.name}</Badge>
            </div>
            <p className="text-[12.5px] leading-relaxed text-ink-faint">{plan.tagline}</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/settings/plan">Ver plano e consumo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-3.5 text-info" />
            Equipe
          </CardTitle>
          <CardDescription>
            {plan.limits.seats === null
              ? "Assentos ilimitados neste plano."
              : `${members.length} de ${plan.limits.seats} assentos usados.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="divide-y divide-line">
            {members.map((member) => (
              <li key={member.userId} className="flex items-center gap-3 py-3">
                <Avatar src={member.avatarUrl} name={member.name ?? member.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] text-ink">{member.name ?? member.email}</p>
                  <p className="truncate text-[12px] text-ink-faint">{member.email}</p>
                </div>
                <Badge variant="outline" size="sm">
                  {ROLE_LABEL[member.role]}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="size-3.5 text-brand-hi" />
            Infraestrutura desta instalação
          </CardTitle>
          <CardDescription>
            O que está ligado agora. Cada linha é trocável por variável de ambiente, sem tocar no
            frontend.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <dl className="divide-y divide-line text-[13px]">
            <InfoRow
              label="Camada de dados"
              value={repositories.driver === "memory" ? "Memória (dados mockados)" : "Supabase / Postgres"}
              variable="DATA_DRIVER"
            />
            <InfoRow
              label="Fonte de anúncios"
              value={
                adProvider.name === "mock" ? "MockAdProvider (demonstração)" : adProvider.name
              }
              variable="ADS_PROVIDER"
            />
            <InfoRow
              label="Camada de IA"
              value={
                aiProvider.capabilities.llm
                  ? `${aiProvider.name} · ${aiProvider.capabilities.model}`
                  : "Heurísticas determinísticas (sem custo)"
              }
              variable="AI_PROVIDER"
            />
            <InfoRow
              label="Fila de jobs"
              value={env.JOB_DRIVER === "redis" ? "Redis / BullMQ" : "Em processo (dev)"}
              variable="JOB_DRIVER"
            />
            <InfoRow
              label="Autenticação"
              value={session.demo ? "Modo demonstração (cookie local)" : "Supabase Auth"}
              variable="NEXT_PUBLIC_SUPABASE_URL"
            />
            <InfoRow
              label="Assinatura"
              value={
                subscription
                  ? `${subscription.status} · plano ${subscription.planId}`
                  : "Sem registro de assinatura"
              }
              variable="STRIPE_SECRET_KEY"
            />
          </dl>

          {session.demo ? (
            <p className="mt-4 flex items-start gap-2 rounded-md border border-info/25 bg-info/8 px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
              <KeyRound className="mt-0.5 size-3.5 shrink-0 text-info" />
              <span>
                Você está no <strong className="font-medium">modo demonstração</strong>. Os dados
                são sintéticos e vivem em memória — reiniciar o servidor recomeça do zero.
                Configure as chaves do Supabase em <code className="font-mono">.env.local</code>{" "}
                para ativar contas reais, RLS e persistência.
              </span>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  label,
  value,
  variable,
}: {
  label: string;
  value: string;
  variable: string;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className="text-ink-muted">{value}</span>
        <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-faint">
          {variable}
        </code>
      </dd>
    </div>
  );
}
