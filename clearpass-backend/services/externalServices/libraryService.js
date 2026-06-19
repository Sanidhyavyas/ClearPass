/**
 * services/externalServices/libraryService.js
 *
 * Abstraction layer for the Library system.
 * Replace mock logic with real HTTP calls when a library API is available.
 *
 * Environment variables:
 *   LIBRARY_API_URL — base URL for the library system
 *   LIBRARY_API_KEY — API key
 */

const db = require("../../db");

/**
 * Returns library due status for a student.
 *
 * @returns {{ hasDues: boolean, overdueBooks: number, fineAmount: number, source: string }}
 */
async function getStudentDues(studentId) {
  // ── Option A: External library API ───────────────────────────────────
  if (process.env.LIBRARY_API_URL) {
    return callExternalLibraryApi(studentId);
  }

  // ── Option B: Internal DB query (when tracking dues locally) ─────────
  if (process.env.USE_MOCK_LIBRARY !== "true") {
    const { rows } = await db.query(
      "SELECT has_library_dues FROM students WHERE user_id = $1 LIMIT 1",
      [studentId]
    );
    if (rows.length) {
      return {
        hasDues:      Boolean(rows[0].has_library_dues),
        overdueBooks: 0,
        fineAmount:   0,
        source:       "internal_db",
        details:      rows[0].has_library_dues ? "Student has library dues" : "No library dues",
      };
    }
  }

  // ── Option C: Mock — always clean (no dues) until real API is wired ──
  return {
    hasDues:      false,
    overdueBooks: 0,
    fineAmount:   0,
    source:       "mock",
    details:      "Library system not yet integrated — assuming no dues",
  };
}

async function callExternalLibraryApi(studentId) {
  const axios = await import("axios").catch(() => null);
  if (!axios) throw new Error("axios not available for external library API");

  const res = await axios.default.get(
    `${process.env.LIBRARY_API_URL}/students/${studentId}/dues`,
    { headers: { "x-api-key": process.env.LIBRARY_API_KEY || "" }, timeout: 5000 }
  );

  return {
    hasDues:      Boolean(res.data.has_dues),
    overdueBooks: Number(res.data.overdue_books || 0),
    fineAmount:   Number(res.data.fine_amount   || 0),
    source:       "external_library_api",
    details:      res.data.message || "",
  };
}

module.exports = { getStudentDues };
