/**
 * tests/cors.test.js — CORS + frontend log intake integration tests
 *
 * Boots the real Express app on an ephemeral port and asserts the actual
 * response headers for preflight and simple requests.
 */

const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { test, before, after } = require("node:test");
const assert = require("node:assert");

// Disable the auth/api rate limiters during tests.
process.env.NODE_ENV = "test";

const app = require("../index");
const pool = require("../db");
const { allowedOrigins, isOriginAllowed } = require("../config/cors");

const PREVIEW_ORIGIN = "https://clearpass-frontend-git-demo-hardening-sanidhya-vyas-projects.vercel.app";
const LOCAL_ORIGIN    = "http://localhost:5173";
const BLOCKED_ORIGIN  = "https://unauthorized.example.com";

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
  // Release the PostgreSQL pool so the test process can exit cleanly.
  await pool.end();
});

function preflight(path, origin, requestHeaders = "content-type,authorization") {
  return fetch(`${baseUrl}${path}`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": requestHeaders,
    },
  });
}

test("origin allowlist allows development and preview origins, blocks unknown origins", () => {
  assert.ok(isOriginAllowed(LOCAL_ORIGIN), "localhost:5173 should be allowed");
  assert.ok(isOriginAllowed(PREVIEW_ORIGIN), "Vercel preview origin should be allowed");
  assert.ok(allowedOrigins.has(PREVIEW_ORIGIN), "preview origin should be in the allowlist");
  assert.equal(isOriginAllowed(BLOCKED_ORIGIN), false, "unknown origin should be blocked");
});

test("CLIENT_URL and CORS_ORIGINS environment origins are allowed", () => {
  const configPath = path.join(__dirname, "..", "config", "cors.js");
  const script = `
    const { isOriginAllowed } = require(${JSON.stringify(configPath)});
    const results = [
      isOriginAllowed("https://clearpass.example.edu"),
      isOriginAllowed("https://preview-2.example.com"),
    ];
    process.stdout.write(results.map((r) => (r ? "ALLOWED" : "BLOCKED")).join(","));
  `;

  const out = execFileSync(process.execPath, ["-e", script], {
    env: {
      ...process.env,
      CLIENT_URL: "https://clearpass.example.edu",
      CORS_ORIGINS: "https://preview-2.example.com",
    },
    encoding: "utf8",
  });

  assert.equal(out.trim(), "ALLOWED,ALLOWED");
});

test("OPTIONS /login from the Vercel preview origin returns correct CORS headers", async () => {
  const res = await preflight("/login", PREVIEW_ORIGIN);

  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
  assert.match(res.headers.get("access-control-allow-methods"), /POST/);
  assert.match(res.headers.get("access-control-allow-methods"), /OPTIONS/);

  const allowedHeaders = (res.headers.get("access-control-allow-headers") || "").toLowerCase();
  assert.match(allowedHeaders, /content-type/);
  assert.match(allowedHeaders, /authorization/);
});

test("OPTIONS /login from localhost:5173 returns correct CORS headers", async () => {
  const res = await preflight("/login", LOCAL_ORIGIN);

  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), LOCAL_ORIGIN);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
});

test("OPTIONS /login from an unauthorized origin does not receive ACAO", async () => {
  const res = await preflight("/login", BLOCKED_ORIGIN);

  assert.equal(res.headers.get("access-control-allow-origin"), null);
});

test("OPTIONS /api/logs from the Vercel preview origin returns correct CORS headers", async () => {
  const res = await preflight("/api/logs", PREVIEW_ORIGIN);

  assert.equal(res.status, 204);
  assert.equal(res.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
  assert.equal(res.headers.get("access-control-allow-credentials"), "true");
});

test("POST /api/logs from the Vercel preview origin is accepted", async () => {
  const res = await fetch(`${baseUrl}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: PREVIEW_ORIGIN,
    },
    body: JSON.stringify({
      logs: [
        {
          level: "warn",
          message: "cors smoke test",
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.received, 1);
});

test("POST /api/logs from an unauthorized origin does not receive ACAO", async () => {
  const res = await fetch(`${baseUrl}/api/logs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: BLOCKED_ORIGIN,
    },
    body: JSON.stringify({
      logs: [{ level: "warn", message: "blocked origin test", timestamp: new Date().toISOString() }],
    }),
  });

  assert.equal(res.headers.get("access-control-allow-origin"), null);
});
