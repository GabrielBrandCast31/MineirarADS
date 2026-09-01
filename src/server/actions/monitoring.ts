"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Monitor } from "@/core/types/monitoring";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";
import { runMonitorCheck, startMonitoring, stopMonitoring } from "@/server/services/monitoring";
import { failure, success, type ActionResult } from "./result";

const targetSchema = z.enum(["ad", "offer", "advertiser"]);

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
