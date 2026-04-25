"use client";

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import {
  Plus, Trash2, Type, Hash, Calendar, ChevronDown, MoreHorizontal,
  AlignLeft, ToggleLeft, User, Check,
} from "lucide-react";
import { SpreadsheetDoc, SpreadsheetColumn, SpreadsheetRow, CellType } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";

// ─── Column type metadata ─────────────────────────────────────────────────────

const CELL_TYPE_META: Record<CellType, { label: string; icon: React.ReactNode }> = {
  text:   { label: "Текст",     icon: <AlignLeft className="w-3.5 h-3.5" /> },
  number: { label: "Число",     icon: <Hash className="w-3.5 h-3.5" />      },
  select: { label: "Список",    icon: <ToggleLeft className="w-3.5 h-3.5" />},
  date:   { label: "Дата",      icon: <Calendar className="w-3.5 h-3.5" />  },
  status: { label: "Статус",    icon: <Check className="w-3.5 h-3.5" />     },
  person: { label: "Исполнитель",icon: <User className="w-3.5 h-3.5" />    },
};

const STATUS_COLORS: Record<string, string> = {
  "Готово":          "text-emerald-400 bg-emerald-400/15",
  "В работе":        "text-amber-400 bg-amber-400/15",
  "Запланировано":   "text-blue-400 bg-blue-400/15",
  "Черновик":        "text-slate-400 bg-slate-400/15",
  "Утверждено":      "text-emerald-400 bg-emerald-400/15",
  "Deprecated":      "text-red-400 bg-red-400/15",
  "Отложено":        "text-red-400 bg-red-400/15",
  "Идея":            "text-purple-400 bg-purple-400/15",
  "Готово к работе": "text-blue-400 bg-blue-400/15",
};

// ─── Cell Display ─────────────────────────────────────────────────────────────

function CellDisplay({ value, col }: { value: string; col: SpreadsheetColumn }) {
  if (!value) return <span className="text-muted-foreground/40 select-none">—</span>;

  if (col.type === "status" || (col.type === "select" && STATUS_COLORS[value])) {
    const color = STATUS_COLORS[value] ?? "text-muted-foreground bg-secondary";
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
        {value}
      </span>
    );
  }

  if (col.type === "person") {
    const members = useAppStore((s) => s.members);
    const member = members.find((m) => m.id === value);
    if (!member) return <span className="text-muted-foreground/40">—</span>;
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-5 h-5 rounded-full ${member.color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
          {member.initials[0]}
        </div>
        <span className="text-[12px] text-foreground truncate">{member.name.split(" ")[0]}</span>
      </div>
    );
  }

  if (col.type === "date" && value) {
    try {
      const d = new Date(value);
      return <span className="text-[12px] text-foreground">{d.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "2-digit" })}</span>;
    } catch { return <span className="text-[12px] text-foreground">{value}</span>; }
  }

  return <span className="text-[12px] text-foreground truncate">{value}</span>;
}

// ─── Cell Editor ──────────────────────────────────────────────────────────────

function CellEditor({
  value, col, onChange, onCommit, onAbort, onAddOption,
}: {
  value: string;
  col: SpreadsheetColumn;
  onChange: (v: string) => void;
  onCommit: () => void;
  onAbort: () => void;
  onAddOption?: (option: string) => void;
}) {
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const [newOpt, setNewOpt] = useState("");
  const [addingOpt, setAddingOpt] = useState(false);

  useEffect(() => { (ref.current as any)?.focus(); }, []);

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); onCommit(); }
    if (e.key === "Escape") { e.preventDefault(); onAbort(); }
  };

  // Select/Status: datalist (allows custom value + known options)
  if (col.type === "select" || col.type === "status") {
    const listId = `dl-${col.id}`;
    return (
      <div className="w-full flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <input
            ref={ref as any}
            list={listId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            onBlur={onCommit}
            placeholder="Выберите или введите..."
            className="flex-1 bg-transparent text-foreground text-[12px] outline-none border-none"
          />
          <datalist id={listId}>
            {col.options?.map((o) => <option key={o} value={o} />)}
          </datalist>
        </div>
        {onAddOption && (
          addingOpt ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                autoFocus
                value={newOpt}
                onChange={(e) => setNewOpt(e.target.value)}
                placeholder="Новый статус..."
                className="flex-1 bg-secondary/50 rounded px-1.5 py-0.5 text-[11px] text-foreground outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOpt.trim()) {
                    onAddOption(newOpt.trim());
                    onChange(newOpt.trim());
                    setAddingOpt(false);
                    setNewOpt("");
                    onCommit();
                  }
                  if (e.key === "Escape") setAddingOpt(false);
                }}
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingOpt(true)}
              className="text-[10px] text-primary hover:underline text-left w-fit"
            >
              + Добавить вариант
            </button>
          )
        )}
      </div>
    );
  }

  if (col.type === "person") {
    const members = useAppStore((s) => s.members);
    return (
      <select
        ref={ref as any}
        value={value}
        onChange={(e) => { onChange(e.target.value); onCommit(); }}
        onKeyDown={handleKey}
        onBlur={onCommit}
        className="w-full bg-[#1e1e1e] text-foreground text-[12px] border-none outline-none"
      >
        <option value="">—</option>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    );
  }

  if (col.type === "date") {
    return (
      <input
        ref={ref as any}
        type="date"
        value={value}
        min="2000-01-01"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
        className="w-full bg-transparent text-foreground text-[12px] outline-none border-none"
      />
    );
  }

  if (col.type === "number") {
    return (
      <input
        ref={ref as any}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        onBlur={onCommit}
        className="w-full bg-transparent text-foreground text-[12px] outline-none border-none text-right"
      />
    );
  }

  return (
    <input
      ref={ref as any}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKey}
      onBlur={onCommit}
      className="w-full bg-transparent text-foreground text-[12px] outline-none border-none"
    />
  );
}

// ─── Add Column Modal ─────────────────────────────────────────────────────────

function AddColumnModal({ onAdd, onClose }: { onAdd: (col: Omit<SpreadsheetColumn, "id">) => void; onClose: () => void }) {
  const [name, setName] = useState("Новая колонка");
  const [type, setType] = useState<CellType>("text");
  const [options, setOptions] = useState("");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-border rounded-2xl w-full max-w-sm p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground mb-4">Добавить колонку</h3>

        <label className="text-xs text-muted-foreground mb-1 block">Название</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary mb-3"
        />

        <label className="text-xs text-muted-foreground mb-1 block">Тип поля</label>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {(Object.keys(CELL_TYPE_META) as CellType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-colors ${
                type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              }`}
            >
              {CELL_TYPE_META[t].icon}
              {CELL_TYPE_META[t].label}
            </button>
          ))}
        </div>

        {(type === "select" || type === "status") && (
          <>
            <label className="text-xs text-muted-foreground mb-1 block">Варианты (через запятую)</label>
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="Вариант 1, Вариант 2..."
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary mb-3"
            />
          </>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Отмена
          </button>
          <button
            onClick={() => {
              onAdd({ name, type, width: 160, options: options ? options.split(",").map((s) => s.trim()) : undefined });
              onClose();
            }}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Spreadsheet Component ───────────────────────────────────────────────

interface SpreadsheetProps {
  doc: SpreadsheetDoc;
  canEdit: boolean;
  onChange: (doc: SpreadsheetDoc) => void;
}

type CellCoord = { rowId: string; colId: string } | null;

export function Spreadsheet({ doc, canEdit, onChange }: SpreadsheetProps) {
  const [selected,    setSelected]    = useState<CellCoord>(null);
  const [editing,     setEditing]     = useState<CellCoord>(null);
  const [editValue,   setEditValue]   = useState("");
  const [addColModal, setAddColModal] = useState(false);
  const [hoveredRow,  setHoveredRow]  = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { columns, rows } = doc;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getCell = (rowId: string, colId: string) =>
    rows.find((r) => r.id === rowId)?.cells[colId] ?? "";

  const updateCell = (rowId: string, colId: string, value: string) => {
    onChange({
      ...doc,
      rows: rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
      ),
    });
  };

  const startEdit = (rowId: string, colId: string) => {
    if (!canEdit) return;
    setEditing({ rowId, colId });
    setEditValue(getCell(rowId, colId));
  };

  const commitEdit = () => {
    if (editing) {
      updateCell(editing.rowId, editing.colId, editValue);
    }
    setEditing(null);
  };

  const abortEdit = () => {
    setEditing(null);
    setEditValue("");
  };

  const addRow = () => {
    const newRow: SpreadsheetRow = {
      id: `r-${Date.now()}`,
      cells: Object.fromEntries(columns.map((c) => [c.id, ""])),
    };
    onChange({ ...doc, rows: [...rows, newRow] });
  };

  const deleteRow = (rowId: string) => {
    onChange({ ...doc, rows: rows.filter((r) => r.id !== rowId) });
    setContextMenu(null);
  };

  const addColumn = (col: Omit<SpreadsheetColumn, "id">) => {
    const newCol: SpreadsheetColumn = { ...col, id: `c-${Date.now()}` };
    const newRows = rows.map((r) => ({ ...r, cells: { ...r.cells, [newCol.id]: "" } }));
    onChange({ ...doc, columns: [...columns, newCol], rows: newRows });
  };

  /** Add a new option to a select/status column's options list */
  const addOptionToColumn = (colId: string, option: string) => {
    onChange({
      ...doc,
      columns: columns.map((c) =>
        c.id === colId
          ? { ...c, options: [...(c.options ?? []), option] }
          : c
      ),
    });
  };

  const deleteColumn = (colId: string) => {
    onChange({
      ...doc,
      columns: columns.filter((c) => c.id !== colId),
      rows: rows.map((r) => {
        const cells = { ...r.cells };
        delete cells[colId];
        return { ...r, cells };
      }),
    });
  };

  const navigateCell = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!selected || editing) return;
    const rowIdx = rows.findIndex((r) => r.id === selected.rowId);
    const colIdx = columns.findIndex((c) => c.id === selected.colId);
    let nextRow = rowIdx, nextCol = colIdx;
    if (e.key === "ArrowDown"  || e.key === "Enter")  nextRow = Math.min(rowIdx + 1, rows.length - 1);
    if (e.key === "ArrowUp")    nextRow = Math.max(rowIdx - 1, 0);
    if (e.key === "ArrowRight" || e.key === "Tab")     nextCol = Math.min(colIdx + 1, columns.length - 1);
    if (e.key === "ArrowLeft")  nextCol = Math.max(colIdx - 1, 0);
    if (nextRow !== rowIdx || nextCol !== colIdx) {
      e.preventDefault();
      setSelected({ rowId: rows[nextRow].id, colId: columns[nextCol].id });
    }
    // Start typing = enter edit
    if (e.key.length === 1 && canEdit) {
      startEdit(selected.rowId, selected.colId);
      setEditValue(e.key);
    }
    if (e.key === "F2" && canEdit) startEdit(selected.rowId, selected.colId);
  };

  // Close context menu on outside click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // ── Grid layout ───────────────────────────────────────────────────────────────
  // row# col + all data columns + (+) add col
  const totalWidth = 48 + columns.reduce((s, c) => s + c.width, 0) + 52;

  return (
    <div className="flex flex-col h-full">
      {addColModal && (
        <AddColumnModal onAdd={addColumn} onClose={() => setAddColModal(false)} />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#1a1a1a] border border-border rounded-xl shadow-2xl py-1.5 w-44"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => deleteRow(contextMenu.rowId)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Удалить строку
          </button>
        </div>
      )}

      {/* Grid wrapper */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto custom-scrollbar focus:outline-none"
        tabIndex={0}
        onKeyDown={navigateCell}
      >
        <div style={{ minWidth: totalWidth }}>
          {/* ── Header Row ── */}
          <div className="flex sticky top-0 z-10 bg-[#111111] border-b-2 border-border">
            {/* Row # header */}
            <div className="w-12 shrink-0 flex items-center justify-center border-r border-border bg-[#111111]">
              <span className="text-[10px] text-muted-foreground">#</span>
            </div>

            {/* Column headers */}
            {columns.map((col, ci) => (
              <div
                key={col.id}
                style={{ width: col.width, minWidth: col.width }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 border-r border-border group/colhdr hover:bg-secondary/30 transition-colors"
              >
                <span className="text-muted-foreground">{CELL_TYPE_META[col.type].icon}</span>
                <span className="text-[12px] font-medium text-foreground flex-1 truncate">{col.name}</span>
                {canEdit && (
                  <button
                    onClick={() => deleteColumn(col.id)}
                    className="opacity-0 group-hover/colhdr:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                    title="Удалить колонку"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add column button */}
            {canEdit && (
              <div className="w-13 shrink-0 flex items-center justify-center border-l border-border">
                <button
                  onClick={() => setAddColModal(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Добавить колонку"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── Data Rows ── */}
          {rows.map((row, ri) => (
            <div
              key={row.id}
              className={`flex border-b border-border/40 group/row transition-colors ${
                hoveredRow === row.id ? "bg-secondary/20" : ""
              }`}
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Row number */}
              <div
                className="w-12 shrink-0 flex items-center justify-center border-r border-border/40 text-[11px] text-muted-foreground select-none cursor-default"
                onContextMenu={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, rowId: row.id });
                }}
              >
                <span className="group-hover/row:hidden">{ri + 1}</span>
                {canEdit && (
                  <button
                    className="hidden group-hover/row:flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors"
                    onClick={() => deleteRow(row.id)}
                    title="Удалить строку"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Data cells */}
              {columns.map((col) => {
                const isSelected = selected?.rowId === row.id && selected?.colId === col.id;
                const isEditing  = editing?.rowId === row.id && editing?.colId === col.id;

                return (
                  <div
                    key={col.id}
                    style={{ width: col.width, minWidth: col.width }}
                    className={`shrink-0 relative border-r border-border/40 px-3 py-2 cursor-cell overflow-hidden transition-colors ${
                      isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/60" : ""
                    }`}
                    onClick={() => {
                      setSelected({ rowId: row.id, colId: col.id });
                      if (canEdit && (col.type === "select" || col.type === "status" || col.type === "person" || col.type === "date")) {
                        startEdit(row.id, col.id);
                      }
                    }}
                    onDoubleClick={() => startEdit(row.id, col.id)}
                  >
                    {isEditing ? (
                      <CellEditor
                        value={editValue}
                        col={col}
                        onChange={setEditValue}
                        onCommit={commitEdit}
                        onAbort={abortEdit}
                        onAddOption={(col.type === "select" || col.type === "status") ? (opt) => addOptionToColumn(col.id, opt) : undefined}
                      />
                    ) : (
                      <CellDisplay value={row.cells[col.id] ?? ""} col={col} />
                    )}
                  </div>
                );
              })}

              {/* Spacer for add col button */}
              <div className="w-13 shrink-0" />
            </div>
          ))}

          {/* ── Add Row ── */}
          {canEdit && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary/20 cursor-pointer border-b border-border/20 transition-colors group"
              onClick={addRow}
            >
              <div className="w-12 shrink-0 flex items-center justify-center">
                <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
              </div>
              <span>Добавить строку</span>
            </div>
          )}

          {/* Empty state */}
          {rows.length === 0 && !canEdit && (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Таблица пуста
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground shrink-0">
        <span>{rows.length} строк · {columns.length} колонок</span>
        {!canEdit && (
          <span className="flex items-center gap-1 text-amber-400/70">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
            Только просмотр
          </span>
        )}
        {selected && (
          <span>Ячейка {columns.findIndex(c => c.id === selected.colId) + 1}:{rows.findIndex(r => r.id === selected.rowId) + 1}</span>
        )}
      </div>
    </div>
  );
}
