"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, MoreHorizontal, Flag, GripVertical, X, Check, Trash2, Pencil } from "lucide-react";
import { Task, Priority } from "@/lib/mock-data";
import { TaskModal } from "@/components/task-modal";
import { useAppStore } from "@/lib/store";
import {
  useAllStatuses, useStatusStore, STATUS_COLOR_CLASSES, STATUS_COLOR_NAMES,
  type StatusColor, type StatusMeta,
} from "@/lib/statuses";
import { getTaskAccess } from "@/lib/permissions";
import {
  listTasks,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from "@/actions/tasks";
import { useWorkspace, usePermission, usePermissionStatus } from "@/lib/workspace-context";
import { NoAccess } from "@/components/no-access";
import { dtoToTask } from "@/lib/task-adapter";

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "text-red-400",
  medium: "text-yellow-400",
  low:    "text-blue-400",
  none:   "text-transparent",
};


export default function BoardPage() {
  const tasks = useAppStore((s) => s.tasks).filter((t) => getTaskAccess(t) !== "none");
  const projects = useAppStore((s) => s.projects);
  const setTasks = useAppStore((s) => s.setTasks);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const { workspace } = useWorkspace();
  const viewStatus = usePermissionStatus("tasks.view");
  const canEditTask = usePermission("tasks.edit");
  const allStatuses = useAllStatuses();
  const removeStatus = useStatusStore((s) => s.remove);
  const renameStatus = useStatusStore((s) => s.rename);
  const recolorStatus = useStatusStore((s) => s.recolor);
  const [statusModal, setStatusModal] = useState<null | { editing?: StatusMeta }>(null);

  // Load tasks from backend on mount / workspace change
  useEffect(() => {
    if (!workspace?.id) return;
    let cancelled = false;
    const wsCtx = { id: workspace.id, name: workspace.name };
    listTasks(workspace.id).then((dtos) => {
      if (cancelled) return;
      setTasks(dtos.map((d) => dtoToTask(d, wsCtx)));
    });
    return () => { cancelled = true; };
  }, [workspace?.id, setTasks]);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // ── Space + Left-Mouse drag-to-scroll ────────────────────────────────────────
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panRef = useRef<{ active: boolean; startX: number; startScroll: number }>({
    active: false, startX: 0, startScroll: 0,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        // Don't hijack space when typing in inputs/textareas/contenteditable
        const tgt = e.target as HTMLElement | null;
        if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
        if (!spaceHeld) setSpaceHeld(true);
        e.preventDefault(); // stop page scroll
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        panRef.current.active = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [spaceHeld]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!panRef.current.active || !scrollerRef.current) return;
      const dx = e.clientX - panRef.current.startX;
      // Drag left  (dx<0) → scroll right (scrollLeft increases).
      // Drag right (dx>0) → scroll left  (scrollLeft decreases).
      scrollerRef.current.scrollLeft = panRef.current.startScroll - dx;
    };
    const onMouseUp = () => { panRef.current.active = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onScrollerMouseDown = (e: React.MouseEvent) => {
    if (!spaceHeld || e.button !== 0 || !scrollerRef.current) return;
    panRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: scrollerRef.current.scrollLeft,
    };
    e.preventDefault();
  };

  // Close column menu on outside click / Escape
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenuId]);

  const handleAddTask = async (status: string) => {
    if (!workspace?.id) return;
    const res = await apiCreateTask({
      title: "Новая задача",
      workspaceId: workspace.id,
      group: "No date",
      projectId: projects[0]?.id || undefined,
    });
    if ("error" in res) {
      console.error(res.error);
      return;
    }
    const wsCtx = workspace ? { id: workspace.id, name: workspace.name } : undefined;
    const task = dtoToTask(res.task, wsCtx);
    // Set initial status to chosen column (server stores default "todo" — patch up)
    if (task.status !== status) {
      const upd = await apiUpdateTask(task.id, { status });
      if ("task" in upd && upd.task) {
        const fresh = dtoToTask(upd.task, wsCtx);
        addTask(fresh);
        setSelectedTask(fresh);
        return;
      }
      task.status = status;
    }
    addTask(task);
    setSelectedTask(task);
  };

  const handleUpdateTask = async (updated: Task) => {
    if (!canEditTask) return;
    updateTask(updated);
    const res = await apiUpdateTask(updated.id, {
      title: updated.title,
      description: updated.description,
      status: updated.status,
      priority: updated.priority,
      dueDate: updated.dueDate ?? null,
      startDate: updated.startDate ?? null,
      group: updated.group,
      contactId: updated.contactId ?? null,
      assigneeIds: updated.assignees.map((a) => a.id),
      tagIds: updated.tags.map((t) => t.id),
    });
    if ("task" in res && res.task) updateTask(dtoToTask(res.task, workspace ? { id: workspace.id, name: workspace.name } : undefined));
    else if ("error" in res) console.error(res.error);
  };

  const handleDeleteTask = async (id: string) => {
    const res = await apiDeleteTask(id);
    if ("success" in res && res.success) deleteTask(id);
    else if ("error" in res) console.error(res.error);
  };

  // Drag handlers
  const handleDragStart = (taskId: string) => setDraggingId(taskId);
  const handleDragEnd = () => {
    if (draggingId && dragOverCol) {
      const t = tasks.find(x => x.id === draggingId);
      if (t && t.status !== dragOverCol) {
        handleUpdateTask({ ...t, status: dragOverCol });
      }
    }
    setDraggingId(null);
    setDragOverCol(null);
  };
  const handleDragOver = (colId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  const handleDeleteStatus = async (statusId: string) => {
    // Migrate to first remaining status (anything except the one being removed)
    const fallback = allStatuses.find((s) => s.id !== statusId)?.id;
    if (!fallback) return;
    const affected = tasks.filter((t) => t.status === statusId);
    for (const t of affected) {
      await handleUpdateTask({ ...t, status: fallback });
    }
    removeStatus(statusId);
  };

  if (viewStatus === "loading") return null;
  if (viewStatus === "denied")  return <NoAccess />;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Desktop: horizontal scroll board */}
      <div
        ref={scrollerRef}
        onMouseDown={onScrollerMouseDown}
        className={`flex-1 overflow-x-auto overflow-y-hidden ${spaceHeld ? (panRef.current.active ? "cursor-grabbing select-none" : "cursor-grab select-none") : ""}`}
      >
        <div className="flex gap-3 h-full pb-2 min-w-max">
          {allStatuses.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isOver = dragOverCol === col.id;
            const colorClasses = STATUS_COLOR_CLASSES[col.color];

            return (
              <div
                key={col.id}
                className={`flex flex-col w-[280px] rounded-xl border transition-colors ${
                  isOver ? "border-primary/60 bg-primary/5" : "border-border bg-[#111111]"
                }`}
                onDragOver={(e) => handleDragOver(col.id, e)}
                onDrop={handleDragEnd}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${colorClasses.accent}`} />
                    <span className="text-sm font-semibold text-foreground truncate">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full shrink-0">{colTasks.length}</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === col.id ? null : col.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      title="Меню"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenuId === col.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-20 py-1 animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          onClick={() => { setOpenMenuId(null); setStatusModal({ editing: col }); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Переименовать
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenuId(null);
                            if (allStatuses.length <= 1) {
                              alert("Нельзя удалить последнюю колонку.");
                              return;
                            }
                            if (confirm(`Удалить статус «${col.label}»? Задачи будут перенесены в «К работе».`)) {
                              handleDeleteStatus(col.id);
                            }
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Удалить
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-2">
                  {colTasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onDragStart={() => handleDragStart(task.id)}
                      isDragging={draggingId === task.id}
                    />
                  ))}

                  {/* Empty drop zone hint */}
                  {colTasks.length === 0 && (
                    <div className={`flex-1 min-h-[80px] rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground ${isOver ? "border-primary/50 text-primary" : ""}`}>
                      {isOver ? "Бросьте сюда" : "Нет задач"}
                    </div>
                  )}

                  {/* Add card button */}
                  <button onClick={() => handleAddTask(col.id)} className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg transition-colors group mt-1">
                    <Plus className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
                    Добавить карточку
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add column */}
          <button
            onClick={() => setStatusModal({})}
            className="flex flex-col items-center justify-center w-[220px] h-fit mt-0 border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-5 h-5 mb-1.5" />
            <span className="text-sm font-medium">Новая колонка</span>
          </button>
        </div>
      </div>

      {/* Status create / edit modal */}
      {statusModal && (
        <StatusModal
          editing={statusModal.editing}
          onClose={() => setStatusModal(null)}
          onSave={(label, color) => {
            if (statusModal.editing) {
              renameStatus(statusModal.editing.id, label);
              recolorStatus(statusModal.editing.id, color);
            } else {
              useStatusStore.getState().add(label, color);
            }
            setStatusModal(null);
          }}
        />
      )}

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => {
            handleUpdateTask(updated);
            setSelectedTask(updated);
          }}
          onDelete={(id) => {
            handleDeleteTask(id);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Status create / edit modal ───────────────────────────────────────────────

interface StatusModalProps {
  editing?: StatusMeta;
  onClose: () => void;
  onSave: (label: string, color: StatusColor) => void;
}

function StatusModal({ editing, onClose, onSave }: StatusModalProps) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [color, setColor] = useState<StatusColor>(editing?.color ?? "blue");

  const valid = label.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">
            {editing ? "Изменить статус" : "Новый статус"}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="text-xs text-muted-foreground mb-1 block">Название</label>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Например: На уточнении"
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary mb-3"
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) onSave(label.trim(), color);
            if (e.key === "Escape") onClose();
          }}
        />

        <label className="text-xs text-muted-foreground mb-1 block">Цвет</label>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {STATUS_COLOR_NAMES.map((c) => {
            const cls = STATUS_COLOR_CLASSES[c.id];
            const selected = color === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setColor(c.id)}
                title={c.label}
                className={`relative h-9 rounded-lg ${cls.bg} border transition-all ${
                  selected ? "border-foreground/60 ring-2 ring-primary/50" : "border-border hover:border-foreground/30"
                }`}
              >
                <span className={`absolute inset-0 m-auto w-3 h-3 rounded-full ${cls.accent}`} />
                {selected && <Check className="w-3 h-3 absolute top-1 right-1 text-foreground" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={() => valid && onSave(label.trim(), color)}
            disabled={!valid}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {editing ? "Сохранить" : "Создать"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  onClick: () => void;
  onDragStart: () => void;
  isDragging: boolean;
}

function KanbanCard({ task, onClick, onDragStart, isDragging }: KanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`bg-[#181818] hover:bg-[#1e1e1e] border border-border hover:border-primary/30 rounded-xl p-3 cursor-pointer transition-all group ${
        isDragging ? "opacity-40 scale-95" : ""
      }`}
    >
      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag) => (
            <span key={tag.id} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tag.color}`}>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p className="text-[13px] font-medium text-foreground leading-snug mb-2.5">{task.title}</p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[task.priority]}`} />
          
          {/* Due date */}
          {task.dueDate && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
            </span>
          )}
          
          {/* ID */}
          <span className="text-[10px] font-mono text-muted-foreground/60">{task.id}</span>
        </div>

        {/* Assignees (multiple) */}
        {task.assignees.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, 3).map((a) => (
              <div
                key={a.id}
                title={a.name}
                className={`w-6 h-6 rounded-full ${a.color} border-2 border-[#181818] flex items-center justify-center text-white text-[10px] font-bold`}
              >
                {a.initials[0]}
              </div>
            ))}
            {task.assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-secondary border-2 border-[#181818] flex items-center justify-center text-muted-foreground text-[9px] font-bold">
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag handle indicator */}
      <div className="opacity-0 group-hover:opacity-30 absolute right-2 top-1/2 -translate-y-1/2 transition-opacity pointer-events-none">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}
