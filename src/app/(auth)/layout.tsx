import * as React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Quem já está autenticado não deve ver a tela de login.
  const session = await getSession();
  if (session) redirect("/dashboard");

  return <div className="grain min-h-dvh bg-canvas">{children}</div>;
}
