import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { serverEnv } from "@/lib/env";
import type { MemoryStore } from "./store";

/**
 * Persistência do driver `memory`.
 *
 * O driver nasceu para demonstração, onde perder o estado no reinício não
 * custava nada. Deixou de ser verdade quando ele passou a guardar **contas** e
 * **histórico de monitoramento**: acompanhar o crescimento de uma oferta por
 * uma semana exige que os snapshots da segunda-feira ainda existam na sexta.
 *
 * O que é gravado: o que o usuário produziu (contas, workspaces, coleções,
 * monitoramentos, snapshots, eventos, análises, buscas, consumo).
 * O que não é: o dataset sintético e os logs — ambos são reconstruídos a cada
 * boot, e os identificadores do dataset são determinísticos, então o que foi
 * gravado continua apontando para as mesmas entidades.
 *
 * Falha de leitura ou escrita nunca derruba a aplicação: no pior caso o
 * usuário volta a um estado recém-semeado, e isso é registrado no console.
 */

const SNAPSHOT_VERSION = 1;

/** Coleções do store que entram no snapshot, como listas simples. */
const LIST_KEYS = [
  "users",
  "credentials",
  "workspaces",
  "members",
  "subscriptions",
  "collections",
  "collectionItems",
  "tags",
  "monitors",
  "monitoringSnapshots",
  "monitoringEvents",
  "notifications",
  "insightReports",
  "searches",
  "adSnapshots",
] as const;

/** Campos `Map` — serializados como pares. `adTags` guarda `Set` nos valores. */
const MAP_KEYS = [
  "copyAnalyses",
  "creativeAnalyses",
  "transcriptions",
  "searchResults",
  "usage",
] as const;

type ListKey = (typeof LIST_KEYS)[number];
type MapKey = (typeof MAP_KEYS)[number];

interface Snapshot {
  version: number;
  savedAt: string;
  sequence: number;
  adTags: Array<[string, string[]]>;
  lists: Partial<Record<ListKey, unknown[]>>;
  maps: Partial<Record<MapKey, Array<[string, unknown]>>>;
}

let enabled = true;
let lastWritten: string | null = null;

declare global {
  // Em `globalThis` pelo mesmo motivo do store: cada recompilação em
  // desenvolvimento reavalia este módulo, e um timer por geração deixaria
  // vários intervalos vivos.
  var __adminerStoreAutoSave: NodeJS.Timeout | undefined;
}

/**
 * Desliga a persistência no processo atual.
 *
 * Testes chamam isto antes de tocar no store: sem isso, cada execução
 * sobrescreveria o estado real do desenvolvedor.
 */
export function disableStorePersistence(): void {
  enabled = false;
  if (globalThis.__adminerStoreAutoSave) {
    clearInterval(globalThis.__adminerStoreAutoSave);
    globalThis.__adminerStoreAutoSave = undefined;
  }
}

export function storeFilePath(): string {
  const configured = serverEnv().MEMORY_STORE_FILE;
  // O `turbopackIgnore` é o opt-out que o próprio build indica: sem ele, a
  // análise estática vê um caminho montado em tempo de execução e passa a
  // rastrear o projeto **inteiro** para dentro do output do servidor — todos os
  // fontes e o `public/`. Não há nada a rastrear aqui: o arquivo é criado em
  // runtime, e o caminho é do operador (um volume, um diretório fora do repo).
  return path.isAbsolute(configured)
    ? configured
    : path.join(/*turbopackIgnore: true*/ process.cwd(), configured);
}

/** Aplica o estado gravado sobre um store recém-semeado. */
export function restoreStore(store: MemoryStore): boolean {
  if (!enabled) return false;

  let raw: string;
  try {
    raw = readFileSync(storeFilePath(), "utf8");
  } catch {
    // Primeira execução: não há nada para restaurar.
    return false;
  }

  try {
    const snapshot = JSON.parse(raw) as Snapshot;
    if (snapshot.version !== SNAPSHOT_VERSION) {
      console.warn(
        `[store] snapshot na versão ${snapshot.version}, esperada ${SNAPSHOT_VERSION}. Ignorando e recomeçando do zero.`,
      );
      return false;
    }

    for (const key of LIST_KEYS) {
      const value = snapshot.lists?.[key];
      if (Array.isArray(value)) {
        // O tipo concreto de cada lista já foi validado na gravação; aqui a
        // alternativa seria repetir 15 schemas para um arquivo que só nós
        // escrevemos.
        (store[key] as unknown[]) = value;
      }
    }
    for (const key of MAP_KEYS) {
      const value = snapshot.maps?.[key];
      if (Array.isArray(value)) {
        (store[key] as Map<string, unknown>) = new Map(value);
      }
    }
    store.adTags = new Map(
      (snapshot.adTags ?? []).map(([adId, tagIds]) => [adId, new Set(tagIds)]),
    );
    store.sequence = snapshot.sequence ?? store.sequence;

    lastWritten = raw;
    return true;
  } catch (error) {
    console.warn(
      `[store] snapshot ilegível (${error instanceof Error ? error.message : String(error)}). Recomeçando do zero.`,
    );
    return false;
  }
}

/** Grava agora, se algo mudou desde a última gravação. */
export function saveStore(store: MemoryStore): void {
  if (!enabled) return;

  const snapshot: Snapshot = {
    version: SNAPSHOT_VERSION,
    savedAt: new Date().toISOString(),
    sequence: store.sequence,
    adTags: [...store.adTags].map(([adId, tagIds]) => [adId, [...tagIds]]),
    lists: Object.fromEntries(LIST_KEYS.map((key) => [key, store[key]])),
    maps: Object.fromEntries(MAP_KEYS.map((key) => [key, [...store[key]]])),
  };

  const serialized = JSON.stringify(snapshot);
  if (serialized === lastWritten) return;

  const target = storeFilePath();
  try {
    mkdirSync(path.dirname(target), { recursive: true });
    // Grava e renomeia: um crash no meio da escrita não deixa JSON truncado.
    const temporary = `${target}.tmp`;
    writeFileSync(temporary, serialized, "utf8");
    renameSync(temporary, target);
    lastWritten = serialized;
  } catch (error) {
    console.warn(
      `[store] falha ao gravar ${target}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Passa a gravar periodicamente.
 *
 * As escritas no store acontecem em dezenas de pontos (cada repositório mexe
 * nos seus arrays), então um gatilho por mutação exigiria instrumentar todos.
 * Um intervalo curto que compara o serializado com o último gravado dá o mesmo
 * resultado com uma linha de acoplamento — e `unref` garante que ele não
 * segure o processo vivo.
 */
export function startStoreAutoSave(currentStore: () => MemoryStore): void {
  if (!enabled || globalThis.__adminerStoreAutoSave) return;
  // Recebe um getter, não o store: `resetMemoryStore()` troca a instância, e um
  // intervalo preso à antiga gravaria estado morto por cima do novo.
  const timer = setInterval(() => saveStore(currentStore()), 3_000);
  timer.unref?.();
  globalThis.__adminerStoreAutoSave = timer;
}
