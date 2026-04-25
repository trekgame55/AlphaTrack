"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, CheckCircle2, Flag, Search, Filter, Trash2 } from "lucide-react";
import { Task, Priority, Status } from "@/lib/mock-data";
import { TaskModal } from "@/components/task-modal";
import { useAppStore } from "@/lib/store";
import { getTaskAccess } from "@/lib/permissions";

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "text-red-400",
  medium: "text-yellow-400",
  low:    "text-blue-400",
  none:   "text-muted-foreground",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "Высокий", medium: "Средний", low: "Низкий", none: "—",
};

export default function AllTasksPage() {
  const tasks = useAppStore((s) => s.tasks).filter((t) => getTaskAccess(t) !== "none");
  const projects = useAppStore((s) => s.projects);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const addTask = useAppStore((s) => s.addTask);
  const addProject = useAppStore((s) => s.addProject);
  const deleteProject = useAppStore((s) => s.deleteProject);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      setIsAddingProject(false);
      return;
    }
    const colors = ["bg-purple-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500", "bg-rose-500"];
    const id = `p-${Date.now()}`;
    addProject({
      id,
      name: newProjectName.trim(),
      color: colors[projects.length % colors.length],
      taskCount: 0,
      members: []
    });
    setExpandedProjects(prev => ({ ...prev, [id]: true }));
    setNewProjectName("");
    setIsAddingProject(false);
  };

  const toggleProject = (id: string) =>
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggle = (taskId: string) => {
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      updateTask({ ...t, status: t.status === "done" ? "todo" : "done" });
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Search bar */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-secondary/40 border border-border hover:border-primary/40 focus-within:border-primary rounded-lg px-3 py-2 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск задач..."
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 bg-secondary/40 border border-border hover:border-primary/40 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Фильтр</span>
        </button>
        <button onClick={() => setIsAddingProject(true)} className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/80 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Новый тип</span>
        </button>
      </div>

      {isAddingProject && (
        <div className="flex items-center gap-2 mb-4 bg-[#111111] border border-border rounded-xl p-3">
          <input
            autoFocus
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateProject();
              if (e.key === "Escape") setIsAddingProject(false);
            }}
            placeholder="Название нового проекта (типа)"
            className="flex-1 bg-transparent outline-none text-sm text-foreground"
          />
          <button onClick={handleCreateProject} className="text-sm text-primary font-medium hover:underline">
            Создать
          </button>
          <button onClick={() => setIsAddingProject(false)} className="text-sm text-muted-foreground hover:underline">
            Отмена
          </button>
        </div>
      )}

      {projects.length === 0 && !isAddingProject && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm mb-3">Нет проектов (кастомных типов).</p>
          <button onClick={() => setIsAddingProject(true)} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Создать первый проект
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto custom-scrollbar">
        {projects.map((project) => {
          const projectTasks = tasks.filter((t) => t.projectId === project.id);
          const isExpanded = expandedProjects[project.id];

          return (
            <div key={project.id} className="mb-6">
              {/* Project Header */}
              <div
                className="flex items-center gap-2 group/header mb-2 cursor-pointer w-fit"
                onClick={() => toggleProject(project.id)}
              >
                <div className="w-5 h-5 flex items-center justify-center text-muted-foreground group-hover/header:text-foreground transition-colors">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
                <span className={`w-2.5 h-2.5 rounded-sm ${project.color}`} />
                <h3 className="font-semibold text-foreground">{project.name}</h3>
                <span className="text-xs text-muted-foreground ml-1">{projectTasks.length}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                  className="opacity-0 group-hover/header:opacity-100 ml-2 text-muted-foreground hover:text-red-400 transition-all"
                  title="Удалить проект"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {isExpanded && (
                <div className="flex flex-col gap-[2px] ml-5">
                  {/* Table header */}
                  <div className="flex items-center text-[11px] font-medium text-muted-foreground px-2 py-1 mb-1 border-b border-border/50">
                    <div className="w-7 shrink-0" />
                    <div className="flex-1 min-w-[180px]">Наименование</div>
                    <div className="w-[70px] shrink-0">ID</div>
                    <div className="w-[100px] shrink-0 hidden md:block">Статус</div>
                    <div className="w-[90px] shrink-0 hidden lg:block">Приоритет</div>
                    <div className="w-[90px] shrink-0 hidden xl:block">Исполнитель</div>
                    <div className="w-[80px] shrink-0 hidden xl:block">Дата</div>
                  </div>

                  {projectTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="group/task flex items-center px-2 py-1.5 bg-background hover:bg-secondary/50 border border-transparent hover:border-border rounded-lg transition-colors cursor-pointer text-[13px] relative"
                    >
                      <div className="w-7 shrink-0 flex items-center justify-center">
                        <div
                          onClick={(e) => { e.stopPropagation(); toggle(task.id); }}
                          className={`w-[14px] h-[14px] rounded-[3px] border ${
                            task.status === "done"
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-muted-foreground/40 hover:border-primary"
                          } flex items-center justify-center transition-colors`}
                        >
                          {task.status === "done" && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      <div className={`flex-1 min-w-[180px] font-medium ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </div>

                      <div className="w-[70px] shrink-0 text-muted-foreground text-[11px] font-mono">{task.id}</div>

                      <div className="w-[100px] shrink-0 hidden md:block">
                        <span className="text-xs text-muted-foreground capitalize">{task.status.replace("_", " ")}</span>
                      </div>

                      <div className="w-[90px] shrink-0 hidden lg:flex items-center gap-1">
                        <Flag className={`w-3 h-3 ${PRIORITY_COLORS[task.priority]}`} />
                        <span className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                      </div>

                      <div className="w-[90px] shrink-0 hidden xl:flex items-center">
                        {task.assignees.length > 0 ? (
                          <div className="flex items-center -space-x-1.5">
                            {task.assignees.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                title={a.name}
                                className={`w-5 h-5 rounded-full ${a.color} border border-background flex items-center justify-center text-white text-[9px] font-bold shrink-0`}
                              >
                                {a.initials[0]}
                              </div>
                            ))}
                            {task.assignees.length > 3 && (
                              <div className="w-5 h-5 rounded-full bg-secondary border border-background flex items-center justify-center text-muted-foreground text-[8px] font-bold">
                                +{task.assignees.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>

                      <div className="w-[80px] shrink-0 hidden xl:block text-xs text-muted-foreground">
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
                          : "—"}
                      </div>

                      <div className="absolute right-2 opacity-0 group-hover/task:opacity-100 bg-secondary/80 backdrop-blur rounded p-1 flex items-center gap-1 transition-opacity">
                        <button onClick={(e) => e.stopPropagation()} className="w-6 h-6 flex items-center justify-center rounded hover:bg-background text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center px-2 py-1.5 text-[13px] text-muted-foreground hover:text-foreground group cursor-pointer mt-1">
                    <div className="w-7 shrink-0 flex items-center justify-center">
                      <Plus className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </div>
                    <div className="flex-1">Добавить задачу...</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={(id) => {
            deleteTask(id);
            setSelectedTask(null);
          }}
          onUpdate={(updated) => {
            updateTask(updated);
            setSelectedTask(updated);
          }}
        />
      )}
    </div>
  );
}
