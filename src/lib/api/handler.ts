import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { SessionContext } from "@/core/types/workspace";
import { ForbiddenError, NotFoundError } from "@/data/types";
import { FeatureLockedError, QuotaExceededError } from "@/server/services/quota";
import { AICapabilityError, AIProviderError } from "@/providers/ai";
import { ProviderConfigurationError, ProviderNotImplementedError } from "@/providers/ads";
import { rateLimit } from "@/lib/rate-limit";
import { getApiSession } from "@/server/auth";
import { errorContext, log } from "@/server/services/logging";

export interface ApiContext<P = Record<string, string>> {
  request: NextRequest;
  session: SessionContext;
  params: P;
}

interface HandlerOptions {
  /** Requisições por janela para esta rota. */
  limit?: number;
  windowSeconds?: number;
}

/**
 * Envelope das rotas de API.
 *
 * Cuida de sessão, rate limit, erro tipado e log — para que cada rota trate
 * apenas do seu assunto. Toda rota da plataforma passa por aqui.
 */
export function apiHandler<P = Record<string, string>>(
  handler: (ctx: ApiContext<P>) => Promise<unknown>,
  options: HandlerOptions = {},
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<P> } | undefined,
  ): Promise<NextResponse> => {
    const session = await getApiSession();
    if (!session) {
      return NextResponse.json(
        { error: "Não autenticado.", code: "unauthorized" },
        { status: 401 },
      );
    }

    const key = `${session.workspace.id}:${new URL(request.url).pathname}`;
    const limit = rateLimit(key, options);
    const headers = {
      "X-RateLimit-Limit": String(limit.limit),
      "X-RateLimit-Remaining": String(limit.remaining),
      "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
    };

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em instantes.", code: "rate_limited" },
        { status: 429, headers },
      );
    }

    try {
      const params = routeContext ? await routeContext.params : ({} as P);
      const data = await handler({ request, session, params });
      return NextResponse.json({ data }, { headers });
    } catch (error) {
      return handleError(error, session, headers);
    }
  };
}

async function handleError(
  error: unknown,
  session: SessionContext,
  headers: Record<string, string>,
): Promise<NextResponse> {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Parâmetros inválidos.",
        code: "invalid_request",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400, headers },
    );
  }
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message, code: "not_found" },
      { status: 404, headers },
    );
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message, code: "forbidden" },
      { status: 403, headers },
    );
  }
  if (error instanceof QuotaExceededError) {
    return NextResponse.json(
      { error: error.message, code: "quota_exceeded", metric: error.metric },
      { status: 402, headers },
    );
  }
  if (error instanceof FeatureLockedError) {
    return NextResponse.json(
      { error: error.message, code: "feature_locked", feature: error.feature },
      { status: 402, headers },
    );
  }
  if (
    error instanceof ProviderNotImplementedError ||
    error instanceof ProviderConfigurationError ||
    error instanceof AIProviderError ||
    error instanceof AICapabilityError
  ) {
    return NextResponse.json(
      { error: error.message, code: "provider_unavailable" },
      { status: 503, headers },
    );
  }

  await log(
    {
      level: "error",
      scope: "api",
      message: "Erro não tratado em rota de API",
      context: errorContext(error),
    },
    session,
  );

  return NextResponse.json(
    { error: "Erro interno.", code: "internal_error" },
    { status: 500, headers },
  );
}

/** Lê e valida o corpo JSON da requisição. */
export async function readJson<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => ({}));
  return schema.parse(body);
}

/** Lê e valida a query string. */
export function readQuery<T>(request: NextRequest, schema: z.ZodType<T>): T {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}
