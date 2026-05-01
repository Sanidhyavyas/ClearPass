/**
 * services/externalServices/feeService.js
 *
 * Abstraction layer for the Fee system.
 * In production, replace the mock logic with actual HTTP calls to your Fee API.
 *
 * Environment variables:
 *   FEE_API_URL    — base URL for the fee system (optional)
 *   FEE_API_KEY    — API key for the fee system (optional)
 */

const db = require("../../db");

/**
 * Returns fee status for a student.
 * Falls back to internal DB (clearance_requests.fee_status) if no external API is configured.
 *
 * @returns {{ hasPendingFees: boolean, amount: number, details: string }}
 */
async function getStudentFees(studentId) {
  // ── Option A: External fee API ────────────────────────────────────────
  if (process.env.FEE_API_URL) {
    return callExternalFeeApi(studentId);
  }

  // ── Option B: Internal DB fallback ────────────────────────────────────
  const { rows } = await db.query(
    `SELECT fee_status, fee_remarks
     FROM clearance_requests
     WHERE student_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [studentId]
  );

  if (!rows.length) {
    return { hasPendingFees: false, amount: 0, source: "internal_db", details: "No fee record found" };
  }

  const feeStatus = rows[0].fee_status;
  return {
    hasPendingFees: feeStatus !== "approved",
    amount: 0,
    source: "internal_db",
    details: rows[0].fee_remarks || feeStatus || "unknown",
  };
}

async function callExternalFeeApi(studentId) {
  const axios = await import("axios").catch(() => null);
  if (!axios) throw new Error("axios not available for external fee API");

  const res = await axios.default.get(
    `${process.env.FEE_API_URL}/students/${studentId}/fees`,
    { headers: { "x-api-key": process.env.FEE_API_KEY || "" }, timeout: 5000 }
  );

  return {
    hasPendingFees: Boolean(res.data.pending),
    amount:         Number(res.data.amount    || 0),
    source:         "external_fee_api",
    details:        res.data.message || "",
  };
}

module.exports = { getStudentFees };
