/**
 * services/remarksEngine.js
 *
 * AI/rule-based auto-remarks and delay prediction for ClearPass.
 * No external ML dependency — powered by SQL aggregation + rule logic.
 *
 * Exported functions:
 *   generateAutoRemarks(studentId, modules)  → string remark
 *   predictDelay(teacherId)                  → { avgDays, category }
 *   generateClearanceSummary(studentId)      → full summary object
 */

const db = require("../db");

// ── Remark templates (configurable) ──────────────────────────────────────────
const REMARKS = {
  allApproved:   "All clearance modules have been approved. Ready for final clearance.",
  pendingMany:   (n) => `${n} module(s) still pending approval. Follow up with respective faculty.`,
  pendingOne:    (mod) => `Only ${mod} approval is pending. Follow up to expedite clearance.`,
  rejected:      (mods) => `The following module(s) were rejected: ${mods}. Address the issues and resubmit.`,
  noModules:     "No clearance modules assigned. Contact the administrator.",
  highProgress:  (pct) => `Clearance is ${pct}% complete. Nearly there!`,
  lowProgress:   "Clearance process has just begun. Ensure all required departments are notified.",
};

/**
 * Generate a smart remark for a student based on their clearance modules status.
 *
 * @param {number} studentId
 * @param {Array}  modules  — array of { module_name, status: 'approved'|'rejected'|'pending' }
 * @returns {string}
 */
function generateAutoRemarks(studentId, modules) {
  if (!modules || modules.length === 0) {
    return REMARKS.noModules;
  }

  const approved = modules.filter((m) => m.status === "approved");
  const rejected = modules.filter((m) => m.status === "rejected");
  const pending  = modules.filter((m) => m.status === "pending");

  if (rejected.length > 0) {
    const names = rejected.map((m) => m.module_name || m.name).join(", ");
    return REMARKS.rejected(names);
  }

  if (pending.length === 0) {
    return REMARKS.allApproved;
  }

  const pct = Math.round((approved.length / modules.length) * 100);

  if (pending.length === 1) {
    return REMARKS.pendingOne(pending[0].module_name || pending[0].name);
  }

  if (pct >= 75) {
    return REMARKS.highProgress(pct);
  }

  if (pct < 25) {
    return REMARKS.lowProgress;
  }

  return REMARKS.pendingMany(pending.length);
}

/**
 * Predict expected approval delay for a teacher based on historical data.
 * Looks at the last 30 days of approvals by that teacher.
 *
 * @param {number} teacherId
 * @returns {{ avgDays: number|null, category: 'fast'|'moderate'|'slow'|'unknown' }}
 */
async function predictDelay(teacherId) {
  try {
    const { rows } = await db.query(
      `SELECT
         ROUND(
           AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400.0)::numeric,
           1
         ) AS avg_days
       FROM clearance_modules
       WHERE teacher_id = $1
         AND status = 'approved'
         AND updated_at >= NOW() - INTERVAL '30 days'`,
      [teacherId]
    );

    const avgDays = rows[0]?.avg_days ? parseFloat(rows[0].avg_days) : null;

    let category = "unknown";
    if (avgDays !== null) {
      if (avgDays <= 1)      category = "fast";
      else if (avgDays <= 3) category = "moderate";
      else                   category = "slow";
    }

    return { avgDays, category };
  } catch {
    return { avgDays: null, category: "unknown" };
  }
}

/**
 * Generate a full clearance summary for a student — modules + smart remark + engine flag.
 *
 * @param {number} studentId
 * @returns {{ remark, modules, progress, engineResult }}
 */
async function generateClearanceSummary(studentId) {
  try {
    // Fetch latest clearance request and its modules
    const { rows: requests } = await db.query(
      `SELECT cr.id, cr.status, cr.year, cr.semester
       FROM clearance_requests cr
       WHERE cr.student_id = $1
       ORDER BY cr.created_at DESC LIMIT 1`,
      [studentId]
    );

    if (!requests.length) {
      return { remark: "No clearance request found.", modules: [], progress: 0, engineResult: null };
    }

    const request = requests[0];

    const { rows: modules } = await db.query(
      `SELECT cm.id, cm.status, cm.remarks,
              ma.module_name
       FROM clearance_modules cm
       LEFT JOIN module_assignments ma ON ma.id = cm.assignment_id
       WHERE cm.request_id = $1`,
      [request.id]
    );

    const approved = modules.filter((m) => m.status === "approved").length;
    const progress = modules.length ? Math.round((approved / modules.length) * 100) : 0;

    // Fetch engine result if exists
    const { rows: engineRows } = await db.query(
      "SELECT * FROM clearance_engine_results WHERE request_id = $1 LIMIT 1",
      [request.id]
    ).catch(() => ({ rows: [] }));

    const engineResult = engineRows[0] || null;
    const remark       = generateAutoRemarks(studentId, modules);

    return { remark, modules, progress, engineResult, request };
  } catch (err) {
    console.error("[remarksEngine] Error generating summary:", err.message);
    return { remark: "Summary unavailable.", modules: [], progress: 0, engineResult: null };
  }
}

module.exports = { generateAutoRemarks, predictDelay, generateClearanceSummary };
