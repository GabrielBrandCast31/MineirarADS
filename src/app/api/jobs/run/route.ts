import { z } from "zod";
import { getJobQueue } from "@/jobs";
import { apiHandler, readJson } from "@/lib/api/handler";
import { sweepDueMonitors } from "@/server/services/monitoring";

const bodySchema = z.object({
  /** Teto de monitoramentos verificados nesta chamada. */
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * POST /api/jobs/run
 *
 * Executa o trabalho pendente do workspace da sessão: verifica os
 * monitoramentos vencidos e drena a fila de jobs.
 *
 * Existe para quem quer acompanhamento contínuo sem manter a interface aberta
 * — um cron chamando esta rota uma vez por hora dá conta de frequência diária
 * e semanal:
 *
 *   curl -X POST http://localhost:3000/api/jobs/run \
 *     -H "Cookie: <cookie de sessão>" -H "content-type: application/json" -d '{}'
 *
 * A autorização é a mesma do resto da API (sessão + rate limit), então cada
 * chamada roda apenas no workspace de quem chamou.
 */
export const POST = apiHandler(async ({ request, session }) => {
  const { limit } = await readJson(request, bodySchema);

  const sweep = await sweepDueMonitors(session, { limit });
  const drained = await getJobQueue().drain(limit);

  return { monitoring: sweep, jobsProcessed: drained };
}, { limit: 30 });
