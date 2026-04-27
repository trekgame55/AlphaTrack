"use client";

import { useState } from "react";
import {
  Search, Plus, Phone, Copy, Mail, Building2, X, Check,
  UserCircle2, Trash2, ChevronDown,
} from "lucide-react";
import { useWorkspace, WsContact } from "@/lib/workspace-context";
import { createContact, updateContact as updateContactAction, deleteContact as deleteContactAction } from "@/actions/contacts";
import type { ContactPhone } from "@/lib/mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(c: WsContact) {
  return `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase() || "?";
}

function formatPhone(raw: string) {
  // Keep as-is for display — just trim
  return raw.trim();
}

const AVATAR_COLORS = [
  "bg-violet-500","bg-blue-500","bg-emerald-500","bg-amber-500",
  "bg-pink-500","bg-rose-500","bg-cyan-500","bg-indigo-500",
];

const PHONE_LABELS = ["Мобильный", "Рабочий", "Домашний", "Другой"];

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title="Скопировать"
      className={`flex items-center justify-center rounded-md transition-all ${
        copied ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Add / Edit Contact Modal ─────────────────────────────────────────────────

function ContactModal({
  contact,
  onSave,
  onClose,
}: {
  contact?: WsContact;
  onSave: (c: WsContact) => void;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState(contact?.firstName ?? "");
  const [lastName,  setLastName]  = useState(contact?.lastName ?? "");
  const [company,   setCompany]   = useState(contact?.company ?? "");
  const [email,     setEmail]     = useState(contact?.email ?? "");
  const [phones,    setPhones]    = useState<ContactPhone[]>(
    contact?.phones?.length ? contact.phones : [{ label: "Мобильный", number: "" }]
  );
  const [color, setColor] = useState(contact?.color ?? AVATAR_COLORS[0]);

  const addPhone = () => setPhones((p) => [...p, { label: "Мобильный", number: "" }]);
  const removePhone = (i: number) => setPhones((p) => p.filter((_, idx) => idx !== i));
  const setPhone = (i: number, patch: Partial<ContactPhone>) =>
    setPhones((p) => p.map((ph, idx) => (idx === i ? { ...ph, ...patch } : ph)));

  const valid = firstName.trim().length > 0;

  const save = () => {
    if (!valid) return;
    onSave({
      id: contact?.id ?? `ct-${Date.now()}`,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
      phones: phones.filter(p => p.number.trim()),
      color,
    } as WsContact);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">{contact ? "Редактировать контакт" : "Новый контакт"}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto custom-scrollbar flex flex-col gap-3">
          {/* Avatar color */}
          <div className="flex justify-center mb-1">
            <div className={`w-16 h-16 rounded-full ${color} flex items-center justify-center text-white text-2xl font-bold`}>
              {firstName[0] ?? "?"}
              {lastName[0] ?? ""}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center mb-1">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full ${c} transition-all ${color === c ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"}`}
              />
            ))}
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Имя *</label>
              <input
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Фамилия</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Петров"
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Компания</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="AlphaTrack Ltd"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ivan@example.com"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>

          {/* Phones */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Телефоны</label>
            <div className="flex flex-col gap-2">
              {phones.map((ph, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    value={ph.label}
                    onChange={(e) => setPhone(i, { label: e.target.value })}
                    className="bg-secondary/50 border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none focus:border-primary w-32 shrink-0"
                  >
                    {PHONE_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input
                    value={ph.number}
                    onChange={(e) => setPhone(i, { number: e.target.value })}
                    placeholder="+37385635380"
                    type="tel"
                    className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                  {phones.length > 1 && (
                    <button onClick={() => removePhone(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addPhone}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors w-fit"
              >
                <Plus className="w-3.5 h-3.5" /> Добавить номер
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            disabled={!valid}
            onClick={save}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {contact ? "Сохранить" : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: WsContact;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-[#111111] border border-border hover:border-primary/30 rounded-xl p-4 transition-all group cursor-pointer"
      onClick={() => setExpanded((p) => !p)}
    >
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-full ${contact.color} flex items-center justify-center text-white text-[15px] font-bold shrink-0`}>
          {initials(contact)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {contact.firstName} {contact.lastName}
          </p>
          {contact.company && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3 shrink-0" />
              {contact.company}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Редактировать"
          >
            <UserCircle2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Phones */}
          {contact.phones.map((ph, i) => (
            <div key={i} className="flex items-center justify-between gap-2 group/phone">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-20 shrink-0">{ph.label}</span>
                <span className="text-sm text-foreground font-mono truncate">{formatPhone(ph.number)}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <CopyButton text={ph.number} className="w-7 h-7" />
                {/* Call button — tel: link, especially useful on mobile */}
                <a
                  href={`tel:${ph.number.replace(/\s/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Позвонить"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}

          {/* Email */}
          {contact.email && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground w-20 shrink-0">Email</span>
                <span className="text-sm text-foreground truncate">{contact.email}</span>
              </div>
              <CopyButton text={contact.email} className="w-7 h-7" />
            </div>
          )}
        </div>
      )}

      {/* Mobile quick-action bar (always visible on touch) */}
      {contact.phones.length > 0 && (
        <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <a
            href={`tel:${contact.phones[0].number.replace(/\s/g, "")}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Phone className="w-4 h-4" />
            Позвонить
          </a>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await navigator.clipboard.writeText(contact.phones[0].number);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg text-sm transition-colors"
          >
            <Copy className="w-4 h-4" />
            Скопировать
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Contacts Page ───────────────────────────────────────────────────────

const ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export default function ContactsPage() {
  const { workspace, contacts: wsContacts, setContacts } = useWorkspace();

  const [search,   setSearch]   = useState("");
  const [modal,    setModal]    = useState<{ contact?: WsContact } | null>(null);

  const filtered = wsContacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.phones.some((p) => p.number.includes(q))
    );
  });

  const grouped = filtered.reduce<Record<string, WsContact[]>>((acc, c) => {
    const letter = (c.lastName[0] ?? c.firstName[0] ?? "#").toUpperCase();
    acc[letter] = [...(acc[letter] ?? []), c];
    return acc;
  }, {});

  const sortedLetters = Object.keys(grouped).sort();

  const saveContact = async (c: WsContact) => {
    if (!workspace) return;
    const exists = wsContacts.find(p => p.id === c.id);
    if (exists) {
      // Optimistic update
      setContacts(wsContacts.map(p => p.id === c.id ? c : p));
      const res = await updateContactAction(c.id, {
        firstName: c.firstName, lastName: c.lastName,
        company: c.company ?? undefined, email: c.email ?? undefined,
        phones: c.phones,
      });
      if ((res as any)?.error) {
        console.error("[contacts] update failed:", (res as any).error);
        alert("Ошибка обновления: " + (res as any).error);
        return;
      }
      setModal(null);
    } else {
      const res = await createContact(workspace.id, {
        firstName: c.firstName, lastName: c.lastName,
        company: c.company ?? undefined, email: c.email ?? undefined,
        color: c.color, phones: c.phones,
      });
      if ("error" in res) {
        console.error("[contacts] create failed:", res.error);
        alert("Ошибка создания: " + res.error);
        return;
      }
      if (res.contact) setContacts([res.contact as unknown as WsContact, ...wsContacts]);
      setModal(null);
    }
  };

  const handleDelete = async (id: string) => {
    setContacts(wsContacts.filter(c => c.id !== id));
    await deleteContactAction(id);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {modal !== null && (
        <ContactModal
          contact={modal.contact}
          onSave={saveContact}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 bg-secondary/40 border border-border hover:border-primary/40 focus-within:border-primary rounded-lg px-3 py-2 transition-colors">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Поиск по имени, компании, номеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/80 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Добавить контакт</span>
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-5 text-xs text-muted-foreground">
        <span>{wsContacts.length} контактов</span>
        {search && <span>Найдено: {filtered.length}</span>}
      </div>

      {/* Contact list grouped by letter */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        {sortedLetters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserCircle2 className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Нет контактов{search ? " по запросу" : ""}</p>
            {!search && (
              <button onClick={() => setModal({})} className="mt-3 text-sm text-primary hover:underline">
                + Добавить первый контакт
              </button>
            )}
          </div>
        )}

        {sortedLetters.map((letter) => (
          <div key={letter} className="mb-6">
            {/* Letter divider */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {letter}
              </div>
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[11px] text-muted-foreground">{grouped[letter].length}</span>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {grouped[letter].map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onEdit={() => setModal({ contact: c })}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
