import { TaskDTO } from "./api";
import { Task, Status, Priority } from "./mock-data";

/**
 * Backend may return ISO datetime ("2026-04-18T00:00:00") — UI stores plain YYYY-MM-DD.
 * IMPORTANT: do NOT use new Date() + toISOString() — that converts naive datetime to UTC
 * and shifts the date by 1 day in non-UTC timezones (GMT+3 → -1 day).
 * We parse the string directly.
 */
function toDateOnly(v?: string | null): string | undefined {
  if (!v) return undefined;
  // Already YYYY-MM-DD or starts with it (e.g. "2026-04-18T00:00:00")
  const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  // Fallback for other formats — use LOCAL parts, not UTC
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Convert a TaskDTO from the FastAPI backend into the local Task shape used by the UI store.
 * If a task has no project, the workspace name is shown as a fallback so users see *which*
 * team the task belongs to instead of a meaningless "Нет проекта".
 */
export function dtoToTask(
  d: TaskDTO,
  workspaceFallback?: { id?: string; name?: string },
): Task {
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    status: ((d.status as Status) ?? "todo") as Status,
    priority: ((d.priority as Priority) ?? "none") as Priority,
    startDate: toDateOnly(d.startDate),
    dueDate: toDateOnly(d.dueDate),
    projectId: d.project?.id ?? workspaceFallback?.id ?? "",
    projectName: d.project?.name ?? workspaceFallback?.name ?? "Нет проекта",
    projectColor: d.project?.color ?? "bg-secondary",
    assignees: d.assignees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      initials: a.user.initials,
      color: a.user.color,
      email: a.user.email,
    })),
    contactId: d.contact?.id,
    tags: d.tags.map((t) => ({
      id: t.tag.id,
      label: t.tag.label,
      color: t.tag.color,
    })),
    comments: d.comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      author: {
        id: c.author.id,
        name: c.author.name,
        initials: c.author.initials,
        color: c.author.color,
        email: c.author.email,
      },
    })),
    createdAt: d.createdAt,
    group: ((d.group as Task["group"]) ?? "No date") as Task["group"],
  };
}
