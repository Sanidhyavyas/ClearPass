/**
 * config/cors.js — Centralised CORS configuration
 *
 * Allowed origins are resolved in this order:
 *   1. Local development servers (Vite 5173, CRA 3000)
 *   2. CLIENT_URL — the production frontend (existing behaviour)
 *   3. CORS_ORIGINS / ALLOWED_ORIGINS — comma-separated extra origins,
 *      used for Vercel preview deployments and staging environments
 *
 * Notes:
 *  - Credentials are enabled, so the wildcard "*" must never be used.
 *  - The concrete request origin is reflected back only when it is allowed.
 *  - OPTIONS preflight requests are terminated by the `cors` middleware
 *    before the API routes and rate limiters run.
 */

// Local development origins are always allowed.
const LOCAL_DEVELOPMENT_ORIGINS = Object.freeze([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

// Known Vercel preview deployment for the demo-hardening branch.
// Additional preview URLs can be supplied via CORS_ORIGINS.
const DEFAULT_ALLOWED_ORIGINS = Object.freeze([
  "https://clearpass-frontend-git-demo-hardening-sanidhya-vyas-projects.vercel.app",
]);

const normalizeOrigin = (origin) =>
  typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : "";

const parseOriginList = (raw) =>
  (raw || "")
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

function buildAllowedOrigins() {
  const origins = new Set();

  LOCAL_DEVELOPMENT_ORIGINS.forEach((origin) => origins.add(origin));
  DEFAULT_ALLOWED_ORIGINS.forEach((origin) => origins.add(origin));

  // CLIENT_URL may be a single origin or a comma-separated list.
  parseOriginList(process.env.CLIENT_URL || "").forEach((origin) => origins.add(origin));

  // Extra origins (e.g. other Vercel previews) take precedence as additions.
  parseOriginList(process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS)
    .forEach((origin) => origins.add(origin));

  return origins;
}

const allowedOrigins = buildAllowedOrigins();

const isOriginAllowed = (origin) => {
  const normalized = normalizeOrigin(origin);
  return normalized !== "" && allowedOrigins.has(normalized);
};

const corsOptions = {
  // Reflect the exact origin for allowed requests; emit no ACAO header otherwise.
  origin(origin, callback) {
    if (!origin) return callback(null, false);
    return callback(null, isOriginAllowed(origin) ? origin : false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposedHeaders: ["X-Request-ID"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

module.exports = { corsOptions, allowedOrigins, isOriginAllowed };
