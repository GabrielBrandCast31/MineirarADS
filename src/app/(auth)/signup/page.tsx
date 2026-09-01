import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShowcase } from "@/components/auth/auth-showcase";
import { Logo } from "@/components/brand/logo";
import { isDemoMode } from "@/lib/env";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}): Promise<React.ReactElement> {
  const demo = isDemoMode();
  const { next } = await searchParams;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,460px)_1fr]">
      <main className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-sm space-y-8">
          <Logo />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-ink">Criar sua conta</h1>
            <p className="text-[13.5px] leading-relaxed text-ink-faint">
              Você começa no plano Free, com buscas e monitoramentos limitados.
            </p>
          </div>
          <AuthForm mode="signup" demo={demo} next={next} />
        </div>
      </main>
      <AuthShowcase />
    </div>
  );
}
