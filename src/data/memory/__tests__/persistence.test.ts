import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

// Este arquivo é o único que exercita a gravação de verdade, então aponta o
// caminho para um diretório temporário antes de qualquer leitura de ambiente.
// `node --test` roda cada arquivo em um processo próprio, então isto não
// escapa para os outros.
const directory = mkdtempSync(path.join(os.tmpdir(), "adminer-store-"));
process.env.MEMORY_STORE_FILE = path.join(directory, "store.json");

const { disableStorePersistence, restoreStore, saveStore, storeFilePath } = await import(
  "../persistence"
);
const { getMemoryStore, resetMemoryStore } = await import("../store");
const { createLocalAccount, findCredentialByEmail, verifyPassword } = await import("../accounts");

after(() => {
  // Encerra o salvamento automático antes de apagar o diretório, senão o
  // próximo tique reclamaria de um caminho que não existe mais.
  disableStorePersistence();
  rmSync(directory, { recursive: true, force: true });
});

test("o arquivo de estado vai para onde o ambiente aponta", () => {
  assert.equal(storeFilePath(), path.join(directory, "store.json"));
});

test("conta e histórico de monitoramento sobrevivem ao reinício", () => {
  const store = getMemoryStore();

  const { user, workspace } = createLocalAccount({
    email: "persistente@exemplo.com",
    password: "senha-forte-1",
    name: "Persistente",
  });

  // Uma semana de acompanhamento de uma oferta, em miniatura.
  store.monitors.push({
    id: "mon_teste",
    workspaceId: workspace.id,
    target: "offer",
    entityId: "off_teste",
    entityLabel: "Oferta em teste",
    entityThumbnail: null,
    frequency: "weekly",
    active: true,
    lastCheckedAt: new Date().toISOString(),
    nextCheckAt: new Date(Date.now() + 604_800_000).toISOString(),
    unseenEvents: 0,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  });
  for (const [index, adCount] of [4, 7, 11].entries()) {
    store.monitoringSnapshots.push({
      id: `snap_teste_${index}`,
      monitorId: "mon_teste",
      workspaceId: workspace.id,
      capturedAt: new Date(Date.now() - (2 - index) * 86_400_000).toISOString(),
      adCount,
      activeAdCount: adCount,
      creativeCount: adCount * 2,
      contentHash: `hash_${index}`,
    });
  }
  store.usage.set(`${workspace.id}:monitors:2026-09-01`, 1);
  saveStore(store);

  // Reinício: novo processo veria exatamente isto.
  resetMemoryStore();
  const restored = getMemoryStore();

  const credential = findCredentialByEmail("persistente@exemplo.com");
  assert.ok(credential, "a conta precisa sobreviver");
  assert.equal(verifyPassword(credential, "senha-forte-1"), true, "o hash precisa sobreviver");

  const monitor = restored.monitors.find((candidate) => candidate.id === "mon_teste");
  assert.equal(monitor?.frequency, "weekly");
  assert.equal(monitor?.entityLabel, "Oferta em teste");

  const timeline = restored.monitoringSnapshots
    .filter((snapshot) => snapshot.monitorId === "mon_teste")
    .map((snapshot) => snapshot.adCount);
  assert.deepEqual(timeline, [4, 7, 11], "a curva de crescimento não pode se perder");

  assert.equal(restored.usage.get(`${workspace.id}:monitors:2026-09-01`), 1, "Map restaurado");
  assert.ok(restored.dataset.ads.length > 0, "o dataset é reconstruído, não restaurado");
});

test("a conta de demonstração continua existindo depois de restaurar", () => {
  const store = getMemoryStore();
  assert.ok(store.users.some((user) => user.email === "demo@adminer.local"));
  assert.ok(findCredentialByEmail("demo@adminer.local"));
});

test("snapshot ilegível não impede o boot", () => {
  const store = getMemoryStore();
  // Arquivo corrompido (queda no meio de uma escrita antiga, disco cheio):
  // `restoreStore` recusa e avisa, em vez de derrubar a aplicação no boot.
  writeFileSync(storeFilePath(), "{ isto não é json", "utf8");
  assert.equal(restoreStore(store), false);
  assert.ok(store.users.length > 0, "o store semeado continua utilizável");
});
