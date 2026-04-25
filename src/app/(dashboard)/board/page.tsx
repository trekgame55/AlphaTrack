"use client";

import { useState, useRef } from "react";
import { Plus, MoreHorizontal, Flag, GripVertical } from "lucide-react";
import { Task, Priority, Status, CURRENT_USER } from "@/lib/mock-data";
import { TaskModal } from "@/components/task-modal";
import { useAppStore } from "@/lib/store";
import { getTaskAccess } from "@/lib/permissions";

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "text-red-400",
  medium: "text-yellow-400",
  low:    "text-blue-400",
  none:   "text-transparent",
};

type Column = {
  id: Status;
  label: string;
  accent: string;
  bg: string;
};

const COLUMNS: Column[] = [
  { id: "backlog",     label: "Бэклог",    accent: "bg-slate-400",   bg: "bg-slate-400/10"   },
  { id: "todo",        label: "К работе",  accent: "bg-blue-400",    bg: "bg-blue-400/10"    },
  { id: "in_progress", label: "В работе",  accent: "bg-amber-400",   bg: "bg-amber-400/10"   },
  { id: "review",      label: "Ревью",     accent: "bg-purple-400",  bg: "bg-purple-400/10"  },
  { id: "done",        label: "Готово",    accent: "bg-emerald-400", bg: "bg-emerald-400/10" },
];

export default function BoardPage() {
  const tasks = useAppStore((s) => s.tasks).filter((t) => getTaskAccess(t) !== "none");
  const projects = useAppStore((s) => s.projects);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

  const handleAddTask = (status: Status) => {
    const newTask: Task = {
      id: `T-${Date.now().toString().slice(-4)}`,
      title: "Новая задача",
      status: status,
      priority: "none",
      projectId: projects[0]?.id || "",
      projectName: projects[0]?.name || "Нет проекта",
      projectColor: projects[0]?.color || "bg-secondary",
      assignees: [],
      tags: [],
      comments: [],
      createdAt: new Date().toISOString().split("T")[0],
      group: "No date",
    };
    addTask(newTask);
    setSelectedTask(newTask);
  };

  // Drag handlers
  const handleDragStart = (taskId: string) => setDraggingId(taskId);
  const handleDragEnd = () => {
    if (draggingId && dragOverCol) {
      const t = tasks.find(x => x.id === draggingId);
      if (t && t.status !== dragOverCol) {
        updateTask({ ...t, status: dragOverCol });
      }
    }
    setDraggingId(null);
    setDragOverCol(null);
  };
  const handleDragOver = (colId: Status, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCol(colId);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Desktop: horizontal scroll board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 h-full pb-2 min-w-max">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isOver = dragOverCol === col.id;

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
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.accent}`} />
                    <span className="text-sm font-semibold text-foreground">{col.label}</span>
                    <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                  </div>
                  <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
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
          <button className="flex flex-col items-center justify-center w-[220px] h-fit mt-0 border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-muted-foreground hover:text-primary transition-colors">
            <Plus className="w-5 h-5 mb-1.5" />
            <span className="text-sm font-medium">Новая колонка</span>
          </button>
        </div>
      </div>

      {/* Task Modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updated) => {
            updateTask(updated);
            setSelectedTask(updated);
          }}
          onDelete={(id) => {
            deleteTask(id);
            setSelectedTask(null);
          }}
        />
      )}
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
