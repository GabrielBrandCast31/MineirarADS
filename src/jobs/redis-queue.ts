import type {
  EnqueueOptions,
  JobHandlers,
  JobName,
  JobPayloads,
  JobQueue,
  JobRecord,
} from "./types";

/**
 * Fila distribuída sobre Redis + BullMQ.
 *
 * Deliberadamente não implementada: adicionar `bullmq` e `ioredis` ao bundle
 * sem que ninguém rode um Redis só aumentaria a superfície de manutenção.
 *
 * Para implementar (roteiro completo):
 *
 *   1. `npm install bullmq ioredis`
 *   2. crie uma `Queue` por nome de job (`new Queue(name, { connection })`);
 *   3. `enqueue` vira `queue.add(name, payload, { delay, attempts, backoff })`;
 *   4. `drain` deixa de existir no processo web — quem consome é o `Worker`
 *      do arquivo `src/jobs/worker.ts`, rodando em uma VPS separada;
 *   5. `list` lê de `queue.getJobs(["waiting", "active", "failed"])`;
 *   6. mantenha os handlers de `src/jobs/handlers.ts` como estão — eles não
 *      conhecem a fila, então nada mais precisa mudar.
 *
 * O agendamento periódico (`monitor.sweep` a cada 15 min) vira um job repetível:
 *   `queue.add("monitor.sweep", {}, { repeat: { pattern: "*\/15 * * * *" } })`
 */
export class RedisJobQueue implements JobQueue {
  readonly driver = "redis" as const;

  constructor(
    private readonly redisUrl: string,
    private readonly handlers: JobHandlers,
  ) {
    void this.redisUrl;
    void this.handlers;
  }

  private notImplemented(operation: string): never {
    throw new Error(
      `[jobs:redis] "${operation}" não implementado. Veja o roteiro em src/jobs/redis-queue.ts ou use JOB_DRIVER=memory.`,
    );
  }

  async enqueue<N extends JobName>(
    _name: N,
    _payload: JobPayloads[N],
    _options?: EnqueueOptions,
  ): Promise<JobRecord<N>> {
    this.notImplemented("enqueue");
  }

  async drain(_limit?: number): Promise<number> {
    this.notImplemented("drain");
  }

  async list(_limit?: number): Promise<JobRecord[]> {
    this.notImplemented("list");
  }
}
