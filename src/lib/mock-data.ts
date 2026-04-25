// ─── Base Types ───────────────────────────────────────────────────────────────

export type Priority = "high" | "medium" | "low" | "none";
export type Status   = "backlog" | "todo" | "in_progress" | "review" | "done";

// ─── Roles ────────────────────────────────────────────────────────────────────

export type Role = "admin_plus" | "admin" | "member" | "viewer";

export const ROLE_META: Record<Role, { label: string; color: string; description: string }> = {
  admin_plus: { label: "Администратор+", color: "text-amber-400 bg-amber-400/10",  description: "Полный доступ, управление ролями" },
  admin:      { label: "Администратор",  color: "text-violet-400 bg-violet-400/10", description: "Управление задачами и участниками" },
  member:     { label: "Участник",       color: "text-blue-400 bg-blue-400/10",     description: "Создание и редактирование задач" },
  viewer:     { label: "Читатель",       color: "text-slate-400 bg-slate-400/10",   description: "Только просмотр" },
};

export const ROLE_ORDER: Role[] = ["admin_plus", "admin", "member", "viewer"];

export type RoleConfig = {
  canEditTask: boolean;
  canCompleteTask: boolean;
  canManageMembers: boolean;
  canChangeRoles: boolean;
};

// Global permissions matrix default values
export const DEFAULT_ROLE_PERMISSIONS: Record<Role, RoleConfig> = {
  admin_plus: { canEditTask: true,  canCompleteTask: true,  canManageMembers: true,  canChangeRoles: true  },
  admin:      { canEditTask: true,  canCompleteTask: true,  canManageMembers: true,  canChangeRoles: false },
  member:     { canEditTask: true,  canCompleteTask: false, canManageMembers: false, canChangeRoles: false },
  viewer:     { canEditTask: false, canCompleteTask: false, canManageMembers: false, canChangeRoles: false },
};

// ─── Members ──────────────────────────────────────────────────────────────────

export type Member = {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
  globalRole?: Role;
};

export type ProjectMember = {
  member: Member;
  role: Role;
};

export const MEMBERS: Member[] = [];

/** The currently logged-in user (mock) */
export const CURRENT_USER_ID = "u1";
export const CURRENT_USER: Member = { id: "u1", name: "Ivan Petrov", initials: "IP", color: "bg-violet-500", email: "ivan@flowdesk.app", globalRole: "admin_plus" };

// ─── Tags ─────────────────────────────────────────────────────────────────────

export type Tag = {
  id: string;
  label: string;
  color: string;
};

export const TAGS: Tag[] = [];

// ─── Comments ─────────────────────────────────────────────────────────────────

export type Comment = {
  id: string;
  author: Member;
  text: string;
  createdAt: string;
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type Task = {
  id: string;
  title: string;
  description?: string;
  status: Status;
  priority: Priority;
  startDate?: string;
  dueDate?: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  assignees: Member[];
  contactId?: string;
  tags: Tag[];
  comments: Comment[];
  createdAt: string;
  group: "Today" | "Tomorrow" | "Later" | "No date";
  defaultAccess?: "view" | "edit" | "none";
  accessList?: DocAccessEntry[];
};

// ─── Projects ─────────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  name: string;
  color: string;
  taskCount: number;
  members: ProjectMember[];
};

export const PROJECTS: Project[] = [];

// ─── Date helpers ─────────────────────────────────────────────────────────────

const today    = new Date();
const fmt      = (d: Date) => d.toISOString().split("T")[0];
const addDays  = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

export const todayStr    = fmt(today);
export const tomorrowStr = fmt(addDays(today, 1));

export const getWeekDays = () => {
  const day  = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = addDays(today, diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(mon, i);
    return { date: d, label: d.toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" }), isToday: fmt(d) === todayStr };
  });
};

// ─── Mock Tasks ───────────────────────────────────────────────────────────────

export const MOCK_TASKS: Task[] = [
  {
    id: "W-101", title: "Реализовать дизайн-систему", description: "Настроить токены цветов, шрифты, радиусы и shadow-levels согласно Weeek UI Kit.",
    status: "in_progress", priority: "high", dueDate: todayStr,
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[0], MEMBERS[2]], tags: [TAGS[0], TAGS[2]], comments: [], createdAt: "2026-04-10", group: "Today",
  },
  {
    id: "W-102", title: "Настроить Tailwind и shadcn/ui", description: "Подключить shadcn/ui, настроить плагины.",
    status: "done", priority: "medium", dueDate: todayStr,
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[0]], tags: [TAGS[5]], comments: [
      { id: "c1", author: MEMBERS[1], text: "Отлично, всё работает!", createdAt: "Сегодня" }
    ], createdAt: "2026-04-11", group: "Today",
  },
  {
    id: "M-42", title: "Ревью маркетинговых материалов", description: "",
    status: "todo", priority: "low", dueDate: tomorrowStr,
    projectId: "p2", projectName: "Marketing", projectColor: "bg-blue-500",
    assignees: [MEMBERS[1], MEMBERS[3]], tags: [TAGS[3]], comments: [], createdAt: "2026-04-12", group: "Tomorrow",
  },
  {
    id: "W-103", title: "Сделать Kanban board", description: "Реализовать колонки с drag and drop через dnd-kit.",
    status: "todo", priority: "high", dueDate: tomorrowStr,
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[0], MEMBERS[1]], tags: [TAGS[0]], comments: [], createdAt: "2026-04-12", group: "Tomorrow",
  },
  {
    id: "W-104", title: "Интеграция с Prisma / SQLite", description: "Подключить реальную БД, server actions для задач.",
    status: "todo", priority: "high", dueDate: fmt(addDays(today, 3)),
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[0]], tags: [TAGS[1]], comments: [], createdAt: "2026-04-13", group: "Later",
  },
  {
    id: "MB-01", title: "UI для мобильного приложения", description: "",
    status: "backlog", priority: "medium", dueDate: fmt(addDays(today, 5)),
    projectId: "p3", projectName: "Mobile App", projectColor: "bg-emerald-500",
    assignees: [MEMBERS[2], MEMBERS[0]], tags: [TAGS[2], TAGS[0]], comments: [], createdAt: "2026-04-14", group: "Later",
  },
  {
    id: "W-105", title: "Weekly planner view", description: "Сетка недели с drag-and-drop задач между днями.",
    status: "in_progress", priority: "high", dueDate: todayStr,
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[0], MEMBERS[1], MEMBERS[2]], tags: [TAGS[0]], comments: [], createdAt: "2026-04-15", group: "Today",
  },
  {
    id: "W-106", title: "Task detail modal", description: "Полный drawer с полями задачи, комментариями и историей.",
    status: "todo", priority: "medium", dueDate: fmt(addDays(today, 2)),
    projectId: "p1", projectName: "Weeek Clone", projectColor: "bg-purple-500",
    assignees: [MEMBERS[3], MEMBERS[0]], tags: [TAGS[0], TAGS[2]], comments: [], createdAt: "2026-04-15", group: "Later",
  },
  {
    id: "M-43", title: "SEO-оптимизация лендинга",
    status: "backlog", priority: "low",
    projectId: "p2", projectName: "Marketing", projectColor: "bg-blue-500",
    assignees: [MEMBERS[1]], tags: [], comments: [], createdAt: "2026-04-16", group: "No date",
  },
];

// ─── Spreadsheet Documents ────────────────────────────────────────────────────

export type CellType = "text" | "number" | "select" | "date" | "status" | "person";

export type SpreadsheetColumn = {
  id: string;
  name: string;
  type: CellType;
  options?: string[];
  width: number;
};

export type SpreadsheetRow = {
  id: string;
  cells: Record<string, string>;
};

export type DocAccessEntry = {
  kind: "member" | "role";
  memberId?: string;
  role?: Role;
  access: "view" | "edit" | "none";
};

export type SpreadsheetDoc = {
  id: string;
  title: string;
  icon: string;
  projectId?: string;
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  defaultAccess: "view" | "edit" | "none";
  accessList: DocAccessEntry[];
  createdAt: string;
  updatedAt: string;
};

export const MOCK_DOCS: SpreadsheetDoc[] = [
  {
    id: "doc-1",
    title: "Архитектура продукта",
    icon: "📐",
    projectId: "p1",
    columns: [
      { id: "c1", name: "Компонент",    type: "text",   width: 200 },
      { id: "c2", name: "Тип",          type: "select", options: ["Frontend","Backend","Database","DevOps"], width: 140 },
      { id: "c3", name: "Ответственный",type: "person", width: 160 },
      { id: "c4", name: "Дата",         type: "date",   width: 130 },
      { id: "c5", name: "Статус",       type: "status", options: ["Запланировано","В работе","Готово","Отложено"], width: 150 },
      { id: "c6", name: "Приоритет",    type: "number", width: 110 },
      { id: "c7", name: "Заметки",      type: "text",   width: 260 },
    ],
    rows: [
      { id: "r1", cells: { c1: "Auth Service",      c2: "Backend",  c3: "u1", c4: fmt(addDays(today, 7)),  c5: "В работе",     c6: "1", c7: "JWT + bcrypt"           } },
      { id: "r2", cells: { c1: "Task Module",       c2: "Backend",  c3: "u2", c4: fmt(addDays(today, 14)), c5: "Запланировано",c6: "2", c7: "CRUD + фильтры"         } },
      { id: "r3", cells: { c1: "UI Components",     c2: "Frontend", c3: "u3", c4: fmt(addDays(today, 3)),  c5: "Готово",       c6: "3", c7: "shadcn/ui + Tailwind"   } },
      { id: "r4", cells: { c1: "Database Schema",   c2: "Database", c3: "u1", c4: fmt(addDays(today, 2)),  c5: "Готово",       c6: "1", c7: "Prisma + SQLite"        } },
      { id: "r5", cells: { c1: "CI/CD Pipeline",    c2: "DevOps",   c3: "u4", c4: fmt(addDays(today, 21)), c5: "Запланировано",c6: "4", c7: "GitHub Actions"         } },
      { id: "r6", cells: { c1: "Mobile Responsive", c2: "Frontend", c3: "u3", c4: fmt(addDays(today, 10)), c5: "В работе",     c6: "2", c7: "Breakpoints + Swipe"   } },
    ],
    defaultAccess: "view",
    accessList: [
      { kind: "member", memberId: "u1", access: "edit" },
      { kind: "member", memberId: "u2", access: "edit" },
      { kind: "role",   role: "viewer", access: "view" },
    ],
    createdAt: "2026-04-10",
    updatedAt: "Вчера",
  },
  {
    id: "doc-2",
    title: "Дизайн-система",
    icon: "🎨",
    projectId: "p1",
    columns: [
      { id: "c1", name: "Компонент",    type: "text",   width: 180 },
      { id: "c2", name: "Категория",    type: "select", options: ["Цвет","Типографика","Компонент","Иконки","Спейсинг"], width: 150 },
      { id: "c3", name: "Токен",        type: "text",   width: 200 },
      { id: "c4", name: "Значение",     type: "text",   width: 180 },
      { id: "c5", name: "Статус",       type: "status", options: ["Черновик","Утверждено","Deprecated"], width: 140 },
    ],
    rows: [
      { id: "r1", cells: { c1: "Primary Color",   c2: "Цвет",       c3: "--color-primary",   c4: "#6366f1", c5: "Утверждено" } },
      { id: "r2", cells: { c1: "Background",      c2: "Цвет",       c3: "--color-bg",        c4: "#0f0f0f", c5: "Утверждено" } },
      { id: "r3", cells: { c1: "Font Sans",       c2: "Типографика",c3: "--font-sans",        c4: "Satoshi", c5: "Утверждено" } },
      { id: "r4", cells: { c1: "Button Primary",  c2: "Компонент",  c3: ".btn-primary",      c4: "bg-primary text-white", c5: "Утверждено" } },
      { id: "r5", cells: { c1: "Radius MD",       c2: "Спейсинг",   c3: "--radius-md",       c4: "10px",    c5: "Черновик"  } },
    ],
    defaultAccess: "none",
    accessList: [
      { kind: "role",   role: "admin_plus", access: "edit" },
      { kind: "role",   role: "admin",      access: "edit" },
      { kind: "role",   role: "member",     access: "view" },
    ],
    createdAt: "2026-04-11",
    updatedAt: "3 дня назад",
  },
  {
    id: "doc-3",
    title: "Roadmap Q2 2026",
    icon: "🗺️",
    projectId: "p1",
    columns: [
      { id: "c1", name: "Фича",         type: "text",   width: 220 },
      { id: "c2", name: "Спринт",       type: "select", options: ["Sprint 1","Sprint 2","Sprint 3","Sprint 4"], width: 130 },
      { id: "c3", name: "Исполнитель",  type: "person", width: 160 },
      { id: "c4", name: "Эстимат (h)",  type: "number", width: 120 },
      { id: "c5", name: "Статус",       type: "status", options: ["Идея","Готово к работе","В работе","Готово"], width: 160 },
      { id: "c6", name: "Дедлайн",      type: "date",   width: 130 },
    ],
    rows: [
      { id: "r1", cells: { c1: "Drag & Drop",       c2: "Sprint 1", c3: "u1", c4: "16", c5: "Готово",           c6: fmt(addDays(today, -5)) } },
      { id: "r2", cells: { c1: "Weekly Planner",    c2: "Sprint 1", c3: "u1", c4: "24", c5: "Готово",           c6: fmt(addDays(today, -2)) } },
      { id: "r3", cells: { c1: "Role System",       c2: "Sprint 2", c3: "u2", c4: "20", c5: "В работе",         c6: fmt(addDays(today, 7))  } },
      { id: "r4", cells: { c1: "Document Sheets",   c2: "Sprint 2", c3: "u3", c4: "32", c5: "В работе",         c6: fmt(addDays(today, 14)) } },
      { id: "r5", cells: { c1: "Notifications",     c2: "Sprint 3", c3: "u4", c4: "12", c5: "Идея",             c6: fmt(addDays(today, 28)) } },
      { id: "r6", cells: { c1: "Mobile App",        c2: "Sprint 4", c3: "u3", c4: "80", c5: "Идея",             c6: fmt(addDays(today, 56)) } },
    ],
    defaultAccess: "view",
    accessList: [
      { kind: "member", memberId: "u1", access: "edit" },
      { kind: "member", memberId: "u2", access: "edit" },
    ],
    createdAt: "2026-04-12",
    updatedAt: "Сегодня",
  },
];

// ─── Contacts ─────────────────────────────────────────────────────────────────

export type ContactPhone = {
  label: string;     // "Рабочий", "Мобильный", "Домашний"
  number: string;    // raw: +37385635380 or 07567465
};

export type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phones: ContactPhone[];
  color: string;     // avatar bg color
  createdAt: string;
};

export const MOCK_CONTACTS: Contact[] = [];

