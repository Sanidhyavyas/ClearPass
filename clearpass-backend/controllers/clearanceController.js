const db = require("../db");
const { createAuditLog } = require("./auditController");

const VALID_STATUSES = ["pending", "approved", "rejected"];

const createClearanceRequest = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { remarks, semester, year, roll_number, department } = req.body;

    const { rows: existing } = await db.query(
      "SELECT id FROM clearance_requests WHERE student_id = $1 AND status = 'pending' LIMIT 1",
      [studentId]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "You already have a pending clearance request" });
    }

    // Auto-populate student_name/department/roll_number from user record if not supplied
    const studentName  = req.user.name;
    const studentDept  = department  || req.user.department  || null;
    const studentRoll  = roll_number || req.user.roll_number || null;

    const { rows: inserted } = await db.query(
      `INSERT INTO clearance_requests
         (student_id, remarks, semester, year, roll_number, student_name, department, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [studentId, remarks ? remarks.trim() : null, semester || null, year || null, studentRoll, studentName, studentDept]
    );
    const newId = inserted[0].id;

    // Insert submitted audit log
    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role)
       VALUES ($1, 'submitted', $2, $3)`,
      [newId, studentId, req.user.role]
    ).catch(() => {}); // non-fatal

    const { rows: requests } = await db.query(
      `SELECT cr.id, cr.student_id, cr.teacher_id, cr.status, cr.remarks,
              COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
              u.name AS student_name, u.email AS student_email
       FROM clearance_requests cr
       INNER JOIN users u ON u.id = cr.student_id
       WHERE cr.id = $1`,
      [newId]
    );

    return res.status(201).json({ message: "Clearance request submitted successfully", request: requests[0] });
  } catch (error) {
    return next(error);
  }
};

const getStudentRequests = async (req, res, next) => {
  try {
    const { rows: requests } = await db.query(
      `SELECT cr.id, cr.status, cr.remarks, cr.rejection_reason, cr.semester, cr.year,
              COALESCE(cr.submitted_at, cr.created_at) AS created_at,
              teacher.id   AS assigned_teacher_id,
              teacher.name AS assigned_teacher_name,
              teacher.email AS assigned_teacher_email
       FROM clearance_requests cr
       LEFT JOIN users teacher ON teacher.id = cr.teacher_id
       WHERE cr.student_id = $1
       ORDER BY COALESCE(cr.submitted_at, cr.created_at) DESC`,
      [req.user.id]
    );

    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
};

// Legacy: teachers fetching by department filter instead of assignment
const getAssignedRequests = async (req, res, next) => {
  try {
    const { department } = req.user;

    const { rows: requests } = await db.query(
      `SELECT cr.id, cr.status, cr.remarks, cr.department, cr.semester, cr.year,
              COALESCE(cr.submitted_at, cr.created_at) AS created_at,
              student.id    AS student_id,
              student.name  AS student_name,
              student.email AS student_email
       FROM clearance_requests cr
       INNER JOIN users student ON student.id = cr.student_id
       WHERE cr.department = $1
       ORDER BY CASE cr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                COALESCE(cr.submitted_at, cr.created_at) DESC`,
      [department || ""]
    );

    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
};

const updateRequestStatus = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const { status, remarks } = req.body;

    if (!VALID_STATUSES.includes(status) || status === "pending") {
      return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const { rows: requests } = await db.query(
      "SELECT id, teacher_id, department, status FROM clearance_requests WHERE id = $1 LIMIT 1",
      [requestId]
    );

    if (requests.length === 0) {
      return res.status(404).json({ message: "Clearance request not found" });
    }

    const request = requests[0];
    const { role, department: userDept } = req.user;

    // Teachers can only update requests from their department
    if (role === "teacher" && request.department !== userDept) {
      return res.status(403).json({ message: "Access denied: not your department" });
    }

    const timestampCol = status === "approved" ? ", approved_at = NOW()" : ", rejected_at = NOW()";

    await db.query(
      `UPDATE clearance_requests
         SET status = $1, remarks = $2, teacher_id = $3, updated_at = NOW()${timestampCol}
       WHERE id = $4`,
      [status, remarks ? remarks.trim() : null, req.user.id, requestId]
    );

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name,
      userRole:   req.user.role,
      action:     status,
      targetType: "clearance_request",
      targetId:   Number(requestId),
      details:    `Request #${requestId} ${status} by ${req.user.name}. Remarks: ${remarks ? remarks.trim() : "none"}`,
    });

    return res.json({ message: `Request ${status} successfully` });
  } catch (error) {
    return next(error);
  }
};

const getAllRequests = async (req, res, next) => {
  try {
    let requests = [];

    try {
      const { rows } = await db.query(
        `SELECT cr.id, cr.status, cr.remarks, cr.department, cr.semester, cr.year,
                cr.roll_number, cr.student_name, cr.is_overdue,
                COALESCE(cr.submitted_at, cr.created_at) AS created_at,
                student.id    AS student_id,
                student.email AS student_email,
                teacher.id    AS assigned_teacher_id,
                teacher.name  AS assigned_teacher_name,
                teacher.email AS assigned_teacher_email
         FROM clearance_requests cr
         INNER JOIN users student ON student.id = cr.student_id
         LEFT JOIN users teacher  ON teacher.id = cr.teacher_id
         ORDER BY CASE cr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                  COALESCE(cr.submitted_at, cr.created_at) DESC`
      );

      requests = rows;
    } catch (error) {
      if (error.code !== "42P01") throw error; // 42P01 = undefined_table in PostgreSQL
    }

    return res.json({ requests });
  } catch (error) {
    return next(error);
  }
};

const getTeachers = async (req, res, next) => {
  try {
    const { rows: teachers } = await db.query(
      "SELECT id, name, email, role, department FROM users WHERE role = 'teacher' ORDER BY name ASC"
    );

    return res.json({ teachers });
  } catch (error) {
    return next(error);
  }
};

// Admin: assign teacher to a request (kept for backward-compat)
const assignTeacher = async (req, res, next) => {
  try {
    const requestId       = req.params.id;
    const { assignedTeacherId } = req.body;

    if (!assignedTeacherId) {
      return res.status(400).json({ message: "assignedTeacherId is required" });
    }

    const { rows: teachers } = await db.query(
      "SELECT id, role FROM users WHERE id = $1 LIMIT 1",
      [assignedTeacherId]
    );

    if (teachers.length === 0 || teachers[0].role !== "teacher") {
      return res.status(400).json({ message: "Assigned user must be a valid teacher" });
    }

    const result = await db.query(
      "UPDATE clearance_requests SET teacher_id = $1 WHERE id = $2",
      [assignedTeacherId, requestId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Clearance request not found" });
    }

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name,
      userRole:   req.user.role,
      action:     "assigned",
      targetType: "clearance_request",
      targetId:   Number(requestId),
      details:    `Request #${requestId} assigned to teacher ID ${assignedTeacherId} by ${req.user.name}`,
    });

    return res.json({ message: "Teacher assigned successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  assignTeacher,
  createClearanceRequest,
  getAllRequests,
  getAssignedRequests,
  getStudentRequests,
  getTeachers,
  updateRequestStatus,
};
