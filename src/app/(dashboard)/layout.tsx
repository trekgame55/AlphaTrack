import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { DashboardShell } from "./shell";

const COOKIE_NAME = "weeek_session";

async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const session = await db.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) return null;
    return session.userId;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    // Clear the stale cookie via response headers before redirecting
    const response = redirect("/login");
    return response;
  }

  return <DashboardShell userId={userId}>{children}</DashboardShell>;
}
