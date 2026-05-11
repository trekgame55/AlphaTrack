/**
 * Python Backend API Client
 * All data is stored in Python SQLite via FastAPI at port 8000.
 * Used by Next.js server actions instead of Prisma.
 */

const BASE = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function req<T = any>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
  params?: Record<string, string>,
): Promise<T> {
  let url = `${BASE}/api${path}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) url += "?" + qs;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["x-session-token"] = token;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail ?? j.error ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    checkEmail: (email: string) =>
      req<{ exists: boolean }>("GET", "/auth/check-email", undefined, undefined, { email }),

    register: (name: string, email: string, password: string) =>
      req<{ token: string; user: UserDTO }>("POST", "/auth/register", undefined, { name, email, password }),

    login: (email: string, password: string) =>
      req<{ token: string; user: UserDTO }>("POST", "/auth/login", undefined, { email, password }),

    logout: (token: string) =>
      req("POST", "/auth/logout", token),

    me: (token: string) =>
      req<UserDTO>("GET", "/auth/me", token),

    updateProfile: (token: string, data: { name?: string; password?: string; new_password?: string }) =>
      req<{ ok: boolean }>("PATCH", "/auth/me", token, data),
  },

  workspaces: {
    list: (token: string) =>
      req<WorkspaceShortDTO[]>("GET", "/workspaces", token),

    listAll: (token: string) =>
      req<WorkspaceShortDTO[]>("GET", "/workspaces/all", token),

    current: (token: string, workspaceId?: string) =>
      req<WorkspaceDTO>("GET", "/workspaces/current", token, undefined,
        workspaceId ? { workspace_id: workspaceId } : undefined),

    create: (token: string, name: string) =>
      req<WorkspaceDTO>("POST", "/workspaces", token, { name }),

    members: (token: string, workspaceId: string) =>
      req<MemberDTO[]>("GET", `/workspaces/${workspaceId}/members`, token),

    removeMember: (token: string, workspaceId: string, memberId: string) =>
      req("DELETE", `/workspaces/${workspaceId}/members/${memberId}`, token),

    generateInvite: (token: string, workspaceId: string) =>
      req<{ link: string }>("POST", `/workspaces/${workspaceId}/invite`, token),

    acceptInvite: (token: string, inviteToken: string) =>
      req<{ workspaceId: string }>("POST", "/workspaces/accept-invite", token, undefined,
        { token: inviteToken }),
  },

  tasks: {
    list: (token: string, workspaceId: string) =>
      req<TaskDTO[]>("GET", "/tasks", token, undefined, { workspace_id: workspaceId }),

    create: (token: string, data: {
      title: string; workspaceId: string; group: string;
      dueDate?: string; projectId?: string; assigneeIds?: string[];
    }) => req<{ task: TaskDTO }>("POST", "/tasks", token, {
      title: data.title,
      workspaceId: data.workspaceId,
      group: data.group,
      dueDate: data.dueDate,
      projectId: data.projectId,
      assigneeIds: data.assigneeIds ?? [],
    }),

    update: (token: string, taskId: string, data: Partial<{
      title: string; description: string; status: string; priority: string;
      dueDate: string | null; startDate: string | null; group: string;
      contactId: string | null; assigneeIds: string[]; tagIds: string[];
    }>) => req<{ task: TaskDTO }>("PUT", `/tasks/${taskId}`, token, data),

    delete: (token: string, taskId: string) =>
      req("DELETE", `/tasks/${taskId}`, token),

    addComment: (token: string, taskId: string, text: string) =>
      req<{ comment: CommentDTO }>("POST", `/tasks/${taskId}/comments`, token, { text }),
  },

  contacts: {
    list: (token: string, workspaceId: string) =>
      req<ContactDTO[]>("GET", "/contacts", token, undefined, { workspace_id: workspaceId }),

    create: (token: string, workspaceId: string, data: {
      firstName: string; lastName?: string; company?: string;
      email?: string; color?: string; phones?: PhoneIn[];
    }) => req<ContactDTO>("POST", "/contacts", token, data, { workspace_id: workspaceId }),

    update: (token: string, contactId: string, data: Partial<{
      firstName: string; lastName: string; company: string;
      email: string; phones: PhoneIn[];
    }>) => req<ContactDTO>("PUT", `/contacts/${contactId}`, token, data),

    delete: (token: string, contactId: string) =>
      req("DELETE", `/contacts/${contactId}`, token),
  },

  tags: {
    list: (token: string, workspaceId: string) =>
      req<TagDTO[]>("GET", "/tags", token, undefined, { workspace_id: workspaceId }),

    create: (token: string, workspaceId: string, label: string, color: string) =>
      req<TagDTO>("POST", "/tags", token, { label, color }, { workspace_id: workspaceId }),

    delete: (token: string, tagId: string) =>
      req("DELETE", `/tags/${tagId}`, token),
  },

  documents: {
    list: (token: string, workspaceId: string) =>
      req<DocumentDTO[]>("GET", "/documents", token, undefined, { workspace_id: workspaceId }),

    get: (token: string, docId: string) =>
      req<DocumentDTO>("GET", `/documents/${docId}`, token),

    create: (token: string, workspaceId: string, data: { title?: string; content?: string; icon?: string }) =>
      req<DocumentDTO>("POST", "/documents", token, data, { workspace_id: workspaceId }),

    update: (token: string, docId: string, data: Partial<{ title: string; content: string; icon: string }>) =>
      req<DocumentDTO>("PUT", `/documents/${docId}`, token, data),

    delete: (token: string, docId: string) =>
      req("DELETE", `/documents/${docId}`, token),
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserDTO {
  id: string; name: string; email: string; initials: string; color: string;
}
export interface WorkspaceShortDTO {
  id: string; name: string; slug: string;
}
export interface MemberDTO {
  id: string; userId: string; role: string; user: UserDTO;
}
export interface TagDTO {
  id: string; label: string; color: string;
}
export interface WorkspaceDTO {
  id: string; slug: string; name: string; ownerId: string;
  members: MemberDTO[];
  tags: TagDTO[];
}
export interface PhoneIn {
  label: string; number: string;
}
export interface PhoneDTO {
  id: string; label: string; number: string;
}
export interface ContactDTO {
  id: string; firstName: string; lastName: string;
  company?: string; email?: string; color: string;
  workspaceId: string; phones: PhoneDTO[];
  createdAt: string;
}
export interface AssigneeDTO {
  user: UserDTO;
}
export interface TaskTagDTO {
  tag: TagDTO;
}
export interface CommentDTO {
  id: string; text: string; createdAt: string; author: UserDTO;
}
export interface TaskDTO {
  id: string; title: string; description?: string;
  status: string; priority: string;
  startDate?: string; dueDate?: string; group: string;
  workspaceId: string; projectId?: string; contactId?: string;
  assignees: AssigneeDTO[];
  tags: TaskTagDTO[];
  comments: CommentDTO[];
  createdAt: string;
  project?: { id: string; name: string; color: string } | null;
  contact?: ContactDTO | null;
}
export interface DocumentDTO {
  id: string; title: string; content?: string; icon?: string;
  workspaceId: string; authorId: string;
  createdAt: string; updatedAt: string;
}
