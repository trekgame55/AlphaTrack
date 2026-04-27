"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragOverlay,
  PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown, ChevronRight, Plus, Flag, GripVertical,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { listTasks, createTask, updateTask, deleteTask } from "@/actions/tasks";
import { TaskModal } from "@/components/task-modal";
import { canCompleteTask } from "@/lib/permissions";
import { Task, Priority, CURRENT_USER_ID } from "@/lib/mock-data";
import { statusClasses } from "@/lib/statuses";

// Status accent for the right-edge neon strip on each row.
const statusGlow = (id: string) => statusClasses(id)?.glow ?? "bg-border";

// ─── Priority display ────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<Priority, string> = {
  high: "text-red-400", medium: "text-yellow-400", low: "text-blue-400", none: "text-transparent",
};
const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Высокий", medium: "Средний", low: "Низкий", none: "—",
};

type GroupKey = "Today" | "Tomorrow" | "Later" | "No date";
const GROUP_LABELS: Record<GroupKey, string> = {
  Today: "Сегодня", Tomorrow: "Завтра", Later: "Позже", "No date": "Без даты",
};
const GROUPS: GroupKey[] = ["Today", "Tomorrow", "Later", "No date"];

// ─── Task row ────────────────────────────────────────────────────────────────
interface TaskRowProps {
  task: Task;
  onOpen: (t: Task) => void;
  onToggleDone: (id: string, e: React.MouseEvent) => void;
  onDelete?: (id: string) => void;
  onUpdateDate?: (id: string, date: string) => void;
  overlay?: boolean;
}

function TaskRow({ task, onOpen, onToggleDone, onDelete, onUpdateDate, overlay }: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const allowDone = canCompleteTask(task);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !overlay ? 0.3 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragging && onOpen(task)}
      className={`group/task flex items-center px-2 py-1.5 bg-background hover:bg-secondary/50 border border-transparent hover:border-border rounded-lg transition-colors cursor-pointer text-[13px] relative ${
        overlay ? "shadow-2xl border-primary/30 bg-secondary/70 backdrop-blur" : ""
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes} {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="w-6 shrink-0 flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover/task:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Checkbox */}
      <div className="w-7 shrink-0 flex items-center justify-center">
        {allowDone ? (
          <div
            onClick={(e) => onToggleDone(task.id, e)}
            className={`w-[15px] h-[15px] rounded-[4px] border transition-colors flex items-center justify-center shrink-0 ${
              task.status === "done"
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-muted-foreground/40 hover:border-primary"
            }`}
          >
            {task.status === "done" && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        ) : (
          <div title="Недостаточно прав" className="w-[15px] h-[15px] rounded-[4px] border border-muted-foreground/20 flex items-center justify-center cursor-not-allowed">
            <svg className="w-2.5 h-2.5 text-muted-foreground/40" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>

      {/* Title */}
      <div className={`flex-1 min-w-[160px] font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
        {task.title}
      </div>

      {/* Project */}
      <div className="w-[115px] shrink-0 hidden md:flex items-center">
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-xs">
          <span className={`w-1.5 h-1.5 rounded-full ${task.projectColor} shrink-0`} />
          <span className="truncate max-w-[75px]">{task.projectName}</span>
        </span>
      </div>

      {/* Priority */}
      <div className="w-[95px] shrink-0 hidden lg:flex items-center gap-1.5">
        <Flag className={`w-3.5 h-3.5 shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
        <span className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
      </div>

      {/* Assignees */}
      <div className="w-[85px] shrink-0 hidden xl:flex items-center">
        <div className="flex items-center -space-x-1.5">
          {task.assignees.slice(0, 3).map((a) => (
            <div key={a.id} title={a.name} className={`w-6 h-6 rounded-full ${a.color} border-2 border-background flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
              {a.initials[0]}
            </div>
          ))}
          {task.assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center text-muted-foreground text-[9px] font-bold">
              +{task.assignees.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="w-[110px] shrink-0 hidden 2xl:flex items-center gap-1 overflow-hidden">
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag.id} className={`text-[10px] px-1.5 py-px rounded-full ${tag.color} truncate`}>
            {tag.label}
          </span>
        ))}
      </div>

      {/* Due Date */}
      <div className="w-[75px] shrink-0 hidden xl:block text-xs text-muted-foreground relative pr-3">
        <span className="cursor-pointer hover:text-primary transition-colors">
          {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }) : <span className="opacity-40">+ дата</span>}
        </span>
        <input
          type="date"
          defaultValue={task.dueDate || ""}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onUpdateDate?.(task.id, e.target.value); }}
          className="absolute inset-0 opacity-0 cursor-pointer w-full"
          title="Изменить дедлайн"
        />
      </div>

      {/* Right-edge neon status indicator */}
      <span
        className={`pointer-events-none absolute right-0 top-1.5 bottom-1.5 w-[2px] rounded-full ${statusGlow(task.status)}`}
        aria-hidden
      />
    </div>
  );
}

// ─── Group Drop Zone ───────────────────────────────────────────────────────────
function GroupDropZone({ groupId, isOver }: { groupId: string; isOver: boolean }) {
  return (
    <div className={`h-8 rounded-lg border-2 border-dashed transition-colors ${isOver ? "border-primary/60 bg-primary/5" : "border-transparent"}`} />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { workspace, currentUser } = useWorkspace();

  // Local task state — reset when workspace changes
  const [tasks, setTasks] = useState<Task[]>([]);
  const [localLoading, setLocalLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("all");
  const [addingToGroup, setAddingToGroup] = useState<GroupKey | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    Today: true, Tomorrow: true, Later: true, "No date": false,
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overGroup, setOverGroup] = useState<GroupKey | null>(null);

  // Track which workspaceId was last loaded — avoid clearing tasks on re-renders
  const loadedWsId = useRef<string | null>(null);

  // Fetch tasks from DB — scoped strictly to this workspace
  useEffect(() => {
    if (!workspace?.id) return;
    const wsId = workspace.id;
    let cancelled = false;

    // Only blank the list when SWITCHING to a DIFFERENT workspace
    if (loadedWsId.current !== wsId) {
      setTasks([]);
      setLocalLoading(true);
    }

    listTasks(wsId)
      .then((dbTasks: any[]) => {
        if (cancelled) return;
        loadedWsId.current = wsId;
        setTasks(dbTasks.map(t => ({
          id: t.id, title: t.title,
          description: t.description ?? undefined,
          status: t.status as any, priority: t.priority as any,
          // take first 10 chars instead of new Date(...).toISOString() — that shifts by TZ
          startDate: t.startDate ? String(t.startDate).slice(0, 10) : undefined,
          dueDate:   t.dueDate   ? String(t.dueDate).slice(0, 10)   : undefined,
          group: (t.group || "No date") as any,
          projectId:    t.project?.id    || wsId,
          projectName:  t.project?.name  || workspace.name,
          projectColor: t.project?.color || "bg-secondary",
          assignees: (t.assignees || []).map((a: any) => ({
            id: a.user.id, name: a.user.name,
            initials: a.user.initials || a.user.name.slice(0, 2).toUpperCase(),
            color: a.user.color || "bg-violet-500",
            email: a.user.email,
          })),
          tags: (t.tags || []).map((tt: any) => ({ id: tt.tag.id, label: tt.tag.label, color: tt.tag.color })),
          comments: (t.comments || []).map((c: any) => ({
            id: c.id, text: c.text,
            createdAt: new Date(c.createdAt).toISOString(),
            author: { id: c.author.id, name: c.author.name, initials: c.author.initials, color: c.author.color, email: c.author.email },
          })),
          contactId: t.contactId ?? undefined,
          createdAt: new Date(t.createdAt).toISOString().split("T")[0],
        } as Task)));
        setLocalLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        console.error("[Tasks] listTasks failed:", err);
        setLocalLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspace?.id]);

  // "all" by default so every task is visible regardless of assignees
  const visibleTasks = useMemo(() => {
    if (activeTab === "assigned") {
      const myId = currentUser?.id;
      if (!myId) return tasks; // no user loaded yet — show all
      return tasks.filter(t => t.assignees.some(a => a.id === myId));
    }
    return tasks;
  }, [tasks, activeTab, currentUser]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const toggleGroup = (group: string) =>
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  const toggleDone = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const newStatus = t.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((x) => x.id === taskId ? { ...x, status: newStatus as any } : x));
    updateTask(taskId, { status: newStatus });
  };

  const updateDate = (taskId: string, date: string) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, dueDate: date } : t));
    updateTask(taskId, { dueDate: date });
  };

  // Local YYYY-MM-DD (toISOString shifts by TZ offset → date drifts back by a day)
  const fmtLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const today    = fmtLocal(new Date());
  const tomorrow = fmtLocal(new Date(Date.now() + 86400000));

  // Derive the effective group for a task from its dueDate. The persisted
  // `group` field is only used as a fallback when there is no dueDate, so a
  // task whose dueDate is changed to today automatically appears in "Today".
  const effectiveGroup = (t: Task): GroupKey => {
    const due = t.dueDate ? String(t.dueDate).slice(0, 10) : "";
    if (!due) return (t.group as GroupKey) || "No date";
    if (due === today)    return "Today";
    if (due === tomorrow) return "Tomorrow";
    return "Later";
  };

  const addTask = async (group: GroupKey) => {
    if (!newTaskTitle.trim()) { setAddingToGroup(null); return; }
    if (!workspace) { setAddingToGroup(null); return; }
    const title = newTaskTitle.trim();
    // Clear immediately to prevent double-fire on blur+enter
    setNewTaskTitle("");
    setAddingToGroup(null);

    const dueDate = group === "Today" ? today : group === "Tomorrow" ? tomorrow : undefined;
    const me = currentUser;

    console.log("[addTask] Calling createTask", { title, workspaceId: workspace.id, group, me: me?.id });

    let res: any;
    try {
      res = await createTask({
        title,
        workspaceId: workspace.id,
        group,
        dueDate,
        assigneeIds: me ? [me.id] : [],
      });
    } catch (err) {
      console.error("[addTask] createTask threw exception:", err);
      alert("Ошибка при создании задачи: " + String(err));
      return;
    }

    console.log("[addTask] createTask result:", res);

    if (res?.error) {
      console.error("[addTask] Server returned error:", res.error);
      alert("Ошибка: " + res.error);
      return;
    }

    if (res?.task) {
      const newTask: Task = {
        id: res.task.id, title: res.task.title, status: "todo", priority: "none",
        dueDate, group,
        projectId:    res.task.project?.id    || workspace.id,
        projectName:  res.task.project?.name  || workspace.name,
        projectColor: res.task.project?.color || "bg-secondary",
        assignees: me ? [{ id: me.id, name: me.name, initials: me.initials, color: me.color, email: me.email }] : [],
        tags: [], comments: [], createdAt: today,
      };
      console.log("[addTask] ✅ Task created and added to state:", newTask.id);
      setTasks(prev => [...prev, newTask]);
      setSelectedTask(newTask);
    } else {
      console.error("[addTask] No task in response and no error:", res);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    deleteTask(id);
    if (selectedTask?.id === id) setSelectedTask(null);
  };

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId), [tasks, activeId]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id);
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverGroup(null); return; }
    const overId = String(over.id);
    if (overId.startsWith("group-")) setOverGroup(overId.replace("group-", "") as GroupKey);
    else setOverGroup(tasks.find((t) => t.id === overId)?.group ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); setOverGroup(null);
    if (!over) return;
    const aTask = tasks.find((t) => t.id === active.id);
    if (!aTask) return;
    const overId = String(over.id);
    const targetGroup: GroupKey = overId.startsWith("group-")
      ? overId.replace("group-", "") as GroupKey
      : tasks.find((t) => t.id === overId)?.group ?? aTask.group;

    if (aTask.group === targetGroup && !overId.startsWith("group-")) {
      const groupTasks = tasks.filter((t) => t.group === targetGroup).map((t) => t.id);
      const oldIdx = groupTasks.indexOf(String(active.id));
      const newIdx = groupTasks.indexOf(overId);
      if (oldIdx !== newIdx && newIdx !== -1) {
        const reordered = arrayMove(groupTasks, oldIdx, newIdx);
        setTasks((prev) => {
          const result: Task[] = [];
          let inserted = false;
          for (const t of prev) {
            if (t.group === targetGroup && !inserted) {
              result.push(...reordered.map((id) => prev.find((x) => x.id === id)!));
              inserted = true;
            } else if (t.group !== targetGroup) result.push(t);
          }
          return result;
        });
      }
    } else if (effectiveGroup(aTask) !== targetGroup) {
      // Moving between groups updates both the explicit group and the dueDate so
      // the task lands in the visually expected bucket (Today/Tomorrow/Later/No date).
      let newDue: string | undefined = aTask.dueDate;
      if (targetGroup === "Today")    newDue = today;
      else if (targetGroup === "Tomorrow") newDue = tomorrow;
      else if (targetGroup === "No date")  newDue = undefined;
      // For "Later" we keep whatever date the user already had.
      setTasks((prev) => prev.map((t) => t.id === aTask.id ? { ...t, group: targetGroup, dueDate: newDue } : t));
      updateTask(aTask.id, { group: targetGroup, dueDate: newDue ?? null } as any);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border pb-3">
        {[["assigned", "Мои задачи"], ["all", "Все задачи"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === k ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-auto custom-scrollbar">
          {localLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
              Загрузка задач...
            </div>
          ) : (
            GROUPS.map((group) => {
              const groupTasks = visibleTasks.filter((t) => effectiveGroup(t) === group);
              if (groupTasks.length === 0 && group !== "Today") return null;
              const isExpanded = expandedGroups[group];

              return (
                <div key={group} className="mb-6">
                  <div className="flex items-center gap-2 group/header mb-2 cursor-pointer w-fit select-none" onClick={() => toggleGroup(group)}>
                    <div className="w-5 h-5 flex items-center justify-center text-muted-foreground group-hover/header:text-foreground transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <h3 className="font-semibold text-foreground">{GROUP_LABELS[group]}</h3>
                    <span className="text-xs text-muted-foreground ml-1">{groupTasks.length}</span>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col gap-[2px]">
                      {group === "Today" && (
                        <div className="flex items-center text-[11px] font-medium text-muted-foreground px-2 py-1 mb-1 border-b border-border/50">
                          <div className="w-6 shrink-0" />
                          <div className="w-7 shrink-0" />
                          <div className="flex-1 min-w-[160px]">Наименование</div>
                          <div className="w-[115px] shrink-0 hidden md:block">Проект</div>
                          <div className="w-[95px] shrink-0 hidden lg:block">Приоритет</div>
                          <div className="w-[85px] shrink-0 hidden xl:block">Исполнители</div>
                          <div className="w-[75px] shrink-0 hidden xl:block">Дата</div>
                        </div>
                      )}

                      <SortableContext items={groupTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                        {groupTasks.map((task) => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            onOpen={setSelectedTask}
                            onToggleDone={toggleDone}
                            onUpdateDate={updateDate}
                            onDelete={handleDeleteTask}
                          />
                        ))}
                      </SortableContext>

                      <GroupDropZone groupId={group} isOver={overGroup === group && activeId !== null} />

                      {/* Add task */}
                      {addingToGroup === group ? (
                        <div className="flex items-center px-2 py-1 gap-2">
                          <div className="w-6 shrink-0" />
                          <div className="w-7 shrink-0 flex items-center justify-center">
                            <div className="w-[15px] h-[15px] rounded-[4px] border border-muted-foreground/30" />
                          </div>
                          <input
                            autoFocus
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); addTask(group); }
                              if (e.key === "Escape") { setAddingToGroup(null); setNewTaskTitle(""); }
                            }}
                            onBlur={(e) => {
                              // Only submit on blur if the title is still set (not already submitted via Enter)
                              if (newTaskTitle.trim()) addTask(group);
                              else { setAddingToGroup(null); setNewTaskTitle(""); }
                            }}
                            placeholder="Название задачи..."
                            className="flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/50 border-b border-primary/60 pb-0.5"
                          />
                        </div>
                      ) : (
                        <div onClick={() => setAddingToGroup(group)} className="flex items-center px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground group cursor-pointer">
                          <div className="w-6 shrink-0" />
                          <div className="w-7 shrink-0 flex items-center justify-center">
                            <Plus className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:text-primary" />
                          </div>
                          <div className="flex-1">Добавить задачу...</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeTask ? (
            <TaskRow task={activeTask} onOpen={() => {}} onToggleDone={() => {}} overlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDeleteTask}
          onUpdate={(updated) => {
            // Update local state immediately (optimistic)
            setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
            setSelectedTask(updated);
            // Debounced DB save
            updateTask(updated.id, {
              title: updated.title,
              description: updated.description,
              status: updated.status,
              priority: updated.priority,
              dueDate: updated.dueDate ?? null,
              startDate: updated.startDate ?? null,
              contactId: updated.contactId ?? null,
              assigneeIds: updated.assignees.map(a => a.id),
              tagIds: updated.tags.map(t => t.id),
            });
          }}
        />
      )}
    </div>
  );
}
