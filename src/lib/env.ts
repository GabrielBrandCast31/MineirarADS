import { z } from "zod";

/**
 * Validação de ambiente.
 *
 * Regras:
 * - Nada de `process.env` espalhado pelo código: importe daqui.
 * - `serverEnv` só pode ser lido no servidor. Importar em componente client
 *   quebra o build, o que é intencional.
 */

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("AdMiner"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalString,
});

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATA_DRIVER: z.enum(["memory", "supabase"]).default("memory"),
  ADS_PROVIDER: z.enum(["mock", "meta"]).default("mock"),
  AI_PROVIDER: z.enum(["heuristic", "anthropic", "openai"]).default("heuristic"),
  JOB_DRIVER: z.enum(["memory", "redis"]).default("memory"),

  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  META_AD_LIBRARY_ACCESS_TOKEN: optionalString,
  META_GRAPH_API_VERSION: z.string().default("v21.0"),

  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().default("claude-opus-5"),
  OPENAI_API_KEY: optionalString,
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),

  REDIS_URL: optionalString,
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),

  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  ADMIN_EMAILS: z.string().default(""),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

let serverEnvCache: z.infer<typeof serverSchema> | null = null;

/** Ambiente do servidor. Lança se chamado no browser. */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() não pode ser usado no client.");
  }
  serverEnvCache ??= serverSchema.parse(process.env);
  return serverEnvCache;
}

/** Supabase configurado o suficiente para autenticar usuários. */
export function isSupabaseConfigured(): boolean {
  return Boolean(clientEnv.NEXT_PUBLIC_SUPABASE_URL && clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Modo demonstração: sem Supabase, tudo roda em memória com dados mockados. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured();
}

export function adminEmails(): string[] {
  return serverEnv()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
