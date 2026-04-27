import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { DashboardShell } from "./shell";

const COOKIE_NAME = "alphatrack_session";

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const user = await api.auth.me(token);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return redirect("/login");
  }

  return <DashboardShell userId={userId}>{children}</DashboardShell>;
}
