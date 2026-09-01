/**
 * Worker de background.
 *
 * Uso em desenvolvimento:  `npm run worker`
 * Em produção (VPS):       processo separado, com as mesmas variáveis de
 *                          ambiente do app e `JOB_DRIVER=redis`.
 *
 * O worker não abre porta HTTP e não conhece requisições — ele só consome a
 * fila e chama os mesmos serviços que a interface chama.
 */
import { getJobQueue } from "./index";

const TICK_MS = Number.parseInt(process.env.WORKER_TICK_MS ?? "5000", 10);

let running = true;

async function loop(): Promise<void> {
  const queue = getJobQueue();
  console.log(`[worker] iniciado com driver "${queue.driver}", tick de ${TICK_MS}ms`);

  while (running) {
    try {
      const processed = await queue.drain(25);
      if (processed > 0) console.log(`[worker] ${processed} job(s) processado(s)`);
    } catch (error) {
      console.error("[worker] falha no ciclo", error);
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[worker] recebido ${signal}, encerrando…`);
    running = false;
  });
}

void loop();
