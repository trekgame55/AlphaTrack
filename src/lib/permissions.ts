import { Role, Member, Task, SpreadsheetDoc, DocAccessEntry, CURRENT_USER_ID, CURRENT_USER } from "./mock-data";
import { useAppStore } from "./store";

// ─── Get role of a user in a project ─────────────────────────────────────────

export function getUserRoleInProject(userId: string, projectId: string): Role {
  const state = useAppStore.getState();
  
  // Find user in global members list, or fallback to current user
  const user = state.members.find((m) => m.id === userId) || (userId === CURRENT_USER_ID ? CURRENT_USER : undefined);
  
  // If user is a global Admin+, they are admin_plus everywhere
  if (user && user.globalRole === "admin_plus") return "admin_plus";
  
  const project = state.projects.find((p) => p.id === projectId);
  if (!project) {
     return user?.globalRole || "member";
  }
  
  const projectRole = project.members.find((m) => m.member.id === userId)?.role;
  return projectRole ?? user?.globalRole ?? "member";
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    admin_plus: "Владелец",
    admin:      "Администратор",
    member:     "Участник",
    viewer:     "Читатель",
  };
  return labels[role];
}

// ─── Task permissions ──────────────────────────────────────────────────────────

export function getTaskAccess(
  task: Task,
  userId: string = CURRENT_USER_ID
): "edit" | "view" | "none" {
  // If no task permissions specified, fallback to "edit" so things don't break unexpectedly
  if (!task.accessList) return "edit"; 
  
  // 1. Member-specific entry
  const memberEntry = task.accessList.find((e) => e.kind === "member" && e.memberId === userId);
  if (memberEntry) return memberEntry.access;

  // 2. Role-based entry
  const role = getUserRoleInProject(userId, task.projectId);
  const roleEntries = task.accessList.filter((e) => e.kind === "role");
  const rolePower: Record<Role, number> = { admin_plus: 4, admin: 3, member: 2, viewer: 1 };
  const userPower = rolePower[role] ?? 0;
  
  let best: "edit" | "view" | "none" = task.defaultAccess ?? "view";
  for (const entry of roleEntries) {
    if (!entry.role) continue;
    const entryPower = rolePower[entry.role] ?? 0;
    if (userPower >= entryPower) {
      if (entry.access === "edit") return "edit";
      if (entry.access === "view" && best === "none") best = "view";
    }
  }
  return best;
}

export function canCompleteTask(task: Task, userId: string = CURRENT_USER_ID): boolean {
  if (getTaskAccess(task, userId) === "none") return false;
  const state = useAppStore.getState();
  const role = getUserRoleInProject(userId, task.projectId);
  return state.rolePermissions[role]?.canCompleteTask ?? false;
}

export function canEditTask(task: Task, userId: string = CURRENT_USER_ID): boolean {
  if (getTaskAccess(task, userId) !== "edit") return false;
  const state = useAppStore.getState();
  const role = getUserRoleInProject(userId, task.projectId);
  return state.rolePermissions[role]?.canEditTask ?? false;
}

export function canManageMembers(projectId: string, userId: string = CURRENT_USER_ID): boolean {
  const state = useAppStore.getState();
  const role = getUserRoleInProject(userId, projectId);
  return state.rolePermissions[role]?.canManageMembers ?? false;
}

export function canChangeRoles(projectId: string, userId: string = CURRENT_USER_ID): boolean {
  const state = useAppStore.getState();
  const role = getUserRoleInProject(userId, projectId);
  return state.rolePermissions[role]?.canChangeRoles ?? false;
}

export function canRemoveMember(
  projectId: string,
  targetUserId: string,
  userId: string = CURRENT_USER_ID
): boolean {
  if (userId === targetUserId) return false;
  const actorRole  = getUserRoleInProject(userId, projectId);
  const targetRole = getUserRoleInProject(targetUserId, projectId);
  if (actorRole === "admin_plus") return true;
  if (actorRole === "admin") return targetRole === "member" || targetRole === "viewer";
  return false;
}

// ─── Document permissions ─────────────────────────────────────────────────────

export function getDocAccess(
  doc: SpreadsheetDoc,
  userId: string = CURRENT_USER_ID,
  projectId?: string
): "edit" | "view" | "none" {
  const memberEntry = doc.accessList.find((e) => e.kind === "member" && e.memberId === userId);
  if (memberEntry) return memberEntry.access;

  const role = getUserRoleInProject(userId, projectId ?? doc.projectId ?? "");
  const roleEntries = doc.accessList.filter((e) => e.kind === "role");
  const rolePower: Record<Role, number> = { admin_plus: 4, admin: 3, member: 2, viewer: 1 };
  const userPower = rolePower[role] ?? 0;
  
  let best: "edit" | "view" | "none" = doc.defaultAccess;
  for (const entry of roleEntries) {
    if (!entry.role) continue;
    const entryPower = rolePower[entry.role] ?? 0;
    if (userPower >= entryPower) {
      if (entry.access === "edit") return "edit";
      if (entry.access === "view" && best === "none") best = "view";
    }
  }
  return best;
}
