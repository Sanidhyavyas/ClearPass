const db = require("../db");

// Auto-mark overdue requests (pending + past deadline)
const markOverdue = async (department) => {
  try {
    const params = ["pending", new Date()];
    const deptClause = department ? ` AND department = $${params.length + 1}` : "";
    if (department) params.push(department);
    await db.query(
      `UPDATE clearance_requests
         SET is_overdue = TRUE
       WHERE status = $1 AND deadline IS NOT NULL AND deadline < $2
         AND is_overdue = FALSE${deptClause}`,
      params
    );
  } catch (err) {
    console.error("markOverdue error:", err.message);
  }
};

/**
 * GET /api/teacher/requests
 * Query: department, semester, year, status, search, page, limit
 * Scoped to req.user.department for role=teacher; admin/super_admin bypass.
 */
const getRequests = async (req, res, next) => {
  try {
    const { role, department: userDept } = req.user;
    const { department, semester, year, status, search, page = 1, limit = 10 } = req.query;

    // Mark overdue before returning results
    await markOverdue(role === "teacher" ? userDept : null);

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = [];
    const params     = [];

    conditions.push("u.role = 'student'"); // FIXED: never return admin/teacher rows in student lists

    // Department filter: enforced for teachers, optional for admins.
    // Only filter by department if the teacher actually has one set.
    if (role === "teacher" && userDept) {
      conditions.push(`cr.department = $${params.length + 1}`);
      params.push(userDept);
    } else if (role !== "teacher" && department) {
      conditions.push(`cr.department = $${params.length + 1}`);
      params.push(department);
    }

    if (semester) { conditions.push(`cr.semester = $${params.length + 1}`);  params.push(semester); }
    if (year)     { conditions.push(`cr.year = $${params.length + 1}`);      params.push(parseInt(year, 10)); }
    if (status)   { conditions.push(`cr.status = $${params.length + 1}`);    params.push(status); }
    if (search) {
      const n = params.length;
      conditions.push(`(cr.student_name ILIKE $${n + 1} OR cr.roll_number ILIKE $${n + 2})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const where       = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countParams = [...params];

    const { rows: [countRow] } = await db.query(
      `SELECT COUNT(*) AS total FROM clearance_requests cr ${where}`,
      countParams
    );
    const total = Number(countRow.total);

    // Select only base columns first; try extended columns and fall back gracefully
    let requests;
    try {
      const limitN  = params.length + 1;
      const offsetN = params.length + 2;
      const { rows } = await db.query(
        `SELECT
           cr.id, cr.student_id, cr.department, cr.semester, cr.year,
           cr.roll_number, cr.student_name, cr.status, cr.remarks,
           cr.rejection_reason, cr.is_overdue, cr.deadline,
           COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
           cr.approved_at, cr.rejected_at, cr.documents,
           u.email AS student_email
         FROM clearance_requests cr
         LEFT JOIN users u ON u.id = cr.student_id
         ${where}
         ORDER BY
           CASE cr.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
           COALESCE(cr.submitted_at, cr.created_at) DESC
         LIMIT $${limitN} OFFSET $${offsetN}`,
        [...params, limitNum, offset]
      );
      requests = rows;
    } catch (colErr) {
      // Fallback: use only original columns
      console.warn("Extended columns missing, using base query:", colErr.message);
      const limitN  = params.length + 1;
      const offsetN = params.length + 2;
      const { rows } = await db.query(
        `SELECT
           cr.id, cr.student_id, cr.status, cr.remarks,
           cr.created_at AS submitted_at,
           u.name AS student_name, u.email AS student_email
         FROM clearance_requests cr
         LEFT JOIN users u ON u.id = cr.student_id
         ${where}
         ORDER BY CASE cr.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, cr.created_at DESC
         LIMIT $${limitN} OFFSET $${offsetN}`,
        [...params, limitNum, offset]
      );
      requests = rows;
    }

    // Status breakdown for stat cards
    const { rows: statusRows } = await db.query(
      `SELECT status, COUNT(*) AS cnt FROM clearance_requests cr ${where} GROUP BY status`,
      countParams
    );
    const counts = { pending: 0, approved: 0, rejected: 0 };
    statusRows.forEach(({ status: s, cnt }) => { counts[s] = Number(cnt); });

    return res.json({
      success: true,
      data: { requests, total: Number(total), page: pageNum, limit: limitNum, counts },
      message: "Requests fetched",
    });
  } catch (error) {
    console.error("getRequests error:", error.message, error.sql || "");
    return next(error);
  }
};

/**
 * GET /api/teacher/requests/:id
 * Full request detail: student profile, modules, audit log.
 */
const getRequestById = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const { role, department: userDept } = req.user;

    const { rows } = await db.query(
      `SELECT cr.*, COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
              u.email AS student_email
       FROM clearance_requests cr
       LEFT JOIN users u ON u.id = cr.student_id
       WHERE cr.id = $1 LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const request = rows[0];

    if (role === "teacher" && request.department !== userDept) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { rows: modules } = await db.query(
      "SELECT * FROM clearance_modules WHERE student_id = $1 ORDER BY module_name",
      [request.student_id]
    );

    const { rows: auditLog } = await db.query(
      `SELECT cal.*, u.name AS performer_name
       FROM clearance_audit_logs cal
       LEFT JOIN users u ON u.id = cal.performed_by
       WHERE cal.request_id = $1
       ORDER BY cal.timestamp DESC`,
      [id]
    );

    return res.json({
      success: true,
      data: { ...request, modules, auditLog },
      message: "Request detail fetched",
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/teacher/approve/:id
 * Multi-stage flow: teacher → admin → completed (status=approved).
 * Teachers advance from 'teacher' stage; admins advance from 'admin' stage.
 */
const approveRequest = async (req, res, next) => {
  try {
    const { id }                       = req.params;
    const { role, department: userDept, id: userId } = req.user;

    const { rows } = await db.query(
      "SELECT id, status, department, current_stage FROM clearance_requests WHERE id = $1 LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Request not found" });

    const request = rows[0];

    if (role === "teacher" && request.department !== userDept) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Determine next stage
    const stage     = request.current_stage || "teacher";
    const NEXT_STAGE = { teacher: "admin", hod: "admin", admin: "completed" };
    const nextStage  = NEXT_STAGE[stage];

    if (!nextStage) {
      return res.status(400).json({ success: false, message: "Request is already completed." });
    }

    if (nextStage === "completed") {
      // Final approval
      await db.query(
        `UPDATE clearance_requests
           SET status = 'approved', current_stage = 'completed',
               approved_at = NOW(), teacher_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [userId, id]
      );
    } else {
      // Advance to next stage
      await db.query(
        `UPDATE clearance_requests
           SET current_stage = $1, teacher_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [nextStage, userId, id]
      );
    }

    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role, remarks)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, nextStage === "completed" ? "approved" : `approved_by_${role}`, userId, role, req.body.remarks || null]
    );

    const message = nextStage === "completed"
      ? "Request fully approved"
      : `Request advanced to ${nextStage} stage`;

    return res.json({ success: true, message });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/teacher/reject/:id
 * Body: { rejection_reason } — required, min 5 chars
 */
const rejectRequest = async (req, res, next) => {
  try {
    const { id }            = req.params;
    const { rejection_reason } = req.body;
    const { role, department: userDept, id: userId } = req.user;

    if (!rejection_reason || rejection_reason.trim().length < 5) {
      return res.status(400).json({ success: false, message: "Rejection reason is required (min 5 characters)" });
    }

    const { rows: rejectRows } = await db.query(
      "SELECT id, status, department FROM clearance_requests WHERE id = $1 LIMIT 1",
      [id]
    );
    if (!rejectRows.length) return res.status(404).json({ success: false, message: "Request not found" });
    if (role === "teacher" && rejectRows[0].department !== userDept) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    await db.query(
      `UPDATE clearance_requests
         SET status = 'rejected', rejection_reason = $1, rejected_at = NOW(), teacher_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [rejection_reason.trim(), userId, id]
    );

    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role, remarks)
       VALUES ($1, 'rejected', $2, $3, $4)`,
      [id, userId, role, rejection_reason.trim()]
    );

    return res.json({ success: true, message: "Request rejected" });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/teacher/request-changes/:id
 * Body: { remarks }
 */
const requestChanges = async (req, res, next) => {
  try {
    const { id }    = req.params;
    const { remarks } = req.body;
    const { role, id: userId } = req.user;

    await db.query(
      "UPDATE clearance_requests SET remarks = $1, updated_at = NOW() WHERE id = $2",
      [remarks || null, id]
    );

    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role, remarks)
       VALUES ($1, 'changes_requested', $2, $3, $4)`,
      [id, userId, role, remarks || null]
    );

    return res.json({ success: true, message: "Changes requested" });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/teacher/stats
 * Scoped to teacher's department; admin/super_admin sees all.
 */
const getStats = async (req, res, next) => {
  try {
    const { role, department } = req.user;
    const deptClause = role === "teacher" ? "WHERE department = $1" : "";
    const params     = role === "teacher" ? [department] : [];

    const { rows: [row] } = await db.query(
      `SELECT
         COUNT(*)                                                                             AS total,
         SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END)                                AS pending,
         SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)                                AS approved,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)                                AS rejected,
         SUM(CASE WHEN is_overdue = TRUE AND status = 'pending' THEN 1 ELSE 0 END)           AS overdue
       FROM clearance_requests
       ${deptClause}`,
      params
    );

    return res.json({
      success: true,
      data: {
        total:    Number(row.total    || 0),
        pending:  Number(row.pending  || 0),
        approved: Number(row.approved || 0),
        rejected: Number(row.rejected || 0),
        overdue:  Number(row.overdue  || 0),
      },
      message: "Stats fetched",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getRequests, getRequestById, approveRequest, rejectRequest, requestChanges, getStats };
