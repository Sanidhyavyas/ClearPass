const db = require("../db");

const MODULE_NAMES = ["library", "accounts", "hostel", "department"];

/**
 * GET /api/student/clearance/status
 * Returns latest clearance request + all 4 module statuses + overall_progress %.
 */
const getClearanceStatus = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const [requests] = await db.query(
      `SELECT *, COALESCE(submitted_at, created_at) AS submitted_at
       FROM clearance_requests
       WHERE student_id = ?
       ORDER BY COALESCE(submitted_at, created_at) DESC
       LIMIT 1`,
      [studentId]
    );

    const [modules] = await db.query(
      "SELECT * FROM clearance_modules WHERE student_id = ? ORDER BY module_name",
      [studentId]
    );

    // Fill in defaults for modules not yet created in DB
    const moduleMap = {};
    modules.forEach((m) => { moduleMap[m.module_name] = m; });
    const allModules = MODULE_NAMES.map((name) =>
      moduleMap[name] || { student_id: studentId, module_name: name, status: "pending", remarks: null, last_updated: null }
    );

    const approvedCount = allModules.filter((m) => m.status === "approved" || m.status === "not_required").length;
    const overallProgress = Math.round((approvedCount / MODULE_NAMES.length) * 100);

    const hasRejected = allModules.some((m) => m.status === "rejected");
    const statusLabel  = overallProgress === 100 ? "Fully Cleared" : hasRejected ? "Action Required" : "In Progress";

    return res.json({
      success: true,
      data: {
        request:          requests[0] || null,
        modules:          allModules,
        overall_progress: overallProgress,
        status_label:     statusLabel,
      },
      message: "Clearance status fetched",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/student/clearance/history
 * Returns full audit log timeline for the student's requests.
 */
const getClearanceHistory = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const [requestRows] = await db.query(
      "SELECT id FROM clearance_requests WHERE student_id = ?",
      [studentId]
    );

    if (!requestRows.length) {
      return res.json({ success: true, data: [], message: "No history" });
    }

    const ids          = requestRows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");

    const [history] = await db.query(
      `SELECT cal.*, u.name AS performer_name, u.role AS performer_role
       FROM clearance_audit_logs cal
       LEFT JOIN users u ON u.id = cal.performed_by
       WHERE cal.request_id IN (${placeholders})
       ORDER BY cal.timestamp DESC`,
      ids
    );

    return res.json({ success: true, data: history, message: "History fetched" });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/student/clearance/modules
 * Returns all 4 modules with status, remarks, last_updated.
 */
const getClearanceModules = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const [modules] = await db.query(
      "SELECT * FROM clearance_modules WHERE student_id = ? ORDER BY module_name",
      [studentId]
    );

    const moduleMap = {};
    modules.forEach((m) => { moduleMap[m.module_name] = m; });

    const result = MODULE_NAMES.map((name) =>
      moduleMap[name] || { student_id: studentId, module_name: name, status: "pending", remarks: null, last_updated: null }
    );

    return res.json({ success: true, data: result, message: "Modules fetched" });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getClearanceStatus, getClearanceHistory, getClearanceModules };
