import type { SessionContext } from "@/core/types/workspace";
import { getRepositories } from "@/data";
import { runMonitorCheck } from "@/server/services/monitoring";
import { errorContext, log } from "@/server/services/logging";
import type { JobHandlers } from "./types";

/**
 * Handlers dos jobs.
 *
 * Cada handler recebe apenas o payload e reconstrói o contexto de sessão de
 * serviço a partir do `workspaceId`. Isso mantém os handlers independentes de
 * requisição HTTP — eles rodam igual no worker de uma VPS.
 */
export function buildJobHandlers(
  resolveContext: (workspaceId: string) => Promise<SessionContext | null>,
): JobHandlers {
  return {
    "monitor.check": async ({ workspaceId, monitorId }) => {
      const ctx = await resolveContext(workspaceId);
      if (!ctx) return;

      const monitor = await getRepositories().monitoring.getMonitor(ctx, monitorId);
      if (!monitor || !monitor.active) return;

      const result = await runMonitorCheck(ctx, monitor);
      await log(
        {
          level: "info",
          scope: "job",
          message: `monitor.check ${monitor.entityLabel}: ${result.events.length} evento(s)`,
          context: { monitorId, adCount: result.adCount },
        },
        ctx,
      );
    },

    "monitor.sweep": async () => {
      // Sem acesso multi-workspace no driver de memória, o sweep é operado
      // pela rota /api/jobs/run, que já roda no contexto do workspace.
      await log({
        level: "debug",
        scope: "job",
        message: "monitor.sweep executado",
      });
    },

    "offers.recluster": async ({ workspaceId, advertiserId }) => {
      const ctx = await resolveContext(workspaceId);
      if (!ctx) return;
      await log(
        {
          level: "info",
          scope: "job",
          message: `offers.recluster solicitado para ${advertiserId}`,
          context: { advertiserId },
        },
        ctx,
      );
    },

    "score.recompute": async ({ workspaceId, adIds }) => {
      const ctx = await resolveContext(workspaceId);
      if (!ctx) return;
      // O score é recalculado na leitura (`enrichAd`); no driver Supabase, o
      // valor materializado é atualizado no próximo `upsertBatch`.
      await log(
        {
          level: "info",
          scope: "job",
          message: `score.recompute para ${adIds?.length ?? "todos os"} anúncios`,
        },
        ctx,
      );
    },

    "transcription.run": async ({ workspaceId, adId, creativeId }) => {
      const ctx = await resolveContext(workspaceId);
      if (!ctx) return;
      try {
        // Requer um provider de STT configurado — ver AIProvider.transcribeVideo.
        const { getAIProvider } = await import("@/providers/ai");
        const ai = getAIProvider();
        const ad = await getRepositories().catalog.getAd(ctx, adId);
        const creative = ad?.creatives.find((item) => item.id === creativeId);
        if (!ad || !creative) return;

        const transcription = await ai.transcribeVideo({
          creative,
          adId,
          workspaceId,
        });
        await getRepositories().analysis.saveTranscription(ctx, transcription);
      } catch (error) {
        await log(
          {
            level: "warn",
            scope: "job",
            message: "transcription.run indisponível neste provider",
            context: errorContext(error),
          },
          ctx,
        );
      }
    },
  };
}
