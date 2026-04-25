"use client";

import { useState } from "react";
import {
  X, Flag, Calendar, Users, Tag, MessageSquare, Activity,
  CheckSquare, Paperclip, MoreHorizontal, Send, Trash2,
  ChevronDown, Check, Pencil, Plus, PhoneCall,
} from "lucide-react";
import { Task, Member, TAGS, Priority, Status, MOCK_CONTACTS, Contact, CURRENT_USER } from "@/lib/mock-data";
import { BookUser, Phone, Copy } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ShareModal } from "@/components/share-modal";
import { useWorkspace } from "@/lib/workspace-context";

const PRIORITY_LABELS: Record<Priority, { label: string; color: string }> = {
  high:   { label: "Высокий",  color: "text-red-400"          },
  medium: { label: "Средний",  color: "text-yellow-400"       },
  low:    { label: "Низкий",   color: "text-blue-400"         },
  none:   { label: "Нет",      color: "text-muted-foreground" },
};

const STATUS_LABELS: Record<Status, { label: string; color: string }> = {
  backlog:     { label: "Бэклог",   color: "text-slate-400"   },
  todo:        { label: "К работе", color: "text-blue-400"    },
  in_progress: { label: "В работе", color: "text-amber-400"   },
  review:      { label: "Ревью",    color: "text-purple-400"  },
  done:        { label: "Готово",   color: "text-emerald-400" },
};

interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onUpdate?: (updatedTask: Task) => void;
  onDelete?: (id: string) => void;
}

export function TaskModal({ task, onClose, onUpdate, onDelete }: TaskModalProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(task);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [editingTitle, setEditingTitle] = useState(false);
  const [assigneePicker, setAssigneePicker] = useState(false);
  const [tagPicker, setTagPicker] = useState(false);
  const [contactPicker, setContactPicker] = useState(false);
  const [newTagStr, setNewTagStr] = useState("");
  const [shareModal, setShareModal] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactNewName, setContactNewName] = useState("");
  const [contactEditModal, setContactEditModal] = useState<Contact | null | "new">(null);
  const members = useAppStore((s) => s.members);
  const { currentUser, contacts: wsContacts } = useWorkspace();

  // Merge workspace members with CURRENT_USER so user sees themselves
  const allMembers: Member[] = (() => {
    const base = members.map(m => ({ ...m }));
    if (currentUser && !base.some(m => m.id === currentUser.id)) {
      base.unshift({ id: currentUser.id, name: currentUser.name, initials: currentUser.initials, color: currentUser.color, email: currentUser.email });
    }
    return base;
  })();

  // Use ws contacts, fall back to MOCK_CONTACTS
  const allContacts = wsContacts.length > 0 ? wsContacts : MOCK_CONTACTS;

  if (!editedTask) return null;

  const update = (patch: Partial<Task>) => {
    const updated = { ...editedTask, ...patch };
    setEditedTask(updated);
    onUpdate?.(updated);
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: `c-${Date.now()}`,
      author: CURRENT_USER,
      text: newComment.trim(),
      createdAt: "Только что",
    };
    update({ comments: [...editedTask.comments, comment] });
    setNewComment("");
  };

  const toggleAssignee = (member: Member) => {
    const already = editedTask.assignees.some((a) => a.id === member.id);
    update({
      assignees: already
        ? editedTask.assignees.filter((a) => a.id !== member.id)
        : [...editedTask.assignees, member],
    });
  };

  const removeAssignee = (memberId: string) => {
    update({ assignees: editedTask.assignees.filter((a) => a.id !== memberId) });
  };

  const copyPhone = (num: string) => navigator.clipboard.writeText(num);

  const priorityInfo = PRIORITY_LABELS[editedTask.priority];
  const statusInfo = STATUS_LABELS[editedTask.status];

  // Tags logic
  const toggleTag = (tag: import("@/lib/mock-data").Tag) => {
    const has = editedTask.tags.some((t) => t.id === tag.id);
    update({ tags: has ? editedTask.tags.filter((t) => t.id !== tag.id) : [...editedTask.tags, tag] });
  };
  const removeTagGlobal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const idx = TAGS.findIndex(t => t.id === id);
    if (idx !== -1) TAGS.splice(idx, 1);
    update({ tags: editedTask.tags.filter((t) => t.id !== id) });
  };
  const createGlobalTag = (label: string) => {
    const fresh = { id: `tg-${Date.now()}`, label, color: "bg-primary/20 text-primary" };
    TAGS.push(fresh);
    update({ tags: [...editedTask.tags, fresh] });
    setNewTagStr("");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer — bottom sheet on mobile, right panel on desktop */}
      <div className="
        fixed z-50 bg-[#111111] border-border flex flex-col shadow-2xl
        animate-in duration-300
        /* mobile: full-width bottom sheet */
        bottom-0 left-0 right-0 top-[10vh] rounded-t-2xl border-t
        /* desktop: right side drawer */
        md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-full md:max-w-[600px] md:border-l md:border-t-0 md:rounded-none md:rounded-l-xl
        slide-in-from-bottom md:slide-in-from-right
      ">

        {/* Mobile drag handle */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {editedTask.id}
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${editedTask.projectColor}`} />
              <span className="text-xs text-muted-foreground">{editedTask.projectName}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShareModal(true)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Настройка доступа"
            >
              <Users className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(editedTask.id)}
                className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Удалить задачу"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Title */}
          <div className="px-5 py-4">
            {editingTitle ? (
              <input
                autoFocus
                className="w-full text-[20px] font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                value={editedTask.title}
                onChange={(e) => update({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
              />
            ) : (
              <h2
                className="text-[20px] font-bold text-foreground cursor-text hover:text-primary transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {editedTask.title}
              </h2>
            )}
          </div>

          {/* Meta Fields */}
          <div className="px-5 pb-4 flex flex-col gap-1">

            {/* Status */}
            <MetaRow icon={<Flag className="w-4 h-4" />} label="Статус">
              <select
                value={editedTask.status}
                onChange={(e) => update({ status: e.target.value as Status })}
                className={`bg-transparent border-none outline-none text-sm font-medium cursor-pointer ${statusInfo.color}`}
              >
                {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                  <option key={s} value={s} className="bg-[#1e1e1e] text-foreground">
                    {STATUS_LABELS[s].label}
                  </option>
                ))}
              </select>
            </MetaRow>

            {/* Priority */}
            <MetaRow icon={<Flag className="w-4 h-4" />} label="Приоритет">
              <select
                value={editedTask.priority}
                onChange={(e) => update({ priority: e.target.value as Priority })}
                className={`bg-transparent border-none outline-none text-sm font-medium cursor-pointer ${priorityInfo.color}`}
              >
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
                  <option key={p} value={p} className="bg-[#1e1e1e] text-foreground">
                    {PRIORITY_LABELS[p].label}
                  </option>
                ))}
              </select>
            </MetaRow>

            {/* Dates */}
            <MetaRow icon={<Calendar className="w-4 h-4" />} label="Сроки">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="date"
                  value={editedTask.startDate || ""}
                  onChange={(e) => update({ startDate: e.target.value })}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  placeholder="Выдан"
                  title="Дата выдачи"
                  className="bg-transparent border-none outline-none cursor-pointer text-muted-foreground w-[115px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                />
                <span className="text-muted-foreground/30">—</span>
                <input
                  type="date"
                  value={editedTask.dueDate || ""}
                  onChange={(e) => update({ dueDate: e.target.value })}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  placeholder="Дедлайн"
                  title="Дедлайн"
                  className="bg-transparent border-none outline-none cursor-pointer w-[115px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute"
                />
              </div>
            </MetaRow>

            {/* Assignees — multiple */}
            <MetaRow icon={<Users className="w-4 h-4" />} label="Исполнители">
              <div className="flex flex-wrap items-center gap-1.5 relative">
                {/* Current assignees */}
                {editedTask.assignees.map((a) => (
                  <div key={a.id} className="flex items-center gap-1 bg-secondary/60 border border-border rounded-full pl-1 pr-2 py-0.5 group/chip">
                    <div className={`w-5 h-5 rounded-full ${a.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                      {a.initials[0]}
                    </div>
                    <span className="text-xs text-foreground">{a.name.split(" ")[0]}</span>
                    <button
                      onClick={() => removeAssignee(a.id)}
                      className="opacity-0 group-hover/chip:opacity-100 ml-0.5 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add assignee button */}
                <div className="relative">
                  <button
                    onClick={() => setAssigneePicker((p) => !p)}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + Добавить
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {/* Dropdown */}
                  {assigneePicker && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-10 py-1 overflow-hidden">
                      {allMembers.length === 0 && (
                        <p className="text-xs text-muted-foreground px-3 py-2">Нет участников в команде</p>
                      )}
                      {allMembers.map((m) => {
                        const selected = editedTask.assignees.some((a) => a.id === m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleAssignee(m)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                              {m.initials}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-foreground">{m.name}</div>
                            </div>
                            {selected && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </MetaRow>

            {/* Tags */}
            <MetaRow icon={<Tag className="w-4 h-4" />} label="Теги">
              <div className="flex flex-wrap items-center gap-1.5 relative">
                {editedTask.tags.map((tag) => (
                  <span key={tag.id} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium group/tg ${tag.color}`}>
                    {tag.label}
                    <button
                      onClick={() => toggleTag(tag)}
                      className="opacity-0 group-hover/tg:opacity-100 transition-opacity text-current hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                
                <div className="relative">
                  <button
                    onClick={() => setTagPicker((p) => !p)}
                    className="text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    + Добавить
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {tagPicker && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-10 py-2 flex flex-col gap-1 overflow-hidden">
                      <div className="px-2 pb-2 border-b border-border mb-1">
                        <input
                          autoFocus
                          value={newTagStr}
                          onChange={(e) => setNewTagStr(e.target.value)}
                          placeholder="Новый тег..."
                          className="w-full bg-secondary/50 rounded-lg px-2 py-1 text-xs text-foreground outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTagStr.trim()) createGlobalTag(newTagStr.trim());
                          }}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        {TAGS.filter(t => t.label.toLowerCase().includes(newTagStr.toLowerCase())).map((t) => {
                          const selected = editedTask.tags.some(x => x.id === t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => toggleTag(t)}
                              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 cursor-pointer transition-colors group/opt"
                            >
                              <div className="flex items-center gap-2">
                                {selected ? <Check className="w-3 h-3 text-primary" /> : <div className="w-3 h-3" />}
                                <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${t.color}`}>
                                  {t.label}
                                </span>
                              </div>
                              <button
                                onClick={(e) => removeTagGlobal(t.id, e)}
                                className="opacity-0 group-hover/opt:opacity-100 text-muted-foreground hover:text-red-400 p-0.5 transition-colors"
                                title="Удалить тег навсегда"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </MetaRow>

            {/* Contact */}
            <MetaRow icon={<BookUser className="w-4 h-4" />} label="Контакт">
              <div className="relative">
                {editedTask.contactId ? (() => {
                  const c = allContacts.find((x: any) => x.id === editedTask.contactId);
                  if (!c) return <span className="text-sm text-muted-foreground">Неизвестный контакт</span>;
                  const firstName = (c as any).firstName;
                  const lastName  = (c as any).lastName;
                  const phones    = (c as any).phones ?? [];
                  return (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 bg-secondary/60 border border-border rounded-full pl-1.5 pr-2 py-0.5 w-fit group/contact cursor-pointer" onClick={() => setContactPicker(!contactPicker)}>
                        <div className={`w-5 h-5 rounded-full ${(c as any).color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
                          {firstName?.[0]}{lastName?.[0]}
                        </div>
                        <span className="text-xs text-foreground truncate max-w-[120px]">{firstName} {lastName}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setContactEditModal(c as Contact); }}
                          className="opacity-0 group-hover/contact:opacity-100 ml-0.5 text-muted-foreground hover:text-primary transition-all"
                          title="Редактировать"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); update({ contactId: undefined }); }} className="opacity-0 group-hover/contact:opacity-100 ml-0.5 text-muted-foreground hover:text-red-400 transition-all">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {phones.length > 0 && (
                        <div className="flex flex-col gap-1 pl-1">
                          {phones.map((ph: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                              <a href={`tel:${ph.number}`} className="text-xs text-primary hover:underline">{ph.number}</a>
                              <span className="text-[10px] text-muted-foreground">{ph.label}</span>
                              <button onClick={() => copyPhone(ph.number)} className="text-muted-foreground hover:text-foreground transition-colors" title="Копировать">
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })() : (
                  <button
                    onClick={() => { setContactPicker(p => !p); setContactSearch(""); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    + Выбрать контакт
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}

                {/* Contact picker dropdown */}
                {contactPicker && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl z-10 py-2 flex flex-col gap-1 overflow-hidden">
                    <div className="px-2 pb-2 border-b border-border">
                      <input
                        autoFocus
                        value={contactSearch}
                        onChange={(e) => { setContactSearch(e.target.value); setContactNewName(e.target.value); }}
                        placeholder="Поиск контакта..."
                        className="w-full bg-secondary/50 rounded-lg px-2 py-1.5 text-xs text-foreground outline-none"
                      />
                    </div>
                    <div className="max-h-44 overflow-y-auto custom-scrollbar">
                      {(() => {
                        const q = contactSearch.toLowerCase();
                        const filtered = allContacts.filter((c: any) =>
                          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
                          (c.company ?? "").toLowerCase().includes(q)
                        );
                        return filtered.length > 0 ? filtered.map((c: any) => (
                          <button
                            key={c.id}
                            onClick={() => { update({ contactId: c.id }); setContactPicker(false); setContactSearch(""); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors group/citem"
                          >
                            <div className={`w-7 h-7 rounded-full ${c.color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                              {c.firstName?.[0]}{c.lastName?.[0]}
                            </div>
                            <div className="flex-1 truncate">
                              <div className="text-sm text-foreground truncate">{c.firstName} {c.lastName}</div>
                              {c.company && <div className="text-[10px] text-muted-foreground truncate">{c.company}</div>}
                            </div>
                            <div className="flex items-center gap-1">
                              {editedTask.contactId === c.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                              <button
                                onClick={(e) => { e.stopPropagation(); setContactPicker(false); setContactEditModal(c as Contact); }}
                                className="opacity-0 group-hover/citem:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-all"
                                title="Редактировать"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          </button>
                        )) : (
                          <div className="px-3 py-3 flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">Контакт не найден.</p>
                            <button
                              onClick={() => {
                                setContactNewName(contactSearch);
                                setContactPicker(false);
                                setContactEditModal("new");
                              }}
                              className="flex items-center gap-1.5 text-xs bg-primary/20 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/30 transition-colors w-full"
                            >
                              <Plus className="w-3 h-3" />
                              Создать &laquo;{contactSearch || "Новый контакт"}&raquo;
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </MetaRow>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Description */}
          <div className="px-5 py-4">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Описание
            </label>
            <textarea
              className="w-full min-h-[80px] bg-secondary/30 rounded-lg p-3 text-sm text-foreground border border-transparent hover:border-border focus:border-primary outline-none transition-colors resize-none placeholder:text-muted-foreground"
              placeholder="Добавьте описание задачи..."
              value={editedTask.description || ""}
              onChange={(e) => update({ description: e.target.value })}
            />
          </div>

          {/* Checklist */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" />
                Чеклист
              </label>
              <button className="text-xs text-primary hover:underline">+ Добавить пункт</button>
            </div>
            <div className="text-sm text-muted-foreground italic">Пусто — добавьте первый пункт</div>
          </div>

          {/* Attachments */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                Вложения
              </label>
              <button className="text-xs text-primary hover:underline">Прикрепить</button>
            </div>
            <div className="text-sm text-muted-foreground italic">Нет вложений</div>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Tabs */}
          <div className="px-5 pt-4">
            <div className="flex items-center gap-4 border-b border-border mb-4">
              {[
                { id: "comments" as const, label: "Комментарии", icon: <MessageSquare className="w-3.5 h-3.5" /> },
                { id: "activity" as const, label: "История",     icon: <Activity      className="w-3.5 h-3.5" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === "comments" && editedTask.comments.length > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">
                      {editedTask.comments.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "comments" && (
              <div className="flex flex-col gap-3 pb-6">
                {editedTask.comments.map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className={`w-7 h-7 rounded-full ${c.author.color} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                      {c.author.initials}
                    </div>
                    <div className="flex-1 bg-secondary/40 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{c.author.name}</span>
                        <span className="text-xs text-muted-foreground">{c.createdAt}</span>
                      </div>
                      <p className="text-sm text-foreground/80">{c.text}</p>
                    </div>
                  </div>
                ))}
                {editedTask.comments.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Нет комментариев. Будьте первым!</p>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <div className="pb-6 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Задача создана — <span className="text-foreground/60">{editedTask.createdAt}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="px-5 py-3 border-t border-border shrink-0 bg-[#111111]">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full ${CURRENT_USER.color} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
              {CURRENT_USER.initials}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-secondary/50 border border-border hover:border-primary/50 focus-within:border-primary rounded-lg px-3 py-2 transition-colors">
              <input
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                placeholder="Напишите комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className="text-primary disabled:text-muted-foreground transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Close pickers on outside click */}
      {(assigneePicker || tagPicker || contactPicker) && (
        <div
          className="fixed inset-0 z-[49]"
          onClick={() => { setAssigneePicker(false); setTagPicker(false); setContactPicker(false); }}
        />
      )}

      {/* Share Modal */}
      {shareModal && (
        <ShareModal
          defaultAccess={editedTask.defaultAccess ?? "view"}
          accessList={editedTask.accessList ?? []}
          onUpdate={(data) => update(data)}
          onClose={() => setShareModal(false)}
        />
      )}

      {/* Contact Create / Edit Modal */}
      {contactEditModal !== null && (
        <ContactFormModal
          initial={contactEditModal === "new" ? { firstName: contactNewName.split(" ")[0] || "", lastName: contactNewName.split(" ").slice(1).join(" ") || "" } : contactEditModal}
          isNew={contactEditModal === "new"}
          onSave={(c) => {
            if (contactEditModal === "new") {
              MOCK_CONTACTS.push(c);
              update({ contactId: c.id });
            } else {
              const idx = MOCK_CONTACTS.findIndex(x => x.id === c.id);
              if (idx !== -1) MOCK_CONTACTS[idx] = c;
              // if this contact is selected, trigger re-render
              if (editedTask.contactId === c.id) update({ contactId: c.id });
            }
            setContactEditModal(null);
          }}
          onClose={() => setContactEditModal(null)}
          onDelete={contactEditModal !== "new" ? () => {
            const id = (contactEditModal as Contact).id;
            const idx = MOCK_CONTACTS.findIndex(x => x.id === id);
            if (idx !== -1) MOCK_CONTACTS.splice(idx, 1);
            if (editedTask.contactId === id) update({ contactId: undefined });
            setContactEditModal(null);
          } : undefined}
        />
      )}
    </>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 hover:bg-secondary/20 rounded-md px-2 -mx-2 transition-colors">
      <span className="text-muted-foreground w-4 shrink-0 mt-0.5">{icon}</span>
      <span className="text-sm text-muted-foreground w-24 shrink-0 mt-0.5">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Contact Create / Edit Modal ──────────────────────────────────────────────

type ContactFormData = {
  firstName: string;
  lastName: string;
  company?: string;
  email?: string;
  phones: { label: string; number: string }[];
  color: string;
};

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-pink-500",
  "bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500",
];

const PHONE_LABELS = ["Мобильный","Рабочий","Домашний","Другой"];

function ContactFormModal({
  initial,
  isNew,
  onSave,
  onClose,
  onDelete,
}: {
  initial: Partial<Contact> & { firstName?: string; lastName?: string };
  isNew: boolean;
  onSave: (c: Contact) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<ContactFormData>({
    firstName: initial.firstName || "",
    lastName:  initial.lastName  || "",
    company:   initial.company   || "",
    email:     initial.email     || "",
    phones:    initial.phones?.length
      ? initial.phones.map(p => ({ label: p.label, number: p.number }))
      : [{ label: "Мобильный", number: "" }],
    color:     initial.color || "bg-violet-500",
  });
  const [error, setError] = useState("");

  const setField = (key: keyof ContactFormData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const updatePhone = (i: number, key: "label" | "number", val: string) =>
    setForm(f => ({ ...f, phones: f.phones.map((p, j) => j === i ? { ...p, [key]: val } : p) }));

  const addPhone = () =>
    setForm(f => ({ ...f, phones: [...f.phones, { label: "Мобильный", number: "" }] }));

  const removePhone = (i: number) =>
    setForm(f => ({ ...f, phones: f.phones.filter((_, j) => j !== i) }));

  const handleSave = () => {
    if (!form.firstName.trim()) { setError("Введите имя"); return; }
    const hasPhone = form.phones.some(p => p.number.trim());
    if (!hasPhone) { setError("Необходимо добавить хотя бы один номер телефона"); return; }
    const contact: Contact = {
      id: (initial as any).id || `ct-${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName:  form.lastName.trim(),
      company:   form.company?.trim() || undefined,
      email:     form.email?.trim()   || undefined,
      phones:    form.phones.filter(p => p.number.trim()),
      color:     form.color,
      createdAt: (initial as any).createdAt || new Date().toISOString().split("T")[0],
    };
    onSave(contact);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#111111] border border-border rounded-2xl w-full max-w-md shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground text-[15px]">
            {isNew ? "Новый контакт" : "Редактировать контакт"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-4 flex flex-col gap-4">
          {/* Avatar color picker */}
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full ${form.color} flex items-center justify-center text-white font-bold text-lg shrink-0`}>
              {form.firstName?.[0]?.toUpperCase() || "?"}{form.lastName?.[0]?.toUpperCase() || ""}
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setField("color", c)}
                  className={`w-6 h-6 rounded-full ${c} border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Имя *</label>
              <input
                autoFocus
                value={form.firstName}
                onChange={e => setField("firstName", e.target.value)}
                placeholder="Имя"
                className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Фамилия</label>
              <input
                value={form.lastName}
                onChange={e => setField("lastName", e.target.value)}
                placeholder="Фамилия"
                className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Company & Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Компания</label>
              <input
                value={form.company || ""}
                onChange={e => setField("company", e.target.value)}
                placeholder="Компания"
                className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
              <input
                type="email"
                value={form.email || ""}
                onChange={e => setField("email", e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
              />
            </div>
          </div>

          {/* Phones — required */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Phone className="w-3 h-3" /> Телефоны *
              </label>
              <button onClick={addPhone} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Добавить
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {form.phones.map((ph, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={ph.label}
                    onChange={e => updatePhone(i, "label", e.target.value)}
                    className="bg-secondary/50 border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none w-28 shrink-0"
                  >
                    {PHONE_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    value={ph.number}
                    onChange={e => updatePhone(i, "number", e.target.value)}
                    placeholder="06543354 / +373354233"
                    type="tel"
                    className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-primary outline-none transition-colors"
                  />
                  {form.phones.length > 1 && (
                    <button onClick={() => removePhone(i)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border">
          <div>
            {!isNew && onDelete && (
              <button
                onClick={() => {
                  if (!confirm("Удалить этот контакт?")) return;
                  onDelete();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Удалить контакт
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Отмена
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/80 transition-colors"
            >
              {isNew ? "Создать" : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
