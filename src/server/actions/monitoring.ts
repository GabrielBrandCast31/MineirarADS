"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Monitor } from "@/core/types/monitoring";
import { InvalidAdLibraryLinkError } from "@/core/meta/ad-library-link";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import {
  runMonitorCheck,
  startMonitoring,
  stopMonitoring,
  sweepDueMonitors,
  watchAdLibraryLink,
  type SweepOutcome,
  type WatchAdLibraryLinkOutcome,
} from "@/server/services/monitoring";
import { failure, success, type ActionResult } from "./result";

const targetSchema = z.enum(["ad", "offer", "advertiser"]);
const frequencySchema = z.enum(["hourly", "daily", "weekly"]);

const watchLinkSchema = z.object({
  url: z.string().trim().min(1, "Cole o link da Biblioteca de Anúncios.").max(2048),
  frequency: frequencySchema.default("daily"),
});

export async function startMonitoringAction(input: {
  target: z.infer<typeof targetSchema>;
  entityId: string;
  label: string;
  thumbnail?: string | null;
}): Promise<ActionResult<Monitor>> {
  try {
    const session = await requireSession();
    const monitor = await startMonitoring(session, {
      target: targetSchema.parse(input.target),
      entityId: input.entityId,
      label: input.label,
      thumbnail: input.thumbnail ?? null,
    });
    revalidatePath("/monitoring");
    revalidatePath("/dashboard");
    return success(monitor);
  } catch (error) {
    return failure(error);
  }
}

/**
 * Salva o link de uma página da Biblioteca de Anúncios e começa a acompanhar.
 *
 * Recebe a URL crua, do jeito que o usuário copiou do navegador — interpretar
 * o link é responsabilidade do serviço, não do formulário.
 */
export async function watchAdLibraryLinkAction(input: {
  url: string;
  frequency?: "hourly" | "daily" | "weekly";
}): Promise<ActionResult<WatchAdLibraryLinkOutcome>> {
  try {
    const session = await requireSession();
    const parsed = watchLinkSchema.safeParse(input);
    if (!parsed.success) {
      // Mensagem de campo, não erro interno: vai direto para o formulário.
      throw new InvalidAdLibraryLinkError(
        parsed.error.issues[0]?.message ?? "Link inválido.",
      );
    }
    const outcome = await watchAdLibraryLink(session, parsed.data);

    revalidatePath("/monitoring");
    revalidatePath("/advertisers");
    revalidatePath("/dashboard");
    return success(outcome);
  } catch (error) {
    return failure(error);
  }
}

/** Verifica de uma vez tudo o que venceu — usada pela página de monitoramento. */
export async function sweepDueMonitorsAction(): Promise<ActionResult<SweepOutcome>> {
  try {
    const session = await requireSession();
    const outcome = await sweepDueMonitors(session, { limit: 10 });

    if (outcome.checked > 0) {
      revalidatePath("/monitoring");
      revalidatePath("/dashboard");
    }
    return success(outcome);
  } catch (error) {
    return failure(error);
  }
}

export async function stopMonitoringAction(monitorId: string): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await stopMonitoring(session, monitorId);
    revalidatePath("/monitoring");
    return success(undefined);
  } catch (error) {
    return failure(error);
  }
}

/** Roda a verificação agora — o mesmo caminho que o worker executa. */
export async function checkMonitorNowAction(
  monitorId: string,
): Promise<ActionResult<{ events: number; adCount: number }>> {
  try {
    const session = await requireSession();
    const repositories = getRepositories();
    const monitor = await repositories.monitoring.getMonitor(session, monitorId);
    if (!monitor) return failure(new Error("Monitoramento não encontrado."));

    const result = await runMonitorCheck(session, monitor);
    revalidatePath(`/monitoring/${monitorId}`);
    revalidatePath("/monitoring");
    return success({ events: result.events.length, adCount: result.adCount });
  } catch (error) {
    return failure(error);
  }
}

export async function markEventsSeenAction(ids: string[]): Promise<ActionResult> {
  try {
    const session = await requireSession();
    await getRepositories().monitoring.markEventsSeen(session, ids);
    revalidatePath("/monitoring");
    return success(undefined);
  } catch (error) {
    return failure(error);
  }
}
