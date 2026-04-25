"use client";

import { useState } from "react";
import { Plus, Clock, Lock, Pencil, Eye, ChevronRight, X, Check, Users, Shield } from "lucide-react";
import { SpreadsheetDoc, DocAccessEntry, Role, ROLE_META, ROLE_ORDER, CURRENT_USER_ID } from "@/lib/mock-data";
import { getDocAccess } from "@/lib/permissions";
import { Spreadsheet } from "@/components/spreadsheet";
import { useAppStore } from "@/lib/store";
import { Trash2 } from "lucide-react";

import { ShareModal } from "@/components/share-modal";

export default function DocumentsPage() {
  const docs = useAppStore((s) => s.documents).filter((d) => getDocAccess(d) !== "none");
  const projects = useAppStore((s) => s.projects);
  const addDoc = useAppStore((s) => s.addDoc);
  const updateDoc = useAppStore((s) => s.updateDoc);
  const deleteDoc = useAppStore((s) => s.deleteDoc);

  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [shareModal,  setShareModal]  = useState(false);

  const activeDoc  = docs.find((d) => d.id === activeDocId) ?? null;
  const canEdit    = activeDoc ? getDocAccess(activeDoc) === "edit" : false;
  const access     = activeDoc ? getDocAccess(activeDoc) : "none";

  const createDoc = () => {
    const id = `doc-${Date.now()}`;
    const newDoc: SpreadsheetDoc = {
      id,
      title: "Новый документ",
      icon: "📄",
      columns: [
        { id: "c1", name: "Название",  type: "text",   width: 220 },
        { id: "c2", name: "Статус",    type: "status", width: 150, options: ["Активно","Готово","Отложено"] },
        { id: "c3", name: "Заметки",   type: "text",   width: 260 },
      ],
      rows: [
        { id: "r1", cells: { c1: "", c2: "", c3: "" } },
      ],
      defaultAccess: "edit",
      accessList: [{ kind: "member", memberId: CURRENT_USER_ID, access: "edit" }],
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: "Только что",
    };
    addDoc(newDoc);
    setActiveDocId(id);
  };

  // ── Document list ─────────────────────────────────────────────────────────────
  if (!activeDoc) {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-muted-foreground">{docs.length} документов</div>
          <button
            onClick={createDoc}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Создать документ</span>
          </button>
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDoc(doc.id);
                      }}
                      className="ml-1 w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-red-400/10 hover:text-red-400 transition-colors"
                      title="Удалить документ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

          <button
            onClick={createDoc}
            className="flex flex-col items-center justify-center bg-[#111111] border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-5 min-h-[130px] text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current flex items-center justify-center mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Новый документ</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Spreadsheet view ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300 -m-4 md:-m-6 lg:-m-8">
      {shareModal && (
        <ShareModal
          defaultAccess={activeDoc.defaultAccess}
          accessList={activeDoc.accessList}
          onUpdate={(data) => { updateDoc({ ...activeDoc, ...data }); }}
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
          {/* Access badge */}
          {access === "edit" ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
              <Pencil className="w-3 h-3" /> Редактирование
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full">
              <Eye className="w-3 h-3" /> Только просмотр
            </span>
          )}

          <button
            onClick={() => setShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border hover:border-primary/40 rounded-lg text-sm text-foreground transition-colors"
          >
            <Users className="w-4 h-4" />
            Доступ
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-hidden">
        <Spreadsheet
          doc={activeDoc}
          canEdit={canEdit}
          onChange={updateDoc}
        />
      </div>
    </div>
  );
}
