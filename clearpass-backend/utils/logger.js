/**
 * utils/logger.js — Centralized Winston logger for ClearPass backend
 *
 * Features:
 *  - Structured JSON logs in production
 *  - Pretty (colorized) logs in development
 *  - Configurable log level via LOG_LEVEL env var
 *  - Configurable timestamp format via LOG_TIME_FORMAT env var
 *  - Daily rotating log files (keeps 14 days, max 20 MB per file)
 *  - Sensitive field scrubbing (passwords, tokens, authorization headers)
 */

const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const path = require("path");
const fs   = require("fs");

// ── Ensure logs directory exists ────────────────────────────────────────
const LOG_DIR = path.join(__dirname, "..", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

// ── Config from environment ─────────────────────────────────────────────
const LOG_LEVEL       = process.env.LOG_LEVEL       || "info";
const LOG_TIME_FORMAT = process.env.LOG_TIME_FORMAT  || "YYYY-MM-DD HH:mm:ss";
const IS_PRODUCTION   = process.env.NODE_ENV === "production";

// ── Sensitive fields to scrub before logging ───────────────────────────
const SENSITIVE_KEYS = new Set([
  "password", "confirm_password", "new_password",
  "token", "accessToken", "refreshToken",
  "authorization", "Authorization",
  "x-api-key", "secret", "private_key",
]);

/**
 * Recursively scrub sensitive keys from an object.
 * Returns a new object — never mutates the original.
 */
function scrub(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrub);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) =>
      SENSITIVE_KEYS.has(k) ? [k, "[REDACTED]"] : [k, scrub(v)]
    )
  );
}

// ── Custom timestamp using configured format ───────────────────────────
// Winston's built-in timestamp() uses moment-like tokens but relies on
// a simple Date call; we replicate it cleanly here.
const customTimestamp = format((info) => {
  const now   = new Date();
  const pad   = (n) => String(n).padStart(2, "0");
  const Y     = now.getFullYear();
  const Mo    = pad(now.getMonth() + 1);
  const D     = pad(now.getDate());
  const H     = pad(now.getHours());
  const Mi    = pad(now.getMinutes());
  const S     = pad(now.getSeconds());

  info.timestamp = LOG_TIME_FORMAT
    .replace("YYYY", Y)
    .replace("MM",   Mo)
    .replace("DD",   D)
    .replace("HH",   H)
    .replace("mm",   Mi)
    .replace("ss",   S);

  return info;
});

// ── Scrub format — removes sensitive keys from logged metadata ─────────
const scrubFormat = format((info) => {
  if (info.meta)     info.meta     = scrub(info.meta);
  if (info.body)     info.body     = scrub(info.body);
  if (info.query)    info.query    = scrub(info.query);
  if (info.headers)  info.headers  = scrub(info.headers);
  return info;
});

// ── Formats ────────────────────────────────────────────────────────────
const jsonFormat = format.combine(
  customTimestamp(),
  scrubFormat(),
  format.errors({ stack: true }),
  format.json()
);

const prettyFormat = format.combine(
  customTimestamp(),
  scrubFormat(),
  format.errors({ stack: true }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, requestId, userId, route, durationMs, ...rest }) => {
    const rid  = requestId ? ` [${requestId}]` : "";
    const uid  = userId    ? ` user=${userId}`  : "";
    const rt   = route     ? ` ${route}`        : "";
    const dur  = durationMs != null ? ` (${durationMs}ms)` : "";
    const meta = Object.keys(rest).filter(k => !["service", "stack"].includes(k));
    const metaStr = meta.length ? `\n  ${JSON.stringify(Object.fromEntries(meta.map(k => [k, rest[k]])), null, 2).replace(/\n/g, "\n  ")}` : "";
    return `${timestamp} ${level}${rid}${uid}${rt}${dur}: ${message}${metaStr}${rest.stack ? `\n${rest.stack}` : ""}`;
  })
);

// ── Transports ─────────────────────────────────────────────────────────
const consoleTransport = new transports.Console({
  level: LOG_LEVEL,
  format: IS_PRODUCTION ? jsonFormat : prettyFormat,
});

// Rotating file: all levels → logs/app-YYYY-MM-DD.log
const rotatingFileTransport = new (require("winston-daily-rotate-file"))({
  filename:     path.join(LOG_DIR, "app-%DATE%.log"),
  datePattern:  "YYYY-MM-DD",
  zippedArchive: true,
  maxSize:      "20m",
  maxFiles:     "14d",
  level:        LOG_LEVEL,
  format:       jsonFormat,
});

// Error-only file → logs/error-YYYY-MM-DD.log
const errorFileTransport = new (require("winston-daily-rotate-file"))({
  filename:     path.join(LOG_DIR, "error-%DATE%.log"),
  datePattern:  "YYYY-MM-DD",
  zippedArchive: true,
  maxSize:      "20m",
  maxFiles:     "30d",
  level:        "error",
  format:       jsonFormat,
});

// ── Logger instance ────────────────────────────────────────────────────
const logger = createLogger({
  level:       LOG_LEVEL,
  defaultMeta: { service: "clearpass-api" },
  transports:  [consoleTransport, rotatingFileTransport, errorFileTransport],
  // Don't crash the process on unhandled exceptions; log them instead
  exceptionHandlers: [
    new transports.Console({ format: IS_PRODUCTION ? jsonFormat : prettyFormat }),
    new (require("winston-daily-rotate-file"))({
      filename:    path.join(LOG_DIR, "exceptions-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles:    "14d",
      format:      jsonFormat,
    }),
  ],
  rejectionHandlers: [
    new transports.Console({ format: IS_PRODUCTION ? jsonFormat : prettyFormat }),
  ],
});

module.exports = logger;
