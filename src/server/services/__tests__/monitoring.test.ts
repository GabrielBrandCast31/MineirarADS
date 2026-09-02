import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import type { SessionContext } from "@/core/types/workspace";
import { MONITOR_FREQUENCY_HOURS } from "@/core/types/monitoring";
import { InvalidAdLibraryLinkError } from "@/core/meta/ad-library-link";
import { adLibraryPageUrlFor } from "@/core/constants/meta";
import { getRepositories } from "@/data";
import { DEMO_USER_ID, getMemoryStore, resetMemoryStore } from "@/data/memory/store";
import { MockAdProvider, setAdProvider } from "@/providers/ads";
import { sweepDueMonitors, watchAdLibraryLink } from "../monitoring";

/**
 * Fluxo "salvei o link e quero acompanhar a semana".
 *
 * Roda sobre o driver em memória e o provider de demonstração — os mesmos que
 * a aplicação usa sem Supabase configurado.
 */

// Sem latência simulada: aqui ela só somaria segundos ao teste.
setAdProvider(new MockAdProvider({ latencyMs: 0 }));
after(() => setAdProvider(null));

function demoSession(): SessionContext {
  const store = getMemoryStore();
  const workspace = store.workspaces[0];
  const user = store.users.find((u) => u.id === DEMO_USER_ID);
  assert.ok(workspace && user, "store de demonstração precisa de workspace e usuário");
  return { user, workspace, role: "owner", demo: true, isPlatformAdmin: true };
}

/** Uma página que existe no dataset, com o link como o usuário o copiaria. */
function samplePage(): { pageId: string; url: string; advertiserId: string } {
  const advertiser = getMemoryStore().dataset.advertisers.find(
    (candidate) => candidate.metaPageId && candidate.stats.totalAds > 0,
  );
  assert.ok(advertiser?.metaPageId, "dataset precisa de um anunciante com page_id");
  return {
    pageId: advertiser.metaPageId,
    url: adLibraryPageUrlFor(advertiser.metaPageId),
    advertiserId: advertiser.id,
  };
}

beforeEach(() => {
  resetMemoryStore();
});

test("link de página vira monitoramento com o primeiro snapshot", async () => {
  const ctx = demoSession();
  const page = samplePage();

  const outcome = await watchAdLibraryLink(ctx, { url: page.url, frequency: "daily" });

  assert.equal(outcome.alreadyWatching, false);
  assert.equal(outcome.advertiser.id, page.advertiserId);
  assert.equal(outcome.monitor.target, "advertiser");
  assert.equal(outcome.monitor.frequency, "daily");
  assert.ok(outcome.collected > 0, "a fonte deve devolver anúncios da página");

  const snapshots = await getRepositories().monitoring.listSnapshots(ctx, outcome.monitor.id);
  assert.equal(snapshots.length, 1, "a criação captura a base de comparação");
  assert.ok(snapshots[0]!.adCount > 0);
});

test("frequência semanal agenda a próxima coleta para sete dias", async () => {
  const ctx = demoSession();
  const outcome = await watchAdLibraryLink(ctx, {
    url: samplePage().url,
    frequency: "weekly",
  });

  const monitor = await getRepositories().monitoring.getMonitor(ctx, outcome.monitor.id);
  assert.ok(monitor?.lastCheckedAt && monitor.nextCheckAt);

  const gapHours =
    (new Date(monitor.nextCheckAt).getTime() - new Date(monitor.lastCheckedAt).getTime()) /
    3_600_000;
  assert.equal(Math.round(gapHours), MONITOR_FREQUENCY_HOURS.weekly);
});

test("salvar o mesmo link duas vezes não duplica o alvo", async () => {
  const ctx = demoSession();
  const repositories = getRepositories();
  const url = samplePage().url;
  const before = (await repositories.monitoring.listMonitors(ctx)).length;

  const first = await watchAdLibraryLink(ctx, { url });
  const again = await watchAdLibraryLink(ctx, { url: `${url}&media_type=all` });

  assert.equal(again.alreadyWatching, true);
  assert.equal(again.monitor.id, first.monitor.id);
  assert.equal((await repositories.monitoring.listMonitors(ctx)).length, before + 1);
});

test("varredura só toca no que venceu e transforma a diferença em evento", async () => {
  const ctx = demoSession();
  const repositories = getRepositories();
  const page = samplePage();

  const { monitor } = await watchAdLibraryLink(ctx, { url: page.url, frequency: "weekly" });

  // Nada vencido: a varredura não deve gastar coleta. (O store de demonstração
  // já vem com alvos sementeados, todos agendados para o futuro.)
  assert.deepEqual(await sweepDueMonitors(ctx), { due: 0, checked: 0, events: 0 });

  // Uma semana depois, com um anúncio novo no ar na página observada.
  const store = getMemoryStore();
  const stored = store.monitors.find((m) => m.id === monitor.id);
  assert.ok(stored);
  stored.nextCheckAt = new Date(Date.now() - 60_000).toISOString();

  const sample = store.dataset.index.adsByAdvertiserId.get(page.advertiserId)?.[0];
  assert.ok(sample, "a página precisa ter pelo menos um anúncio para clonar");
  await repositories.catalog.upsertBatch(ctx, {
    ads: [{ ...sample, id: `${sample.id}_novo`, metaAdArchiveId: `${sample.metaAdArchiveId}9` }],
  });

  const sweep = await sweepDueMonitors(ctx);
  assert.deepEqual({ due: sweep.due, checked: sweep.checked }, { due: 1, checked: 1 });

  // O clone traz anúncio e criativos novos: volume e variação são eventos
  // distintos de propósito, porque respondem a perguntas diferentes.
  const events = await repositories.monitoring.listEvents(ctx, { monitorId: monitor.id });
  assert.equal(sweep.events, events.length);
  assert.deepEqual(
    new Set(events.map((event) => event.type)),
    new Set(["volume_increase", "new_variation"]),
  );
  const volume = events.find((event) => event.type === "volume_increase");
  assert.match(volume?.title ?? "", /1 anúncio\(s\) novo\(s\)/);

  const snapshots = await repositories.monitoring.listSnapshots(ctx, monitor.id);
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1]!.adCount - snapshots[0]!.adCount, 1);

  // E o relógio volta a andar: depois da coleta, nada está vencido de novo.
  assert.equal((await sweepDueMonitors(ctx)).due, 0);
});

test("página desconhecida da fonte ainda é acompanhada, com aviso honesto", async () => {
  const ctx = demoSession();

  const outcome = await watchAdLibraryLink(ctx, {
    url: "https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=BR&view_all_page_id=111222333444",
  });

  assert.equal(outcome.collected, 0);
  assert.equal(outcome.advertiser.metaPageId, "111222333444");
  assert.equal(outcome.advertiser.name, "Página 111222333444");
  assert.equal(outcome.advertiser.stats.totalAds, 0, "nada de número inventado");
  assert.ok(outcome.monitor.active);
  assert.ok(
    outcome.warnings.some((warning) => warning.includes("demonstração")),
    `avisos: ${outcome.warnings.join(" | ")}`,
  );
});

test("link que não é de uma página é recusado com instrução", async () => {
  const ctx = demoSession();
  const before = (await getRepositories().monitoring.listMonitors(ctx)).length;

  await assert.rejects(
    () => watchAdLibraryLink(ctx, { url: "https://www.facebook.com/clinicaexemplo" }),
    (error: unknown) =>
      error instanceof InvalidAdLibraryLinkError && /Transparência da página/.test(error.message),
  );

  await assert.rejects(
    () =>
      watchAdLibraryLink(ctx, {
        url: "https://www.facebook.com/ads/library/?id=123456789012345",
      }),
    (error: unknown) =>
      error instanceof InvalidAdLibraryLinkError && /anúncio específico/.test(error.message),
  );

  assert.equal(
    (await getRepositories().monitoring.listMonitors(ctx)).length,
    before,
    "link recusado não pode deixar alvo criado",
  );
});
