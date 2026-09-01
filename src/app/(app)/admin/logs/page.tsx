import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Logs" };

const LEVEL_VARIANT = {
  debug: "neutral",
  info: "info",
  warn: "warn",
  error: "bad",
} as const;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; scope?: string }>;
}): Promise<React.ReactElement> {
  await requireSession();
  const { level, scope } = await searchParams;

  const logs = await getRepositories().logs.list({
    limit: 200,
    level: (level as keyof typeof LEVEL_VARIANT | undefined) ?? undefined,
    scope,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs da aplicação</CardTitle>
        <CardDescription>
          Buscas, integrações, análises, jobs e erros. Filtre por{" "}
          <code className="font-mono text-[11px]">?level=error</code> ou{" "}
          <code className="font-mono text-[11px]">?scope=search</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {logs.length === 0 ? (
          <EmptyState
            title="Nenhum log registrado"
            description="Os logs aparecem conforme a plataforma é usada: cada mineração, análise e job deixa registro."
          />
        ) : (
          <ul className="divide-y divide-line font-mono text-[12px]">
            {logs.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
                <span className="shrink-0 text-ink-faint">{formatDateTime(entry.createdAt)}</span>
                <Badge variant={LEVEL_VARIANT[entry.level]} size="sm">
                  {entry.level}
                </Badge>
                <Badge variant="outline" size="sm">
                  {entry.scope}
                </Badge>
                <span className="min-w-0 flex-1 text-ink-muted">{entry.message}</span>
                {entry.context && Object.keys(entry.context).length > 0 ? (
                  <details className="w-full">
                    <summary className="cursor-pointer text-[11px] text-ink-faint hover:text-ink-muted">
                      contexto
                    </summary>
                    <pre className="mt-1 overflow-x-auto rounded bg-surface-2 p-2 text-[11px] text-ink-faint">
                      {JSON.stringify(entry.context, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
