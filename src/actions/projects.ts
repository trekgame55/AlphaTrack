"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "./workspace";
import { revalidatePath } from "next/cache";

// ─── List projects in workspace ───────────────────────────────────────────────

export async function listProjects(workspaceId: string) {
  return db.project.findMany({
    where: { workspaceId },
    include: { tasks: true },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Create project ───────────────────────────────────────────────────────────

export async function createProject(workspaceId: string, name: string, color: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Нет авторизации" };

  const project = await db.project.create({
    data: { name, color, workspaceId },
    include: { tasks: true },
  });

  revalidatePath("/projects");
  return { project };
}

// ─── Delete project ───────────────────────────────────────────────────────────

export async function deleteProject(projectId: string) {
  await db.project.delete({ where: { id: projectId } });
  revalidatePath("/projects");
  return { success: true };
}
