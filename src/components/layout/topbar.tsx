"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Menu, Pickaxe, Search, Settings, User } from "lucide-react";
import type { Notification } from "@/core/types/monitoring";
import type { SessionContext } from "@/core/types/workspace";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar, type SidebarProps } from "./sidebar";
import { formatRelative } from "@/lib/format";
import { signOutAction } from "@/app/(auth)/actions";

export function Topbar({
  session,
  notifications,
  sidebarProps,
}: {
  session: SessionContext;
  notifications: Notification[];
  sidebarProps: SidebarProps;
}): React.ReactElement {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const unread = notifications.filter((n) => !n.read).length;

  function submit(event: React.FormEvent): void {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/mine?q=${encodeURIComponent(query)}` : "/mine");
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-3 backdrop-blur-md sm:px-5">
      {/* Menu mobile: a sidebar vira drawer. */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <Sidebar {...sidebarProps} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <form onSubmit={submit} className="relative min-w-0 flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          type="search"
          placeholder="Minerar anúncios por palavra-chave…"
          aria-label="Minerar anúncios"
          className="h-9 w-full rounded-md border border-line bg-surface/70 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus-visible:border-brand/60 focus-visible:bg-surface"
        />
      </form>

      <Button asChild variant="heat" size="sm" className="hidden sm:inline-flex">
        <Link href="/mine">
          <Pickaxe />
          Minerar
        </Link>
      </Button>

      <Dropdown>
        <DropdownTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
            <Bell />
            {unread > 0 ? (
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-heat" />
            ) : null}
          </Button>
        </DropdownTrigger>
        <DropdownContent align="end" className="w-[22rem] p-0">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <p className="text-[13px] font-medium text-ink">Notificações</p>
            {unread > 0 ? (
              <Badge variant="heat" size="sm">
                {unread} nova{unread > 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto p-1">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-ink-faint">
                Nada por aqui ainda. Crie um monitoramento para receber alertas.
              </p>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href ?? "/monitoring"}
                  className="block rounded-md px-3 py-2.5 transition-colors hover:bg-surface-3"
                >
                  <div className="flex items-start gap-2">
                    {!notification.read ? (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-heat" />
                    ) : (
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {notification.title}
                      </p>
                      <p className="line-clamp-2 text-[12px] leading-relaxed text-ink-faint">
                        {notification.body}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-faint">
                        {formatRelative(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="border-t border-line p-1">
            <DropdownItem asChild>
              <Link href="/monitoring">Ver todos os eventos</Link>
            </DropdownItem>
          </div>
        </DropdownContent>
      </Dropdown>

      <Dropdown>
        <DropdownTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full border border-line bg-surface/60 py-1 pl-1 pr-2.5 transition-colors hover:border-line-strong"
            aria-label="Menu da conta"
          >
            <Avatar
              src={session.user.avatarUrl}
              name={session.user.name ?? session.user.email}
              className="size-6"
            />
            <span className="hidden max-w-[9rem] truncate text-[12.5px] text-ink-muted sm:block">
              {session.user.name ?? session.user.email}
            </span>
          </button>
        </DropdownTrigger>
        <DropdownContent align="end" className="w-56">
          <DropdownLabel>{session.workspace.name}</DropdownLabel>
          <DropdownItem asChild>
            <Link href="/settings">
              <User />
              Minha conta
            </Link>
          </DropdownItem>
          <DropdownItem asChild>
            <Link href="/settings/plan">
              <Settings />
              Plano e consumo
            </Link>
          </DropdownItem>
          <DropdownSeparator />
          <DropdownItem destructive asChild>
            <button type="submit" form="signout-form" className="w-full">
              <LogOut />
              Sair
            </button>
          </DropdownItem>
        </DropdownContent>
      </Dropdown>

      {/* Fora do menu: o Radix desmonta o conteúdo ao selecionar o item. */}
      <form id="signout-form" action={signOutAction} className="hidden" />
    </header>
  );
}
