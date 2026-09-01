import { redirect } from "next/navigation";
import { getSession } from "@/server/auth";

export default async function RootPage(): Promise<never> {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
