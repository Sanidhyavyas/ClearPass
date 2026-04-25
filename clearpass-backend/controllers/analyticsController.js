const db = require("../db");

/**
 * GET /api/analytics/overview
 * Returns platform-wide clearance statistics and per-module breakdown.
 * Access: admin, super_admin
 */
const getAnalyticsOverview = async (req, res, next) => {
  try {
    // ── 1. Overall request stats ──────────────────────────────────
    const { rows: [reqStats] } = await db.query(`
      SELECT
        COUNT(*)                                                        AS total_requests,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_count
      FROM clearance_requests
    `);

    // ── 2. Total students ─────────────────────────────────────────
    const { rows: [{ total_students }] } = await db.query(
      "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
    );

    // ── 3. Per-module status counts ───────────────────────────────
    const { rows: moduleRows } = await db.query(`
      SELECT
        module_name,
        COALESCE(SUM(CASE WHEN status IN ('approved','not_required') THEN 1 ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0)                   AS pending,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)                   AS rejected
      FROM clearance_modules
      GROUP BY module_name
    `);

    // ── 4. Avg hours to approve per module ───────────────────────
    let avgRows = [];
    try {
      const { rows } = await db.query(`
        SELECT
          cm.module_name,
          AVG(EXTRACT(EPOCH FROM (cm.last_updated - cr.submitted_at)) / 3600) AS avg_hours
        FROM clearance_modules cm
        JOIN clearance_requests cr ON cr.id = cm.request_id
        WHERE cm.status = 'approved'
          AND cr.submitted_at IS NOT NULL
          AND cm.last_updated  IS NOT NULL
        GROUP BY cm.module_name
      `);
      avgRows = rows;
    } catch {
      // request_id column may not exist for legacy rows — skip gracefully
    }

    const avgMap = {};
    avgRows.forEach((r) => { avgMap[r.module_name] = parseFloat(r.avg_hours || 0); });

    const module_stats = moduleRows.map((r) => ({
      module_name:          r.module_name,
      approved:             Number(r.approved),
      pending:              Number(r.pending),
      rejected:             Number(r.rejected),
      avg_hours_to_approve: parseFloat((avgMap[r.module_name] || 0).toFixed(1)),
    }));

    // ── 5. Recent audit log entries (last 10) ─────────────────────
    const { rows: recentAudit } = await db.query(`
      SELECT al.*, u.name AS user_name_display
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    return res.json({
      total_students:  Number(total_students),
      total_requests:  Number(reqStats.total_requests),
      approved_count:  Number(reqStats.approved_count),
      pending_count:   Number(reqStats.pending_count),
      rejected_count:  Number(reqStats.rejected_count),
      module_stats,
      recent_audit:    recentAudit,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAnalyticsOverview };
