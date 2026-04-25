import { create } from 'zustand';
import { Task, SpreadsheetDoc, Contact, Project, Member, Role, RoleConfig, DEFAULT_ROLE_PERMISSIONS } from './mock-data';

interface AppState {
  tasks: Task[];
  documents: SpreadsheetDoc[];
  contacts: Contact[];
  projects: Project[];
  members: Member[];
  rolePermissions: Record<Role, RoleConfig>;

  // Task actions
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;

  // Document actions
  addDoc: (doc: SpreadsheetDoc) => void;
  updateDoc: (doc: SpreadsheetDoc) => void;
  deleteDoc: (id: string) => void;

  // Contact actions
  addContact: (contact: Contact) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;

  // Project actions
  addProject: (project: Project) => void;
  updateProject: (project: Project) => void;
  deleteProject: (id: string) => void;

  // Member actions
  addMember: (member: Member) => void;
  updateMember: (member: Member) => void;
  deleteMember: (id: string) => void;

  // Role actions
  updateRolePermissions: (role: Role, config: Partial<RoleConfig>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tasks: [],
  documents: [],
  contacts: [],
  projects: [],
  members: [],
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (updated) => set((state) => ({
    tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t))
  })),
  deleteTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id)
  })),

  addDoc: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  updateDoc: (updated) => set((state) => ({
    documents: state.documents.map((d) => (d.id === updated.id ? updated : d))
  })),
  deleteDoc: (id) => set((state) => ({
    documents: state.documents.filter((d) => d.id !== id)
  })),

  addContact: (contact) => set((state) => ({ contacts: [contact, ...state.contacts] })),
  updateContact: (updated) => set((state) => ({
    contacts: state.contacts.map((c) => (c.id === updated.id ? updated : c))
  })),
  deleteContact: (id) => set((state) => ({
    contacts: state.contacts.filter((c) => c.id !== id)
  })),

  addProject: (project) => set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (updated) => set((state) => ({
    projects: state.projects.map((p) => (p.id === updated.id ? updated : p))
  })),
  deleteProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id)
  })),

  addMember: (member) => set((state) => ({ members: [...state.members, member] })),
  updateMember: (updated) => set((state) => ({
    members: state.members.map((m) => (m.id === updated.id ? updated : m))
  })),
  deleteMember: (id) => set((state) => ({
    members: state.members.filter((m) => m.id !== id)
  })),

  updateRolePermissions: (role, config) => set((state) => ({
    rolePermissions: {
      ...state.rolePermissions,
      [role]: { ...state.rolePermissions[role], ...config }
    }
  })),
}));
