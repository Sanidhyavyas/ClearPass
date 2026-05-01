/**
 * services/clearanceEngine.js
 *
 * Rule-based Smart Clearance Engine.
 * Evaluates a student's external data (fees, library, attendance)
 * and decides whether to auto-approve, flag, or block clearance.
 *
 * Rules are fully configurable via CLEARANCE_RULES below — no hardcoding.
 * Teachers can always manually override any engine decision.
 */

const db = require("../db");
const { createAuditLog } = require("../controllers/auditController");
const feeService        = require("./externalServices/feeService");
const libraryService    = require("./externalServices/libraryService");
const attendanceService = require("./externalServices/attendanceService");

// ── Configurable rule set ────────────────────────────────────────────────
const CLEARANCE_RULES = {
  // Minimum attendance % required to not get flagged
  minAttendancePercent: Number(process.env.MIN_ATTENDANCE_PERCENT || 75),

  // If true, any pending fee blocks auto-approval
  blockOnPendingFees: process.env.BLOCK_ON_PENDING_FEES !== "false",

  // If true, any library dues block auto-approval
  blockOnLibraryDues: process.env.BLOCK_ON_LIBRARY_DUES !== "false",

  // Auto-approve when ALL conditions pass (no dues, attendance OK)
  autoApproveOnPass: process.env.AUTO_APPROVE_ON_PASS === "true",
};

/**
 * Evaluate clearance eligibility for a student.
 * Returns { eligible, reasons, warnings, externalData }
 *
 * @param {number} studentId
 * @param {number|null} requestId - if provided, persists result to DB
 */
async function evaluateClearance(studentId, requestId = null) {
  const reasons  = [];   // blocking reasons (will prevent auto-approve)
  const warnings = [];   // non-blocking advisories

  // ── Fetch external data in parallel ─────────────────────────────────
  const [feeData, libraryData, attendanceData] = await Promise.allSettled([
    feeService.getStudentFees(studentId),
    libraryService.getStudentDues(studentId),
    attendanceService.getStudentAttendance(studentId),
  ]);

  const fees       = feeData.status       === "fulfilled" ? feeData.value       : null;
  const library    = libraryData.status   === "fulfilled" ? libraryData.value   : null;
  const attendance = attendanceData.status === "fulfilled" ? attendanceData.value : null;

  // ── Rule 1: Pending fees ─────────────────────────────────────────────
  if (fees !== null) {
    if (CLEARANCE_RULES.blockOnPendingFees && fees.hasPendingFees) {
      reasons.push(`Pending fees of ₹${fees.amount || 0} not cleared`);
    }
  } else {
    warnings.push("Fee system unavailable — manual verification required");
  }

  // ── Rule 2: Library dues ─────────────────────────────────────────────
  if (library !== null) {
    if (CLEARANCE_RULES.blockOnLibraryDues && library.hasDues) {
      reasons.push(
        library.overdueBooks
          ? `Library dues: ${library.overdueBooks} overdue book(s)`
          : "Outstanding library dues not cleared"
      );
    }
  } else {
    warnings.push("Library system unavailable — manual verification required");
  }

  // ── Rule 3: Attendance ───────────────────────────────────────────────
  if (attendance !== null) {
    if (attendance.percentage < CLEARANCE_RULES.minAttendancePercent) {
      reasons.push(
        `Attendance ${attendance.percentage}% is below the required ${CLEARANCE_RULES.minAttendancePercent}%`
      );
    } else if (attendance.percentage < CLEARANCE_RULES.minAttendancePercent + 5) {
      warnings.push(
        `Attendance ${attendance.percentage}% is marginally above the threshold — review recommended`
      );
    }
  } else {
    warnings.push("Attendance system unavailable — manual verification required");
  }

  const eligible      = reasons.length === 0;
  const autoDecision  = eligible && CLEARANCE_RULES.autoApproveOnPass
    ? "auto_approved"
    : !eligible
      ? "flagged"
      : "eligible"; // eligible but manual approval still needed

  const externalData = { fees, library, attendance };

  // ── Persist engine result to DB if requestId given ───────────────────
  if (requestId) {
    await persistEngineResult({ requestId, studentId, eligible, autoDecision, reasons, warnings, externalData });
  }

  return { eligible, autoDecision, reasons, warnings, externalData };
}

/**
 * Persist the engine evaluation result into clearance_engine_results.
 * Non-fatal — errors are swallowed so the main flow is never broken.
 */
async function persistEngineResult({ requestId, studentId, eligible, autoDecision, reasons, warnings, externalData }) {
  try {
    await db.query(
      `INSERT INTO clearance_engine_results
         (request_id, student_id, eligible, auto_decision, blocking_reasons, warnings, external_data, evaluated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (request_id) DO UPDATE SET
         eligible         = EXCLUDED.eligible,
         auto_decision    = EXCLUDED.auto_decision,
         blocking_reasons = EXCLUDED.blocking_reasons,
         warnings         = EXCLUDED.warnings,
         external_data    = EXCLUDED.external_data,
         evaluated_at     = NOW()`,
      [
        requestId,
        studentId,
        eligible,
        autoDecision,
        JSON.stringify(reasons),
        JSON.stringify(warnings),
        JSON.stringify(externalData),
      ]
    );
  } catch (err) {
    console.error("[clearanceEngine] Failed to persist result:", err.message);
  }
}

/**
 * Apply engine auto-decision to a clearance_request row.
 * Only acts if autoApproveOnPass is enabled and student is fully eligible.
 * Returns true if an action was taken.
 */
async function applyAutoDecision(requestId, studentId, performedById) {
  const result = await evaluateClearance(studentId, requestId);

  if (result.autoDecision === "auto_approved") {
    await db.query(
      `UPDATE clearance_requests SET status = 'approved', engine_approved = TRUE,
         remarks = $1, updated_at = NOW()
       WHERE id = $2`,
      [buildApprovalRemarks(result), requestId]
    );

    await createAuditLog({
      userId:   performedById || studentId,
      userName: "ClearPass Engine",
      userRole: "system",
      action:   "auto_approved",
      targetType: "clearance_request",
      targetId:   requestId,
      details:  "Auto-approved by smart clearance engine — all conditions satisfied",
    });

    return { acted: true, decision: "auto_approved", result };
  }

  return { acted: false, decision: result.autoDecision, result };
}

// ── Remark builders (feeds into AI remarks feature) ──────────────────────

function buildApprovalRemarks(result) {
  const parts = ["✅ Auto-approved by ClearPass Smart Engine."];
  if (result.warnings.length) {
    parts.push("Note: " + result.warnings.join("; "));
  }
  return parts.join(" ");
}

function buildRejectionRemarks(result) {
  const parts = ["❌ Flagged by ClearPass Smart Engine."];
  if (result.reasons.length) {
    parts.push("Reason(s): " + result.reasons.join("; "));
  }
  return parts.join(" ");
}

/**
 * Generate a human-readable smart remark for a student's clearance status.
 * Used by the AI remarks feature on dashboards.
 */
function generateSmartRemark(result) {
  if (result.eligible) {
    if (result.warnings.length === 0) {
      return "All conditions satisfied. Ready for clearance.";
    }
    return "Eligible with minor advisories: " + result.warnings.join("; ");
  }
  return "Blocked: " + result.reasons.join("; ");
}

module.exports = {
  evaluateClearance,
  applyAutoDecision,
  generateSmartRemark,
  buildRejectionRemarks,
  CLEARANCE_RULES,
};
