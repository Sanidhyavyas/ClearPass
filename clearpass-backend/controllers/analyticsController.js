const db = require("../db");
const { YEARS, SEMESTERS } = require("../config/constants");

/**
 * GET /api/analytics/overview
 * Returns platform-wide clearance statistics and per-module breakdown.
 * Query: year, semester  (both optional — for scoped view)
 * Access: admin, super_admin
 */
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const year     = req.query.year     ? parseInt(req.query.year,     10) : null;
    const semester = req.query.semester ? parseInt(req.query.semester, 10) : null;

    // Build optional where clause for semester scoping
    const scopeConditions = [];
    const scopeParams     = [];
    if (year)     { scopeConditions.push(`year = $${scopeParams.length + 1}`);     scopeParams.push(year); }
    if (semester) { scopeConditions.push(`semester = $${scopeParams.length + 1}`); scopeParams.push(semester); }
    const scopeWhere = scopeConditions.length ? `WHERE ${scopeConditions.join(" AND ")}` : "";

    // ── 1. Overall request stats (optionally scoped) ──────────────────
    const { rows: [reqStats] } = await db.query(`
      SELECT
        COUNT(*)                                                        AS total_requests,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved_count,
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pending_count,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected_count
      FROM clearance_requests ${scopeWhere}
    `, scopeParams);

    // ── 2. Total students (optionally scoped by year/semester) ────────
    const stuConditions = [];
    const stuParams     = ["student"];
    stuConditions.push("role = $1");
    if (year)     { stuConditions.push(`year = $${stuParams.length + 1}`);     stuParams.push(year); }
    if (semester) { stuConditions.push(`semester = $${stuParams.length + 1}`); stuParams.push(semester); }
    const stuWhere = `WHERE ${stuConditions.join(" AND ")}`;

    const { rows: [{ total_students }] } = await db.query(
      `SELECT COUNT(*) AS total_students FROM users ${stuWhere}`, stuParams
    );

    // ── 3. Per-module status counts ───────────────────────────────────
    let moduleWhere = "";
    let moduleParams = [];
    if (scopeConditions.length) {
      // Join to clearance_requests to apply scope
      moduleWhere = `JOIN clearance_requests cr ON cr.id = cm.request_id WHERE ${scopeConditions
        .map((_, i) => `cr.${scopeConditions[i].split(" = ")[0]} = $${i + 1}`)
        .join(" AND ")}`;
      moduleParams = [...scopeParams];
    }

    const { rows: moduleRows } = await db.query(`
      SELECT
        module_name,
        COALESCE(SUM(CASE WHEN status IN ('approved','not_required') THEN 1 ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0)                   AS pending,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)                   AS rejected
      FROM clearance_modules cm
      GROUP BY module_name
    `);

    // ── 4. Avg hours to approve per module ───────────────────────────
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
      // Legacy rows without request_id — skip gracefully
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

    // ── 5. Per-semester breakdown (always platform-wide) ─────────────
    let semester_breakdown = [];
    try {
      const { rows: sbRows } = await db.query(`
        SELECT
          year, semester,
          COUNT(*)                                                          AS total,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)             AS approved,
          SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END)             AS pending,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)             AS rejected
        FROM clearance_requests
        WHERE year IS NOT NULL AND semester IS NOT NULL
        GROUP BY year, semester
        ORDER BY year, semester
      `);
      semester_breakdown = sbRows.map((r) => ({
        year:     Number(r.year),
        semester: Number(r.semester),
        total:    Number(r.total),
        approved: Number(r.approved),
        pending:  Number(r.pending),
        rejected: Number(r.rejected),
      }));
    } catch { /* non-fatal */ }

    // ── 6. Recent audit log entries (last 10) ─────────────────────────
    const { rows: recentAudit } = await db.query(`
      SELECT al.*, u.name AS user_name_display
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    return res.json({
      total_students:     Number(total_students),
      total_requests:     Number(reqStats.total_requests),
      approved_count:     Number(reqStats.approved_count),
      pending_count:      Number(reqStats.pending_count),
      rejected_count:     Number(reqStats.rejected_count),
      module_stats,
      semester_breakdown,
      recent_audit:       recentAudit,
      // Echo back any active scope filter for the UI
      filter: { year: year || null, semester: semester || null },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAnalyticsOverview };
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
