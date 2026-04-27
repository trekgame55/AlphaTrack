"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getUserWorkspace, getUserWorkspaces } from "@/actions/workspace";
import { listContacts, listTags } from "@/actions/contacts";
import { useStatusStore } from "@/lib/statuses";

export type WsUser = {
  id: string;
  name: string;
  initials: string;
  color: string;
  email: string;
};

export type WsMember = {
  id: string;
  userId: string;
  role: string;
  user: WsUser;
};

export type WsTag = {
  id: string;
  label: string;
  color: string;
};

export type WsPhone = { id: string; label: string; number: string };
export type WsContact = {
  id: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  email?: string | null;
  color: string;
  phones: WsPhone[];
};

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  members: WsMember[];
  tags: WsTag[];
  myRole?: string;
  myPermissions?: Record<string, boolean>;
};

type WorkspaceCtx = {
  workspace: Workspace | null;
  userWorkspaces: { id: string; name: string; slug: string }[];
  currentUser: WsUser | null;
  myRole: string;
  myPermissions: Record<string, boolean>;
  contacts: WsContact[];
  tags: WsTag[];
  loading: boolean;
  refresh: () => void;
  setContacts: (c: WsContact[]) => void;
  setTags: (t: WsTag[]) => void;
  switchWorkspace: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceCtx>({
  workspace: null,
  userWorkspaces: [],
  currentUser: null,
  myRole: "viewer",
  myPermissions: {},
  contacts: [],
  tags: [],
  loading: true,
  refresh: () => {},
  setContacts: () => {},
  setTags: () => {},
  switchWorkspace: () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/** Returns true if the current user has the given permission key in the active workspace.
 *  Owner/admin always return true. Unknown roles default to false. */
export function usePermission(key: string): boolean {
  const { myRole, myPermissions } = useContext(WorkspaceContext);
  if (myRole === "admin_plus" || myRole === "admin") return true;
  return Boolean(myPermissions?.[key]);
}

export function WorkspaceProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [workspace,        setWorkspace]        = useState<Workspace | null>(null);
  const [userWorkspaces,   setUserWorkspaces]   = useState<{ id: string; name: string; slug: string }[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [contacts,  setContacts]  = useState<WsContact[]>([]);
  const [tags,      setTags]      = useState<WsTag[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tick,      setTick]      = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  const switchWorkspace = useCallback((id: string) => {
    setWorkspace(null);
    setContacts([]);
    setTags([]);
    setActiveWorkspaceId(id);
    if (typeof window !== "undefined") localStorage.setItem("alphatrack_active_ws", id);
    setTick(t => t + 1);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("alphatrack_active_ws");
      if (saved) setActiveWorkspaceId(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hydrateStatuses = useStatusStore((s) => s.hydrate);
  useEffect(() => {
    if (activeWorkspaceId) hydrateStatuses(activeWorkspaceId);
  }, [activeWorkspaceId, hydrateStatuses]);

  // Load workspace meta + contacts + tags whenever workspace/tick changes
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getUserWorkspace(activeWorkspaceId || undefined),
      getUserWorkspaces(),
    ]).then(async ([ws, allWs]) => {
      setUserWorkspaces(
        (allWs as any[]).map(w => ({ id: w.id, name: w.name, slug: w.slug || w.id }))
      );
      if (!ws) { setLoading(false); return; }

      setWorkspace(ws as unknown as Workspace);

      const wsId = (ws as any).id;
      const [conts, tgs] = await Promise.all([
        listContacts(wsId),
        listTags(wsId),
      ]);
      setContacts(conts as unknown as WsContact[]);
      setTags(tgs as unknown as WsTag[]);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, activeWorkspaceId]);

  const currentUser    = workspace?.members.find(m => m.userId === userId)?.user ?? null;
  const myRole         = workspace?.myRole ?? workspace?.members.find(m => m.userId === userId)?.role ?? "viewer";
  const myPermissions  = workspace?.myPermissions ?? {};

  return (
    <WorkspaceContext.Provider value={{
      workspace, userWorkspaces, currentUser, myRole, myPermissions,
      contacts, tags, loading,
      refresh, setContacts, setTags, switchWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
