/**
 * Input sanitization & injection protection
 * Applies to all user-supplied text (names, titles, comments, etc.)
 * Prevents: XSS, HTML injection, SQL-like injection patterns, null bytes, unicode tricks
 */

// Strip HTML tags completely
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

// Remove null bytes and control characters (except newlines/tabs)
function stripControlChars(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

// Limit consecutive whitespace
function normalizeWhitespace(str: string): string {
  return str.replace(/[ \t]{2,}/g, " ").trim();
}

// Detect obvious SQL injection patterns — throw if found
const SQL_PATTERNS = [
  /('|"|`)\s*(or|and)\s*('|"|`|[0-9])/i,
  /;\s*(drop|delete|truncate|alter|insert|update|create|replace)\s/i,
  /union\s+(all\s+)?select/i,
  /xp_cmdshell/i,
  /exec(\s|\()+/i,
];

function hasSqlInjection(str: string): boolean {
  return SQL_PATTERNS.some((p) => p.test(str));
}

// Detect obvious script injection
const SCRIPT_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i,           // onclick=, onerror=, etc.
  /data:\s*text\/html/i,
  /vbscript:/i,
  /expression\s*\(/i,
];

function hasScriptInjection(str: string): boolean {
  return SCRIPT_PATTERNS.some((p) => p.test(str));
}

// ─── Main sanitizer ───────────────────────────────────────────────────────────

export type SanitizeOptions = {
  maxLength?: number;       // hard cap (default 2000)
  allowNewlines?: boolean;  // allow \n (default false for single-line fields)
  fieldName?: string;       // for error messages
};

/**
 * Sanitize a single text field. Throws a descriptive error string if the
 * input is clearly malicious, so callers can return it to the user.
 * Returns the cleaned string.
 */
export function sanitize(raw: string | undefined | null, opts: SanitizeOptions = {}): string {
  const { maxLength = 2000, allowNewlines = false, fieldName = "Поле" } = opts;

  if (raw === null || raw === undefined) return "";

  let s = String(raw);

  // 1. Null bytes / control chars
  s = stripControlChars(s);

  // 2. If not multiline, collapse newlines
  if (!allowNewlines) {
    s = s.replace(/[\r\n]+/g, " ");
  }

  // 3. Normalize whitespace
  s = normalizeWhitespace(s);

  // 4. Detect & reject script injection (before stripping, to catch raw tags)
  if (hasScriptInjection(s)) {
    throw `${fieldName}: недопустимые символы или скрипт`;
  }

  // 5. Strip remaining HTML
  s = stripHtml(s);

  // 6. Detect SQL injection
  if (hasSqlInjection(s)) {
    throw `${fieldName}: недопустимые символы`;
  }

  // 7. Max length
  if (s.length > maxLength) {
    s = s.slice(0, maxLength);
  }

  return s;
}

/** Sanitize an email — lowercase, trim, basic format check */
export function sanitizeEmail(raw: string): string {
  const s = sanitize(raw, { maxLength: 320, fieldName: "Email" }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    throw "Некорректный формат email";
  }
  return s;
}

/** Sanitize a phone number — keep only digits, +, spaces, dashes, parens */
export function sanitizePhone(raw: string): string {
  const s = sanitize(raw, { maxLength: 30, fieldName: "Телефон" });
  const cleaned = s.replace(/[^\d+\s\-().]/g, "");
  if (cleaned.length < 4) throw "Телефон слишком короткий";
  return cleaned;
}

/** Sanitize a name field */
export function sanitizeName(raw: string, fieldName = "Имя"): string {
  const s = sanitize(raw, { maxLength: 120, fieldName });
  if (s.length < 1) throw `${fieldName} не может быть пустым`;
  return s;
}

/** Sanitize a password — just strip control chars, enforce length */
export function sanitizePassword(raw: string): string {
  const s = stripControlChars(raw || "").trim();
  if (s.length < 6) throw "Пароль должен содержать минимум 6 символов";
  if (s.length > 256) throw "Пароль слишком длинный";
  return s;
}
