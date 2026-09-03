import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { disableStorePersistence } from "../persistence";
// Antes de qualquer acesso ao store: sem isto, rodar os testes sobrescreveria
// o estado real de quem está desenvolvendo.
disableStorePersistence();

import { createLocalAccount, findCredentialByEmail, verifyPassword } from "../accounts";
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  DEMO_WORKSPACE_ID,
  getMemoryStore,
  resetMemoryStore,
} from "../store";

beforeEach(() => {
  resetMemoryStore();
});

test("a conta de demonstração entra com a senha documentada", () => {
  getMemoryStore();
  const credential = findCredentialByEmail(DEMO_EMAIL);
  assert.ok(credential, "a demonstração precisa de credencial");
  assert.equal(verifyPassword(credential, DEMO_PASSWORD), true);
  assert.equal(verifyPassword(credential, "outra-senha"), false);
});

test("conta nova nasce com workspace próprio e vazio", () => {
  const store = getMemoryStore();
  const demoMonitors = store.monitors.length;
  assert.ok(demoMonitors > 0, "a demonstração vem com alvos semeados");

  const { user, workspace } = createLocalAccount({
    email: "Alguem@Exemplo.com",
    password: "senha-forte-1",
    name: "Alguém",
  });

  assert.equal(user.email, "alguem@exemplo.com", "e-mail é normalizado");
  assert.notEqual(workspace.id, DEMO_WORKSPACE_ID);
  assert.equal(workspace.ownerId, user.id);

  for (const [label, rows] of [
    ["monitoramentos", store.monitors],
    ["snapshots", store.monitoringSnapshots],
    ["eventos", store.monitoringEvents],
    ["coleções", store.collections],
    ["itens salvos", store.collectionItems],
    ["buscas", store.searches],
  ] as const) {
    const mine = rows.filter((row) => row.workspaceId === workspace.id);
    assert.equal(mine.length, 0, `${label} do workspace novo`);
  }
  assert.equal(
    [...store.usage.keys()].filter((key) => key.startsWith(workspace.id)).length,
    0,
    "consumo do workspace novo",
  );

  // E a demonstração continua intacta.
  assert.equal(store.monitors.length, demoMonitors);
});

test("senha é guardada como hash e conferida em tempo constante", () => {
  getMemoryStore();
  createLocalAccount({ email: "hash@exemplo.com", password: "senha-forte-1" });

  const credential = findCredentialByEmail("hash@exemplo.com");
  assert.ok(credential);
  assert.ok(!JSON.stringify(credential).includes("senha-forte-1"), "senha não pode ser guardada");
  assert.equal(verifyPassword(credential, "senha-forte-1"), true);
  assert.equal(verifyPassword(credential, "senha-forte-2"), false);
});

test("e-mail repetido é recusado, em qualquer caixa", () => {
  getMemoryStore();
  createLocalAccount({ email: "dupla@exemplo.com", password: "senha-forte-1" });

  assert.throws(
    () => createLocalAccount({ email: "DUPLA@exemplo.com", password: "outra-senha-1" }),
    /Já existe uma conta/,
  );
});

test("e-mails diferentes com o mesmo slug não compartilham identificador", () => {
  const store = getMemoryStore();

  const a = createLocalAccount({ email: "colide.teste@a.com", password: "senha-forte-1" });
  const b = createLocalAccount({ email: "colide-teste@b.com", password: "senha-forte-2" });

  // A sessão resolve o usuário pelo `id`; um `id` repetido faria a segunda
  // conta entrar no workspace da primeira.
  assert.notEqual(b.user.id, a.user.id);
  assert.notEqual(b.workspace.id, a.workspace.id);
  assert.equal(
    new Set(store.users.map((user) => user.id)).size,
    store.users.length,
    "nenhum id de usuário repetido",
  );
  assert.equal(
    new Set(store.workspaces.map((workspace) => workspace.id)).size,
    store.workspaces.length,
    "nenhum id de workspace repetido",
  );
});

test("cadastro com e-mail demo@ não invade o workspace de demonstração", () => {
  const store = getMemoryStore();
  const demoMonitors = store.monitors.filter((m) => m.workspaceId === DEMO_WORKSPACE_ID).length;

  // `slugify("demo")` é exatamente o handle da demonstração.
  const { user, workspace } = createLocalAccount({
    email: "demo@outraempresa.com",
    password: "senha-forte-1",
  });

  assert.notEqual(user.id, DEMO_USER_ID);
  assert.notEqual(workspace.id, DEMO_WORKSPACE_ID);
  assert.equal(
    store.monitors.filter((m) => m.workspaceId === workspace.id).length,
    0,
    "a conta nova não herda os alvos da demonstração",
  );
  assert.equal(
    store.monitors.filter((m) => m.workspaceId === DEMO_WORKSPACE_ID).length,
    demoMonitors,
    "e a demonstração segue intacta",
  );
});
