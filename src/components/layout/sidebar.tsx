"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, isActive } from "./nav-items";

export interface SidebarProps {
  isPlatformAdmin: boolean;
  unseenEvents: number;
  planName: string;
  workspaceName: string;
  onNavigate?: () => void;
}

/**
 * Navegação principal. Fixa no desktop; dentro de um drawer no mobile
 * (o mesmo componente serve os dois casos — só o container muda).
 */
export function Sidebar({
  isPlatformAdmin,
  unseenEvents,
  planName,
  workspaceName,
  onNavigate,
}: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 pb-4">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-bg/85 px-2 py-4 backdrop-blur">
        <Link href="/dashboard" onClick={onNavigate} className="rounded-md">
          <Logo />
        </Link>
      </div>

      <div className="mb-3 rounded-lg border border-line bg-surface/70 px-3 py-2.5">
        <p className="truncate text-[12.5px] font-medium text-ink">{workspaceName}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant={planName === "Free" ? "neutral" : "brand"} size="sm">
            Plano {planName}
          </Badge>
        </div>
      </div>

      {NAV_SECTIONS.filter((section) => !section.adminOnly || isPlatformAdmin).map((section) => (
        <div key={section.title ?? "root"} className="mb-2">
          {section.title ? (
            <p className="px-2.5 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-ink-faint">
              {section.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors",
                      active
                        ? "bg-surface-2 font-medium text-ink"
                        : "text-ink-muted hover:bg-surface/70 hover:text-ink",
                    )}
                  >
                    {active ? (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand"
                        aria-hidden
                      />
                    ) : null}
                    <Icon
                      className={cn(
                        "size-[17px] shrink-0",
                        active ? "text-brand-hi" : "text-ink-faint group-hover:text-ink-muted",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {item.badge === "monitoring" && unseenEvents > 0 ? (
                      <span className="ml-auto grid size-[18px] place-items-center rounded-full bg-heat/20 text-[10px] font-semibold text-heat">
                        {unseenEvents > 9 ? "9+" : unseenEvents}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-auto px-2.5 pt-4">
        <p className="text-[10.5px] leading-relaxed text-ink-faint">
          Dados públicos da Meta Ad Library. Nenhuma métrica de performance é estimada.
        </p>
      </div>
    </nav>
  );
}
