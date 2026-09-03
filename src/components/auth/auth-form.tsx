"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import { EMPTY_AUTH_STATE, type AuthState } from "@/app/(auth)/auth-state";

export function AuthForm({
  mode,
  demo,
  next,
}: {
  mode: "signin" | "signup";
  demo: boolean;
  /** Destino após autenticar, vindo de `?next=` (validado no server action). */
  next?: string;
}): React.ReactElement {
  const action = mode === "signin" ? signInAction : signUpAction;
  const [state, formAction, pending] = React.useActionState<AuthState, FormData>(
    action,
    EMPTY_AUTH_STATE,
  );

  return (
    <form action={formAction} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {mode === "signup" ? (
        <div className="space-y-1.5">
          <Label htmlFor="name">Seu nome</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Como devemos te chamar"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@agencia.com.br"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          {mode === "signin" ? (
            <span className="text-[11px] text-ink-faint">mínimo 8 caracteres</span>
          ) : null}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="••••••••"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-bad/30 bg-bad/10 px-3 py-2 text-[13px] text-bad"
        >
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p
          role="status"
          className="rounded-md border border-ok/30 bg-ok/10 px-3 py-2 text-[13px] text-ok"
        >
          {state.notice}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {mode === "signin" ? "Entrar" : "Criar conta"}
        {!pending ? <ArrowRight /> : null}
      </Button>

      {demo ? (
        <p className="flex items-start gap-2 rounded-md border border-line bg-surface/60 px-3 py-2.5 text-[12px] leading-relaxed text-ink-faint">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-info" />
          <span>
            <strong className="font-medium text-ink-muted">Modo local.</strong>{" "}
            {mode === "signin" ? (
              <>
                O Supabase não está configurado: as contas e o histórico ficam neste computador.
                Para ver a plataforma com dados sintéticos, entre na demonstração —{" "}
                <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">
                  demo@adminer.local
                </code>{" "}
                / <code className="rounded bg-surface-3 px-1 py-0.5 text-[11px]">demo1234</code>.
              </>
            ) : (
              <>
                Sua conta é criada neste computador, com workspace próprio e vazio — nada da
                demonstração atravessa para ele. O catálogo de anúncios continua sendo o dataset
                sintético até você configurar o token da Ad Library.
              </>
            )}
          </span>
        </p>
      ) : null}

      <p className="text-center text-[13px] text-ink-faint">
        {mode === "signin" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href={withNext("/signup", next)} className="font-medium text-brand-hi hover:underline">
              Criar agora
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href={withNext("/login", next)} className="font-medium text-brand-hi hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

/** Mantém o destino ao alternar entre login e cadastro. */
function withNext(href: string, next?: string): string {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}
