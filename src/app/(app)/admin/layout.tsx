import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/server/auth";

const TABS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/jobs", label: "Jobs" },
];

/**
 * Guarda do painel administrativo.
 *
 * A autorização acontece aqui, na aplicação, e não em RLS: o painel usa o
 * service role para enxergar todos os workspaces, então dar esse poder via
 * política de banco criaria um caminho de escalonamento pelo cliente.
 * `ADMIN_EMAILS` define quem entra.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  if (!session.isPlatformAdmin) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-heat" />
          <h1 className="text-lg font-semibold tracking-[-0.02em] text-ink">Administração</h1>
          <Badge variant="heat" size="sm">
            acesso restrito
          </Badge>
        </div>

        <nav className="flex items-center gap-1 rounded-lg border border-line bg-surface/60 p-1">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-md px-3 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}
