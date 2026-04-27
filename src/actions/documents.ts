"use server";

import { api, DocumentDTO } from "@/lib/api";
import { getToken } from "./workspace";
import type { SpreadsheetDoc, SpreadsheetColumn, SpreadsheetRow, DocAccessEntry } from "@/lib/mock-data";

const log = (lvl: "info" | "error", fn: string, msg: string, d?: unknown) => {
  const pre = `[Documents/${fn}]`;
  if (lvl === "error") console.error(`❌ ${pre} ${msg}`, d ?? "");
  else                  console.log (`✅ ${pre} ${msg}`, d ?? "");
};

// ─── Serialization ───────────────────────────────────────────────────────────
//
// The backend stores the rich spreadsheet payload (columns / rows / access)
// inside the `content` Text column as a JSON blob. Title and icon stay in
// their own columns so that list responses are cheap.

type DocPayload = {
  columns: SpreadsheetColumn[];
  rows: SpreadsheetRow[];
  defaultAccess: SpreadsheetDoc["defaultAccess"];
  accessList: DocAccessEntry[];
};

function emptyPayload(): DocPayload {
  return { columns: [], rows: [], defaultAccess: "edit", accessList: [] };
}

function parseContent(content: string | null | undefined): DocPayload {
  if (!content) return emptyPayload();
  try {
    const parsed = JSON.parse(content);
    return {
      columns:       Array.isArray(parsed.columns) ? parsed.columns : [],
      rows:          Array.isArray(parsed.rows)    ? parsed.rows    : [],
      defaultAccess: parsed.defaultAccess ?? "edit",
      accessList:    Array.isArray(parsed.accessList) ? parsed.accessList : [],
    };
  } catch {
    return emptyPayload();
  }
}

function dtoToDoc(d: DocumentDTO): SpreadsheetDoc {
  const payload = parseContent(d.content);
  return {
    id: d.id,
    title: d.title,
    icon: d.icon ?? "📄",
    columns: payload.columns,
    rows: payload.rows,
    defaultAccess: payload.defaultAccess,
    accessList: payload.accessList,
    createdAt: typeof d.createdAt === "string" ? d.createdAt.slice(0, 10) : "",
    updatedAt: typeof d.updatedAt === "string" ? d.updatedAt.slice(0, 16).replace("T", " ") : "",
  };
}

function serializePayload(doc: Partial<SpreadsheetDoc>): string {
  const payload: DocPayload = {
    columns:       doc.columns       ?? [],
    rows:          doc.rows          ?? [],
    defaultAccess: doc.defaultAccess ?? "edit",
    accessList:    doc.accessList    ?? [],
  };
  return JSON.stringify(payload);
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function listDocuments(workspaceId: string): Promise<SpreadsheetDoc[]> {
  const token = await getToken();
  if (!token) { log("error", "list", "No token"); return []; }
  try {
    const dtos = await api.documents.list(token, workspaceId);
    log("info", "list", `wsId=${workspaceId} → ${dtos.length} docs`);
    return dtos.map(dtoToDoc);
  } catch (e: any) {
    log("error", "list", e?.message || String(e));
    return [];
  }
}

export async function createDocument(workspaceId: string, doc: SpreadsheetDoc) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" } as const;
  try {
    const dto = await api.documents.create(token, workspaceId, {
      title:   doc.title,
      icon:    doc.icon,
      content: serializePayload(doc),
    });
    return { doc: dtoToDoc(dto) } as const;
  } catch (e: any) {
    log("error", "create", e?.message || String(e));
    return { error: e?.message || "Ошибка сервера" } as const;
  }
}

export async function updateDocument(docId: string, doc: SpreadsheetDoc) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" } as const;
  try {
    const dto = await api.documents.update(token, docId, {
      title:   doc.title,
      icon:    doc.icon,
      content: serializePayload(doc),
    });
    return { doc: dtoToDoc(dto) } as const;
  } catch (e: any) {
    log("error", "update", e?.message || String(e));
    return { error: e?.message || "Ошибка сервера" } as const;
  }
}

export async function deleteDocument(docId: string) {
  const token = await getToken();
  if (!token) return { error: "Нет авторизации" } as const;
  try {
    await api.documents.delete(token, docId);
    return { success: true } as const;
  } catch (e: any) {
    log("error", "delete", e?.message || String(e));
    return { error: e?.message || "Ошибка сервера" } as const;
  }
}
