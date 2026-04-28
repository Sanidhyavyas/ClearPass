/**
 * middleware/requestLogger.js — HTTP request/response logging middleware
 *
 * Responsibilities:
 *  1. Generate a unique requestId (UUID v4) for every inbound request
 *  2. Attach requestId to req so controllers can include it in their logs
 *  3. Log the incoming request (method, path, query, body — scrubbed)
 *  4. Capture response status + duration and log on finish
 *  5. Never log Authorization header values or sensitive body fields
 */

const { v4: uuidv4 } = require("uuid");
const logger          = require("../utils/logger");

// Headers that should never appear in logs
const SKIP_HEADERS = new Set([
  "authorization", "cookie", "x-api-key", "x-auth-token",
]);

function sanitizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([k, v]) =>
      SKIP_HEADERS.has(k.toLowerCase()) ? [k, "[REDACTED]"] : [k, v]
    )
  );
}

/**
 * requestLogger middleware
 *
 * Usage (in index.js):
 *   const requestLogger = require("./middleware/requestLogger");
 *   app.use(requestLogger);
 */
function requestLogger(req, res, next) {
  // ── 1. Assign a correlation / request ID ──────────────────────────
  // Prefer a correlation ID forwarded by the frontend; generate one otherwise
  const requestId = req.headers["x-request-id"] || uuidv4();
  req.requestId   = requestId;

  // Expose requestId in response so the frontend can correlate
  res.setHeader("x-request-id", requestId);

  // ── 2. Extract userId from JWT payload (already decoded by authMiddleware) ──
  // authMiddleware sets req.user; this middleware may run before it, so we
  // do a safe read and update the log when available.
  const getUserId = () => req.user?.id || req.user?.email || null;

  // ── 3. Log incoming request ────────────────────────────────────────
  const startTime = Date.now();

  logger.info("Incoming request", {
    requestId,
    method:  req.method,
    route:   req.originalUrl,
    query:   req.query,
    headers: sanitizeHeaders(req.headers),
    // Body logged only for non-GET; sensitive fields are scrubbed by the
    // logger's own scrubFormat transform (passwords, tokens, etc.)
    body:    req.method !== "GET" ? req.body : undefined,
  });

  // ── 4. Log response on finish ──────────────────────────────────────
  res.on("finish", () => {
    const durationMs  = Date.now() - startTime;
    const statusCode  = res.statusCode;
    const level       = statusCode >= 500 ? "error"
                      : statusCode >= 400 ? "warn"
                      : "info";

    logger[level]("Response sent", {
      requestId,
      userId:     getUserId(),
      method:     req.method,
      route:      req.originalUrl,
      statusCode,
      durationMs,
    });
  });

  next();
}

module.exports = requestLogger;
