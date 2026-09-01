/**
 * Hooks de resolução para `node --test`.
 *
 * O runner nativo do Node executa TypeScript (type stripping) mas não conhece
 * os aliases do tsconfig (`@/*`) nem imports sem extensão. Estes hooks
 * cobrem os dois casos, evitando adicionar um bundler só para rodar testes.
 */
import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = path.join(projectRoot, "src");
const CANDIDATE_SUFFIXES = [".ts", ".tsx", ".mts", ".js", "/index.ts", "/index.tsx"];

function firstExisting(basePath) {
  if (existsSync(basePath) && statSync(basePath).isFile()) return basePath;
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = basePath + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const resolved = firstExisting(path.join(srcRoot, specifier.slice(2)));
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const resolved = firstExisting(path.resolve(parentDir, specifier));
      if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});
