"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Clock, Lock, Pencil, Eye, ChevronRight, X, Check, Users, Shield } from "lucide-react";
import { SpreadsheetDoc, DocAccessEntry, Role, ROLE_META, ROLE_ORDER, CURRENT_USER_ID } from "@/lib/mock-data";
import { getDocAccess } from "@/lib/permissions";
import { Spreadsheet } from "@/components/spreadsheet";
import { useAppStore } from "@/lib/store";
import { useWorkspace, usePermission, usePermissionStatus } from "@/lib/workspace-context";
import { NoAccess } from "@/components/no-access";
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
} from "@/actions/documents";
import { Trash2 } from "lucide-react";

import { ShareModal } from "@/components/share-modal";

export default function DocumentsPage() {
  const { workspace } = useWorkspace();
  const wsId = workspace?.id;
  const viewStatus = usePermissionStatus("documents.view");
  const canCreate = usePermission("documents.create");
  const canEditPerm = usePermission("documents.edit");
  const canDelete = usePermission("documents.delete");

  const allDocs = useAppStore((s) => s.documents);
  const docs = allDocs.filter((d) => getDocAccess(d) !== "none");
  const projects = useAppStore((s) => s.projects);
  const setDocuments = useAppStore((s) => s.setDocuments);
  const addDoc = useAppStore((s) => s.addDoc);
  const updateDoc = useAppStore((s) => s.updateDoc);
  const deleteDoc = useAppStore((s) => s.deleteDoc);

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [shareModal,  setShareModal]  = useState(false);
  const [loading,     setLoading]     = useState(false);

  // Track which workspace is currently loaded so async results from a previous
  // workspace can't overwrite the store after a switch.
  const loadedWsRef = useRef<string | null>(null);
  // Pending debounced save timers, keyed by document id.
  const saveTimersRef = useRef<Record<string, any>>({});

  // Reload documents from the backend whenever the active workspace changes.
  useEffect(() => {
    if (!wsId) return;
    let cancelled = false;
    loadedWsRef.current = wsId;
    setLoading(true);
    setActiveDocId(null);
    setDocuments([]);
    listDocuments(wsId).then((list) => {
      if (cancelled || loadedWsRef.current !== wsId) return;
      setDocuments(list);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [wsId, setDocuments]);

  // Flush any pending debounced saves when the page unmounts so edits aren't lost.
  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const activeDoc  = docs.find((d) => d.id === activeDocId) ?? null;
  const canEdit    = activeDoc ? getDocAccess(activeDoc) === "edit" : false;
  const access     = activeDoc ? getDocAccess(activeDoc) : "none";

  // Debounced server-side persistence for document edits.
  const scheduleSave = (doc: SpreadsheetDoc) => {
    if (saveTimersRef.current[doc.id]) clearTimeout(saveTimersRef.current[doc.id]);
    saveTimersRef.current[doc.id] = setTimeout(async () => {
      const res = await updateDocument(doc.id, doc);
      if ("doc" in res && res.doc) {
        // Reflect server-side updatedAt without overwriting any in-flight local edits.
        updateDoc({ ...doc, updatedAt: res.doc.updatedAt });
      } else if ("error" in res) {
        console.error("[documents] save failed:", res.error);
      }
    }, 600);
  };

  const handleDocChange = (next: SpreadsheetDoc) => {
    updateDoc(next);          // optimistic
    scheduleSave(next);       // debounced server save
  };

  const createDoc = async () => {
    if (!wsId) return;
    const draft: SpreadsheetDoc = {
      id: `tmp-${Date.now()}`,
      title: "Новый документ",
      icon: "📄",
      columns: [],
      rows: [],
      defaultAccess: "edit",
      accessList: [{ kind: "member", memberId: CURRENT_USER_ID, access: "edit" }],
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: "Только что",
    };
    const res = await createDocument(wsId, draft);
    if ("error" in res) {
      console.error("[documents] create failed:", res.error);
      return;
    }
    addDoc(res.doc);
    setActiveDocId(res.doc.id);
  };

  const handleDelete = async (docId: string) => {
    deleteDoc(docId);                     // optimistic
    if (activeDocId === docId) setActiveDocId(null);
    const res = await deleteDocument(docId);
    if ("error" in res) {
      console.error("[documents] delete failed:", res.error);
      // Refetch to recover from a failed delete.
      if (wsId) listDocuments(wsId).then(setDocuments);
    }
  };

  if (viewStatus === "loading") return null;
  if (viewStatus === "denied")  return <NoAccess />;

  // ── Document list ─────────────────────────────────────────────────────────────
  if (!activeDoc) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">{docs.length} документов</div>
          {canCreate && (
            <button
              onClick={createDoc}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Создать документ</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-auto custom-scrollbar pb-4">
          {docs.map((doc) => {
            const acc = getDocAccess(doc);
            const project = projects.find((p) => p.id === doc.projectId);
            return (
              <div
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                role="button"
                className="text-left bg-[#111111] border border-border hover:border-primary/30 rounded-xl p-4 cursor-pointer group transition-all hover:shadow-lg hover:shadow-primary/5 block w-full"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">{doc.icon}</div>
                  <div className="flex items-center gap-1.5">
                    {acc === "edit" ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                        <Pencil className="w-2.5 h-2.5" /> Редактирование
                      </span>
                    ) : acc === "view" ? (
                      <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded-full">
                        <Eye className="w-2.5 h-2.5" /> Просмотр
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Нет доступа
                      </span>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        className="ml-1 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-red-400/10 hover:text-red-400 transition-colors"
                        title="Удалить документ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                  {doc.title}
                </h3>

                {project && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={`w-2 h-2 rounded-full ${project.color}`} />
                    <span className="text-xs text-muted-foreground">{project.name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {doc.updatedAt}
                  </span>
                  <span>{doc.rows.length} строк · {doc.columns.length} кол.</span>
                </div>
              </div>
            );
          })}

          {canCreate && (
            <button
              onClick={createDoc}
              className="flex flex-col items-center justify-center bg-[#111111] border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-5 min-h-[130px] text-muted-foreground hover:text-primary transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center mb-2">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">Новый документ</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Spreadsheet view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 -m-4 md:-m-6 lg:-m-8">
      {shareModal && (
        <ShareModal
          title={activeDoc.title}
          defaultAccess={activeDoc.defaultAccess}
          accessList={activeDoc.accessList}
          onUpdate={(data) => {
            handleDocChange({
              ...activeDoc,
              defaultAccess: data.defaultAccess,
              accessList: data.accessList,
              ...(data.title !== undefined ? { title: data.title } : {}),
            });
          }}
          onClose={() => setShareModal(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-[#111111] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveDocId(null)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Документы
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{activeDoc.icon} {activeDoc.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Read-only badge (only when user actually can't edit) */}
          {access !== "edit" && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
              <Eye className="w-3 h-3" /> Только просмотр
            </span>
          )}

          <button
            onClick={() => setShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border hover:border-primary/40 rounded-lg text-sm text-foreground transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Редактирование
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden">
        <Spreadsheet
          doc={activeDoc}
          canEdit={canEdit}
          onChange={handleDocChange}
        />
      </div>
    </div>
  );
}
