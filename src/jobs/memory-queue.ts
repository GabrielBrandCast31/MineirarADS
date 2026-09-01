import type {
  EnqueueOptions,
  JobHandlers,
  JobName,
  JobPayloads,
  JobQueue,
  JobRecord,
} from "./types";

/**
 * Fila em processo.
 *
 * Serve para desenvolvimento e para instalações pequenas onde subir Redis não
 * se justifica. Não sobrevive a reinício e não distribui trabalho entre
 * instâncias — por isso a produção deve usar o driver `redis`.
 */
export class InMemoryJobQueue implements JobQueue {
  readonly driver = "memory" as const;

  private readonly jobs: JobRecord[] = [];
  private sequence = 0;

  constructor(private readonly handlers: JobHandlers) {}

  async enqueue<N extends JobName>(
    name: N,
    payload: JobPayloads[N],
    options: EnqueueOptions = {},
  ): Promise<JobRecord<N>> {
    this.sequence += 1;
    const now = Date.now();
    const job: JobRecord<N> = {
      id: `job_${this.sequence}`,
      name,
      payload,
      status: "queued",
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      runAt: new Date(now + (options.delayMs ?? 0)).toISOString(),
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      createdAt: new Date(now).toISOString(),
    };
    this.jobs.push(job as JobRecord);
    return job;
  }

  async drain(limit = 25): Promise<number> {
    const now = Date.now();
    const pending = this.jobs
      .filter((job) => job.status === "queued" && new Date(job.runAt).getTime() <= now)
      .slice(0, limit);

    let processed = 0;
    for (const job of pending) {
      const handler = this.handlers[job.name] as
        | ((payload: unknown) => Promise<void>)
        | undefined;
      if (!handler) {
        job.status = "failed";
        job.errorMessage = `Sem handler registrado para "${job.name}".`;
        job.finishedAt = new Date().toISOString();
        continue;
      }

      job.status = "running";
      job.startedAt = new Date().toISOString();
      job.attempts += 1;

      try {
        await handler(job.payload);
        job.status = "done";
        job.finishedAt = new Date().toISOString();
        processed += 1;
      } catch (error) {
        job.errorMessage = error instanceof Error ? error.message : String(error);
        if (job.attempts >= job.maxAttempts) {
          job.status = "failed";
          job.finishedAt = new Date().toISOString();
        } else {
          // Backoff exponencial simples.
          job.status = "queued";
          job.runAt = new Date(Date.now() + 2 ** job.attempts * 1000).toISOString();
        }
      }
    }

    return processed;
  }

  async list(limit = 50): Promise<JobRecord[]> {
    return [...this.jobs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }
}
