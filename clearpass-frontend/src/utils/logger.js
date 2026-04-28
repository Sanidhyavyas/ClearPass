/**
 * utils/logger.js — Frontend structured logger for ClearPass
 *
 * Features:
 *  - Structured log objects (timestamp, level, message, correlationId, userId, meta)
 *  - Same configurable timestamp format as the backend (REACT_APP_LOG_TIME_FORMAT)
 *  - Log level gate: controlled via REACT_APP_LOG_LEVEL
 *  - In production: suppresses debug/info from the console; critical logs
 *    (warn, error) are batched and forwarded to the backend /api/logs endpoint
 *  - Correlation ID: generated once per page session, attached to every log
 *    and sent in the X-Request-ID header so backend logs can be correlated
 *  - Sensitive field scrubbing before any log is emitted or shipped
 */

import API from "../services/api";

// ── Config ─────────────────────────────────────────────────────────────
const LOG_LEVEL_PRIORITY = { debug: 0, info: 1, warn: 2, error: 3 };
const CONFIGURED_LEVEL   = process.env.REACT_APP_LOG_LEVEL || (process.env.NODE_ENV === "production" ? "warn" : "debug");
const MIN_PRIORITY       = LOG_LEVEL_PRIORITY[CONFIGURED_LEVEL] ?? 1;
const IS_PRODUCTION      = process.env.NODE_ENV === "production";
const TIME_FORMAT        = process.env.REACT_APP_LOG_TIME_FORMAT || "YYYY-MM-DD HH:mm:ss";

// ── Correlation ID — one per browser session ───────────────────────────
let _correlationId = sessionStorage.getItem("clearpass_cid");
if (!_correlationId) {
  _correlationId = `fe-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  sessionStorage.setItem("clearpass_cid", _correlationId);
}
export const correlationId = _correlationId;

// ── Sensitive field scrubber ───────────────────────────────────────────
const SENSITIVE = new Set([
  "password", "confirm_password", "new_password",
  "token", "accessToken", "refreshToken",
  "authorization", "Authorization", "x-api-key",
]);

function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      SENSITIVE.has(k) ? [k, "[REDACTED]"] : [k, scrub(v)]
    )
  );
}

// ── Timestamp formatter ────────────────────────────────────────────────
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return TIME_FORMAT
    .replace("YYYY", now.getFullYear())
    .replace("MM",   pad(now.getMonth() + 1))
    .replace("DD",   pad(now.getDate()))
    .replace("HH",   pad(now.getHours()))
    .replace("mm",   pad(now.getMinutes()))
    .replace("ss",   pad(now.getSeconds()));
}

// ── Log shipping queue (batched, max every 5 s or 10 entries) ─────────
const _queue = [];
let   _flushTimer = null;

function scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setTimeout(flush, 5_000);
}

async function flush() {
  _flushTimer = null;
  if (_queue.length === 0) return;
  const batch = _queue.splice(0, _queue.length);
  try {
    await API.post("/api/logs", { logs: batch });
  } catch {
    // Silently swallow — never let log shipping errors surface to users
  }
}

function enqueue(entry) {
  _queue.push(entry);
  if (_queue.length >= 10) flush();
  else scheduleFlush();
}

// ── Core emit function ─────────────────────────────────────────────────
function emit(level, message, meta = {}) {
  if ((LOG_LEVEL_PRIORITY[level] ?? 1) < MIN_PRIORITY) return;

  // Try to get userId from localStorage (set by auth)
  let userId = null;
  try {
    const auth = JSON.parse(localStorage.getItem("clearpass_auth") || "null");
    userId = auth?.user?.id || auth?.user?.email || null;
  } catch { /* ignore */ }

  const entry = {
    level,
    message,
    timestamp:     getTimestamp(),
    correlationId: _correlationId,
    userId,
    route:         window.location.pathname,
    meta:          scrub(meta),
  };

  // Console output (always in dev; only warn/error in production)
  if (!IS_PRODUCTION || level === "warn" || level === "error") {
    const consoleFn = level === "error" ? console.error
                    : level === "warn"  ? console.warn
                    : level === "debug" ? console.debug
                    : console.info;
    consoleFn(`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, entry.meta || "");
  }

  // Ship warn + error to backend in production
  if (IS_PRODUCTION && (level === "warn" || level === "error")) {
    enqueue(entry);
  }
}

// ── Public API ─────────────────────────────────────────────────────────
const logger = {
  debug: (message, meta)  => emit("debug", message, meta),
  info:  (message, meta)  => emit("info",  message, meta),
  warn:  (message, meta)  => emit("warn",  message, meta),
  error: (message, meta)  => emit("error", message, meta),

  /**
   * logAction — convenience helper for important UI interactions
   * e.g. logger.logAction("Submitted clearance form", { studentId: 42 })
   */
  logAction: (action, meta) => emit("info", `[ACTION] ${action}`, meta),

  /**
   * logApiRequest — call before an API request
   */
  logApiRequest: (method, url, body) =>
    emit("debug", `API → ${method.toUpperCase()} ${url}`, { body: scrub(body) }),

  /**
   * logApiResponse — call after a successful response
   */
  logApiResponse: (method, url, status, durationMs) =>
    emit("debug", `API ← ${method.toUpperCase()} ${url} ${status}`, { durationMs }),

  /**
   * logApiError — call in Axios error interceptor
   */
  logApiError: (method, url, status, errorMessage) =>
    emit("error", `API Error ${method.toUpperCase()} ${url}`, { status, errorMessage }),

  /** Immediately flush pending logs (call on logout / beforeunload) */
  flush,
};

// Flush on page unload so we don't lose queued logs
window.addEventListener("beforeunload", flush);

export default logger;
