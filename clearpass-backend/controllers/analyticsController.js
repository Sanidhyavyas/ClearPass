const db = require("../db");

/**
 * GET /api/analytics/overview
 * Returns platform-wide clearance statistics and per-module breakdown.
 * Access: admin, super_admin
 */
const getAnalyticsOverview = async (req, res, next) => {
  try {
    // ── 1. Overall request stats ──────────────────────────────────
    const [[reqStats]] = await db.query(`
      SELECT
        COUNT(*)                          AS total_requests,
        COALESCE(SUM(status='approved'),0) AS approved_count,
        COALESCE(SUM(status='pending'),0)  AS pending_count,
        COALESCE(SUM(status='rejected'),0) AS rejected_count
      FROM clearance_requests
    `);

    // ── 2. Total students ─────────────────────────────────────────
    const [[{ total_students }]] = await db.query(
      "SELECT COUNT(*) AS total_students FROM users WHERE role = 'student'"
    );

    // ── 3. Per-module status counts ───────────────────────────────
    const [moduleRows] = await db.query(`
      SELECT
        module_name,
        COALESCE(SUM(status='approved' OR status='not_required'), 0) AS approved,
        COALESCE(SUM(status='pending'),  0)                          AS pending,
        COALESCE(SUM(status='rejected'), 0)                          AS rejected
      FROM clearance_modules
      GROUP BY module_name
    `);

    // ── 4. Avg hours to approve per module (from submitted_at → last_updated) ──
    let avgRows = [];
    try {
      [avgRows] = await db.query(`
        SELECT
          cm.module_name,
          AVG(TIMESTAMPDIFF(HOUR, cr.submitted_at, cm.last_updated)) AS avg_hours
        FROM clearance_modules cm
        JOIN clearance_requests cr ON cr.id = cm.request_id
        WHERE cm.status = 'approved'
          AND cr.submitted_at IS NOT NULL
          AND cm.last_updated  IS NOT NULL
        GROUP BY cm.module_name
      `);
    } catch {
      // request_id column may be NULL for legacy rows — skip gracefully
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
    const [recentAudit] = await db.query(`
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
