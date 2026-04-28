/**
 * routes/logRoutes.js — Endpoint to receive logs forwarded from the frontend
 *
 * POST /api/logs
 * Body: { logs: [ { level, message, timestamp, correlationId, userId?, route?, meta? } ] }
 *
 * Design choices:
 *  - No auth required so failed-auth flows can still be logged
 *  - Rate-limited to 30 requests / minute per IP to prevent abuse
 *  - Each log entry is validated before being forwarded to Winston
 *  - Sensitive fields are scrubbed by the logger's own scrubFormat
 */

const express = require("express");
const logger  = require("../utils/logger");

const router = express.Router();

// ── Simple in-memory rate limiter (no extra dependency) ────────────────
const WINDOW_MS  = 60_000; // 1 minute
const MAX_REQ    = 30;
const ipHits     = new Map(); // ip → { count, resetAt }

function rateLimitCheck(ip) {
  const now  = Date.now();
  const hit  = ipHits.get(ip);
  if (!hit || now > hit.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false; // not limited
  }
  if (hit.count >= MAX_REQ) return true; // limited
  hit.count++;
  return false;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, hit] of ipHits) {
    if (now > hit.resetAt) ipHits.delete(ip);
  }
}, 5 * 60_000);

// ── Allowed log levels ─────────────────────────────────────────────────
const ALLOWED_LEVELS = new Set(["info", "warn", "error", "debug"]);

/**
 * POST /api/logs
 * Accepts a batch of log entries from the React frontend.
 */
router.post("/", (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";

  if (rateLimitCheck(ip)) {
    return res.status(429).json({ success: false, message: "Too many log requests" });
  }

  const { logs } = req.body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return res.status(400).json({ success: false, message: "logs array is required" });
  }

  // Accept at most 50 entries per batch
  const batch = logs.slice(0, 50);

  batch.forEach((entry) => {
    const level   = ALLOWED_LEVELS.has(entry?.level) ? entry.level : "info";
    const message = typeof entry?.message === "string" ? entry.message.slice(0, 500) : "frontend-log";

    logger[level](`[FRONTEND] ${message}`, {
      source:        "frontend",
      correlationId: entry?.correlationId || null,
      userId:        entry?.userId        || null,
      route:         entry?.route         || null,
      timestamp_fe:  entry?.timestamp     || null,
      meta:          entry?.meta          || undefined,
    });
  });

  return res.json({ success: true, received: batch.length });
});

module.exports = router;
