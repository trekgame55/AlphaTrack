"use client";

import { useState, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Flag } from "lucide-react";
import { Task, Priority, todayStr, CURRENT_USER } from "@/lib/mock-data";
import { TaskModal } from "@/components/task-modal";
import { useAppStore } from "@/lib/store";
import { getTaskAccess } from "@/lib/permissions";
import { addDays } from "date-fns";

const PRIORITY_COLORS: Record<Priority, string> = {
  high:   "text-red-400",
  medium: "text-yellow-400",
  low:    "text-blue-400",
  none:   "text-muted-foreground",
};

const PRIORITY_BG_COLORS: Record<Priority, string> = {
  high:   "border-l-red-400",
  medium: "border-l-yellow-400",
  low:    "border-l-blue-400",
  none:   "border-l-border",
};

const MONTHS_RU = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const DAYS_RU   = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

function getDayKey(date: Date) {
  return date.toISOString().split("T")[0];
}

function CalendarDay({ date, tasks, isToday, isOtherMonth }: {
  date: Date;
  tasks: Task[];
  isToday: boolean;
  isOtherMonth: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, 2);
  const extra   = tasks.length - 2;

  return (
    <div className={`min-h-[110px] border border-border/50 rounded-xl p-2 flex flex-col gap-1 transition-colors hover:border-border ${isOtherMonth ? "opacity-40" : ""}`}>
      {/* Day number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold ${
            isToday ? "bg-primary text-white" : "text-foreground"
          }`}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-0.5 flex-1">
        {visible.map((t) => (
          <div
            key={t.id}
            className={`text-[11px] px-1.5 py-0.5 rounded-md bg-secondary/50 border-l-2 ${PRIORITY_BG_COLORS[t.priority]} text-foreground/80 truncate`}
            title={t.title}
          >
            {t.title}
          </div>
        ))}
        {!expanded && extra > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="text-[10px] text-muted-foreground hover:text-primary text-left px-1"
          >
            + ещё {extra}
          </button>
        )}
      </div>
    </div>
  );
}

export default function WeekPage() {
  const today = new Date();
  const [view, setView] = useState<"week" | "month">("week");

  // Global store
  const tasks = useAppStore((s) => s.tasks).filter((t) => getTaskAccess(t) !== "none");
  const projects = useAppStore((s) => s.projects);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  // Week state
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => {
    const day = today.getDay();
    return day === 0 ? 6 : day - 1;
  });

  // Month state
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Touch handlers for mobile
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 15 && dy < 80) {
      isSwiping.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isSwiping.current || view !== "week") return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);

    if (Math.abs(dx) < 60 || dy > 80) return;

    if (dx > 0) {
      // Свайп вправо -> день вперед
      if (mobileDayIdx < 6) setMobileDayIdx(m => m + 1);
      else {
        setWeekOffset(w => w + 1);
        setMobileDayIdx(0);
      }
    } else {
      // Свайп влево -> день назад
      if (mobileDayIdx > 0) setMobileDayIdx(m => m - 1);
      else {
        setWeekOffset(w => w - 1);
        setMobileDayIdx(6);
      }
    }
    isSwiping.current = false;
  };

  // --- Week Logic ---
  const weekDays = useMemo(() => {
    const base = new Date();
    const day = base.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = addDays(base, diff + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(monday, i);
      return {
        date: d,
        key: getDayKey(d),
        shortLabel: d.toLocaleDateString("ru-RU", { weekday: "short" }),
        dayNum: d.toLocaleDateString("ru-RU", { day: "numeric" }),
        monthLabel: d.toLocaleDateString("ru-RU", { month: "short" }),
        isToday: getDayKey(d) === todayStr,
      };
    });
  }, [weekOffset]);

  const tasksByDay = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach((d) => (map[d.key] = []));
    tasks.forEach((t) => {
      if (t.dueDate && map[t.dueDate] !== undefined) {
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks, weekDays]);

  // --- Month Logic ---
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const calDays = Array.from({ length: totalCells }, (_, i) => {
    return new Date(year, month, 1 - startOffset + i);
  });

  const monthTasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  // --- Actions ---
  const handleAddTask = (dateKey: string) => {
    const newTask: Task = {
      id: `T-${Date.now().toString().slice(-4)}`,
      title: "Новая задача",
      status: "todo",
      priority: "none",
      dueDate: dateKey,
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

  const handleToggleDone = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const t = tasks.find(x => x.id === taskId);
    if (t) {
      updateTask({ ...t, status: t.status === "done" ? "todo" : "done" });
    }
  };

  const prev = () => {
    if (view === "month") setViewDate(new Date(year, month - 1, 1));
    else setWeekOffset((w) => w - 1);
  };

  const next = () => {
    if (view === "month") setViewDate(new Date(year, month + 1, 1));
    else setWeekOffset((w) => w + 1);
  };

  const goToday = () => {
    if (view === "month") setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    else setWeekOffset(0);
  };

  const headerLabel = view === "month"
    ? `${MONTHS_RU[month]} ${year}`
    : (() => {
        const first = weekDays[0].date;
        const last = weekDays[6].date;
        const f = first.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        const l = last.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
        return `${f} — ${l}`;
      })();

  return (
    <div 
      className="flex flex-col h-full animate-in fade-in duration-300"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-sm font-medium bg-secondary hover:bg-secondary/70 text-foreground rounded-md transition-colors"
          >
            Сегодня
          </button>
          <button
            onClick={next}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-foreground ml-2 min-w-[150px]">{headerLabel}</span>
        </div>

        {/* View Switcher & Mobile Day Switcher */}
        <div className="flex items-center gap-4">
          {view === "week" && (
            <div className="flex md:hidden items-center gap-1 overflow-x-auto no-scrollbar max-w-[200px]">
              {weekDays.map((d, i) => (
                <button
                  key={d.key}
                  onClick={() => setMobileDayIdx(i)}
                  className={`flex flex-col items-center px-2 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                    mobileDayIdx === i
                      ? "bg-primary text-white"
                      : d.isToday
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="uppercase text-[9px]">{d.shortLabel}</span>
                  <span className="text-[10px] font-bold">{d.dayNum}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center bg-secondary rounded-lg p-1 gap-0.5">
            <button
              onClick={() => setView("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Clock className="w-3.5 h-3.5" />Неделя
            </button>
            <button
              onClick={() => setView("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Calendar className="w-3.5 h-3.5" />Месяц
            </button>
          </div>
        </div>
      </div>

      {view === "month" && (
        <div className="flex items-center gap-4 mb-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border-l-2 border-l-red-400 bg-secondary/50" />Высокий</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border-l-2 border-l-yellow-400 bg-secondary/50" />Средний</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm border-l-2 border-l-blue-400 bg-secondary/50" />Низкий</span>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {view === "month" ? (
          <div className="flex-1 flex flex-col overflow-auto custom-scrollbar">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_RU.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            {/* Month grid */}
            <div
              className="grid grid-cols-7 gap-1 flex-1"
              style={{ gridTemplateRows: `repeat(${totalCells / 7}, minmax(110px, 1fr))` }}
            >
              {calDays.map((date, i) => {
                const key     = getDayKey(date);
                const dayTasks   = monthTasksByDate[key] || [];
                const isToday = key === todayStr;
                const isOther = date.getMonth() !== month;
                return (
                  <CalendarDay
                    key={i}
                    date={date}
                    tasks={dayTasks}
                    isToday={isToday}
                    isOtherMonth={isOther}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Week Grid */}
            <div className="hidden md:grid grid-cols-7 gap-2 flex-1 overflow-hidden">
              {weekDays.map((d) => {
                const dayTasks = tasksByDay[d.key] || [];
                return (
                  <DayColumn
                    key={d.key}
                    day={d}
                    tasks={dayTasks}
                    onTaskClick={setSelectedTask}
                    onToggleDone={handleToggleDone}
                    onAddTask={() => handleAddTask(d.key)}
                  />
                );
              })}
            </div>

            {/* Mobile Week Grid: single day view */}
            <div className="md:hidden flex-1 overflow-hidden">
              {weekDays[mobileDayIdx] && (
                <DayColumn
                  day={weekDays[mobileDayIdx]}
                  tasks={tasksByDay[weekDays[mobileDayIdx].key] || []}
                  onTaskClick={setSelectedTask}
                  onToggleDone={handleToggleDone}
                  onAddTask={() => handleAddTask(weekDays[mobileDayIdx].key)}
                  mobile
                />
              )}
            </div>
          </>
        )}
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

interface DayColProps {
  day: {
    key: string;
    shortLabel: string;
    dayNum: string;
    monthLabel: string;
    isToday: boolean;
  };
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onToggleDone: (id: string, e: React.MouseEvent) => void;
  onAddTask: () => void;
  mobile?: boolean;
}

function DayColumn({ day, tasks, onTaskClick, onToggleDone, onAddTask, mobile }: DayColProps) {
  return (
    <div className={`flex flex-col bg-[#111111] border ${day.isToday ? "border-primary/40" : "border-border"} rounded-xl overflow-hidden ${mobile ? "h-full" : ""}`}>
      
      {/* Day Header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0 ${day.isToday ? "bg-primary/10" : ""}`}>
        <div className="flex items-center gap-2">
          <div className={`flex flex-col items-center ${day.isToday ? "text-primary" : "text-muted-foreground"}`}>
            <span className="text-[10px] uppercase font-semibold">{day.shortLabel}</span>
            <span className={`text-lg font-bold leading-none ${day.isToday ? "text-primary" : "text-foreground"}`}>{day.dayNum}</span>
          </div>
          {day.isToday && (
            <span className="text-[10px] font-medium bg-primary text-white px-1.5 py-0.5 rounded-full">Сегодня</span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{tasks.length > 0 ? tasks.length : ""}</span>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => onTaskClick(task)}
            className="w-full text-left bg-secondary/40 hover:bg-secondary/70 border border-transparent hover:border-border rounded-lg p-2.5 transition-all group"
          >
            <div className="flex items-start gap-2">
              {/* Done checkbox */}
              <div
                onClick={(e) => onToggleDone(task.id, e)}
                className={`mt-0.5 w-[14px] h-[14px] rounded-[3px] border shrink-0 flex items-center justify-center transition-colors ${
                  task.status === "done"
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-border hover:border-primary"
                }`}
              >
                {task.status === "done" && (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-mono text-muted-foreground">{task.id}</span>
                  {task.priority !== "none" && (
                    <Flag className={`w-3 h-3 ${PRIORITY_COLORS[task.priority]}`} />
                  )}
                  {task.assignees.length > 0 && (
                    <div className="flex items-center -space-x-1">
                      {task.assignees.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          className={`w-4 h-4 rounded-full ${a.color} border border-background flex items-center justify-center text-white text-[8px] font-bold`}
                        >
                          {a.initials[0]}
                        </div>
                      ))}
                      {task.assignees.length > 2 && (
                        <div className="w-4 h-4 rounded-full bg-secondary border border-background flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                          +{task.assignees.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                  {task.tags.slice(0, 1).map((tag) => (
                    <span key={tag.id} className={`text-[9px] px-1.5 py-px rounded-full ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}

        {/* Add task button */}
        <button onClick={onAddTask} className="w-full flex items-center gap-2 p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 rounded-lg transition-colors mt-0.5 group">
          <Plus className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
          Добавить задачу
        </button>
      </div>
    </div>
  );
}
