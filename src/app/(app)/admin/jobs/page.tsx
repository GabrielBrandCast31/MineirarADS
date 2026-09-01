import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getJobQueue } from "@/jobs";
import { requireSession } from "@/server/auth";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Jobs" };

const STATUS_VARIANT = {
  queued: "neutral",
  running: "info",
  done: "ok",
  failed: "bad",
} as const;

export default async function AdminJobsPage(): Promise<React.ReactElement> {
  await requireSession();
  const queue = getJobQueue();

  let jobs: Awaited<ReturnType<typeof queue.list>> = [];
  let error: string | null = null;
  try {
    jobs = await queue.list(100);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Fila de jobs</CardTitle>
              <CardDescription>
                Monitoramento periódico, transcrição e reprocessamentos.
              </CardDescription>
            </div>
            <Badge variant={queue.driver === "redis" ? "brand" : "neutral"} size="lg">
              driver: {queue.driver}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {error ? (
            <p className="rounded-md border border-warn/30 bg-warn/8 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-muted">
              {error}
            </p>
          ) : jobs.length === 0 ? (
            <EmptyState
              title="Nenhum job na fila"
              description="Jobs são enfileirados por monitoramentos e por rotinas de manutenção. Em desenvolvimento, rode `npm run worker` para consumi-los."
            />
          ) : (
            <ul className="divide-y divide-line text-[12.5px]">
              {jobs.map((job) => (
                <li key={job.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                  <Badge variant={STATUS_VARIANT[job.status]} size="sm">
                    {job.status}
                  </Badge>
                  <span className="font-mono text-ink">{job.name}</span>
                  <span className="text-ink-faint">
                    tentativa {job.attempts}/{job.maxAttempts}
                  </span>
                  <span className="ml-auto text-ink-faint">{formatDateTime(job.createdAt)}</span>
                  {job.errorMessage ? (
                    <span className="w-full text-[11.5px] text-bad">{job.errorMessage}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
