/**
 * Contrato de fila de jobs.
 *
 * A plataforma precisa de trabalho assíncrono para monitoramento periódico,
 * transcrição e ingestão em lote. O contrato é mínimo de propósito: qualquer
 * backend (memória, Redis/BullMQ, pg-boss) implementa isso.
 */

export type JobName =
  /** Verifica um alvo monitorado e emite eventos. */
  | "monitor.check"
  /** Varre todos os monitoramentos vencidos e enfileira `monitor.check`. */
  | "monitor.sweep"
  /** Reprocessa o agrupamento de ofertas de um anunciante. */
  | "offers.recluster"
  /** Recalcula o Ad Score materializado após mudança de algoritmo. */
  | "score.recompute"
  /** Transcreve o criativo em vídeo de um anúncio. */
  | "transcription.run";

export interface JobPayloads {
  "monitor.check": { workspaceId: string; monitorId: string };
  "monitor.sweep": Record<string, never>;
  "offers.recluster": { workspaceId: string; advertiserId: string };
  "score.recompute": { workspaceId: string; adIds?: string[] };
  "transcription.run": { workspaceId: string; adId: string; creativeId: string };
}

export interface JobRecord<N extends JobName = JobName> {
  id: string;
  name: N;
  payload: JobPayloads[N];
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  maxAttempts: number;
  runAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EnqueueOptions {
  /** Atraso em milissegundos antes de o job ficar elegível. */
  delayMs?: number;
  maxAttempts?: number;
}

export interface JobQueue {
  readonly driver: "memory" | "redis";
  enqueue<N extends JobName>(
    name: N,
    payload: JobPayloads[N],
    options?: EnqueueOptions,
  ): Promise<JobRecord<N>>;
  /** Processa até `limit` jobs elegíveis. Retorna quantos rodaram. */
  drain(limit?: number): Promise<number>;
  list(limit?: number): Promise<JobRecord[]>;
}

export type JobHandler<N extends JobName> = (payload: JobPayloads[N]) => Promise<void>;

export type JobHandlers = { [N in JobName]?: JobHandler<N> };
