import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { PLANS } from "@/core/constants/plans";
import { getRepositories } from "@/data";
import { requireSession } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await requireSession();
  const repositories = getRepositories();

  const [notifications, events] = await Promise.all([
    repositories.monitoring.listNotifications(session, 12),
    repositories.monitoring.listEvents(session, { onlyUnseen: true, limit: 50 }),
  ]);

  const sidebarProps = {
    isPlatformAdmin: session.isPlatformAdmin,
    unseenEvents: events.length,
    planName: PLANS[session.workspace.planId].name,
    workspaceName: session.workspace.name,
  };

  return (
    <div className="grain min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="grain-layer" aria-hidden />
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-bg lg:block">
        <Sidebar {...sidebarProps} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <Topbar session={session} notifications={notifications} sidebarProps={sidebarProps} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
