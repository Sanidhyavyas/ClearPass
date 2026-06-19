const db = require("../db");
const logger = require("../utils/logger");
const { createAuditLog } = require("./auditController");
const { sendNotification } = require("./notificationController");
const {
  sendClearanceSubmitted,
  sendTeacherAssigned,
  sendTeacherNewRequest,
  sendFeeStatusUpdate,
  sendModuleStatusUpdate,
} = require("../utils/mailer");
const {
  sendClearanceSubmittedSMS,
  sendStatusUpdateSMS,
  sendTeacherAssignedSMS,
  sendFeeStatusSMS,
} = require("../utils/sms");

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
    ).catch((err) => logger.warn("[clearance] Audit log insert failed", { requestId: newId, message: err.message }));

    const { rows: requests } = await db.query(
      `SELECT cr.id, cr.student_id, cr.teacher_id, cr.status, cr.remarks,
              COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
              u.name AS student_name, u.email AS student_email
       FROM clearance_requests cr
       INNER JOIN users u ON u.id = cr.student_id
       WHERE cr.id = $1`,
      [newId]
    );

    const student = { name: requests[0].student_name, email: requests[0].student_email };
    res.status(201).json({ message: "Clearance request submitted successfully", request: requests[0] });

    // Fire-and-forget notifications (non-blocking)
    sendNotification({
      userId:  studentId,
      type:    "info",
      title:   "Clearance Request Submitted",
      message: "Your clearance request has been submitted and is pending review.",
    }).catch((err) => logger.warn("[clearance] Notification failed", { userId: studentId, message: err.message }));
    sendClearanceSubmitted(student).catch((err) => logger.warn("[clearance] Email notification failed", { userId: studentId, message: err.message }));
    sendClearanceSubmittedSMS(student).catch((err) => logger.warn("[clearance] SMS notification failed", { userId: studentId, message: err.message }));
    return;
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

    const { rows: studentRows } = await db.query(
      `SELECT u.id, u.name, u.email, u.phone
       FROM clearance_requests cr
       INNER JOIN users u ON u.id = cr.student_id
       WHERE cr.id = $1 LIMIT 1`,
      [requestId]
    );

    res.json({ message: `Request ${status} successfully` });

    // Fire-and-forget notifications (non-blocking)
    if (studentRows.length) {
      const student = studentRows[0];
      sendNotification({
        userId:  student.id,
        type:    status === "approved" ? "success" : "error",
        title:   `Clearance Request ${status === "approved" ? "Approved" : "Rejected"}`,
        message: `Your clearance request #${requestId} has been ${status}.${remarks ? ` Remarks: ${remarks.trim()}` : ""}`,
      }).catch((err) => logger.warn("[clearance] Status notification failed", { requestId, message: err.message }));
      sendModuleStatusUpdate(student, request.department, status, remarks).catch((err) => logger.warn("[clearance] Status email failed", { requestId, message: err.message }));
      sendStatusUpdateSMS(student, status).catch((err) => logger.warn("[clearance] Status SMS failed", { requestId, message: err.message }));
    }
    return;
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
                cr.roll_number, cr.student_name, cr.is_overdue, cr.current_stage,
                cr.fee_status, cr.fee_remarks, cr.fee_approved_at,
                COALESCE(cr.submitted_at, cr.created_at) AS created_at,
                student.id    AS student_id,
                student.email AS student_email,
                teacher.id    AS assigned_teacher_id,
                teacher.name  AS assigned_teacher_name,
                teacher.email AS assigned_teacher_email,
                fa.name       AS fee_approved_by_name
         FROM clearance_requests cr
         INNER JOIN users student ON student.id = cr.student_id
         LEFT JOIN users teacher  ON teacher.id = cr.teacher_id
         LEFT JOIN users fa       ON fa.id = cr.fee_approved_by
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

// Admin: approve or reject fee payment for a clearance request
const updateFeeStatus = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    const { status, remarks } = req.body;

    if (!VALID_STATUSES.includes(status) || status === "pending") {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
    }

    const { rows } = await db.query(
      "SELECT id, student_id FROM clearance_requests WHERE id = $1 LIMIT 1",
      [requestId]
    );
    if (!rows.length) return res.status(404).json({ message: "Clearance request not found" });

    await db.query(
      `UPDATE clearance_requests
         SET fee_status      = $1,
             fee_remarks     = $2,
             fee_approved_by = $3,
             fee_approved_at = NOW(),
             updated_at      = NOW()
       WHERE id = $4`,
      [status, remarks ? remarks.trim() : null, req.user.id, requestId]
    );

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name,
      userRole:   req.user.role,
      action:     `fee_${status}`,
      targetType: "clearance_request",
      targetId:   Number(requestId),
      details:    `Fee ${status} for request #${requestId} by ${req.user.name}${remarks ? `. Remarks: ${remarks}` : ""}`,
    });

    // Sync fee_cleared flag on TGC certificate when fee is approved/rejected
    await db.query(
      `UPDATE term_grant_certificates
         SET fee_cleared = $1
       WHERE student_id = $2`,
      [status === "approved", rows[0].student_id]
    );

    const { rows: studentRows } = await db.query(
      "SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1",
      [rows[0].student_id]
    );

    res.json({ message: `Fee payment ${status} successfully` });

    // Fire-and-forget notifications (non-blocking)
    if (studentRows.length) {
      const student = studentRows[0];
      sendNotification({
        userId:  student.id,
        type:    status === "approved" ? "success" : "warning",
        title:   `Fee Payment ${status === "approved" ? "Verified" : "Rejected"}`,
        message: `Your fee payment has been ${status} by admin.${remarks ? ` Remarks: ${remarks.trim()}` : ""}`,
      }).catch((err) => logger.warn("[clearance] Fee notification failed", { requestId, message: err.message }));
      sendFeeStatusUpdate(student, status, remarks).catch((err) => logger.warn("[clearance] Fee email failed", { requestId, message: err.message }));
      sendFeeStatusSMS(student, status).catch((err) => logger.warn("[clearance] Fee SMS failed", { requestId, message: err.message }));
    }
    return;
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

    // Look up student and teacher details for notifications
    const { rows: reqRows } = await db.query(
      `SELECT u.id AS student_id, u.name AS student_name, u.email AS student_email, u.phone AS student_phone
       FROM clearance_requests cr
       INNER JOIN users u ON u.id = cr.student_id
       WHERE cr.id = $1 LIMIT 1`,
      [requestId]
    );
    const { rows: teacherRows } = await db.query(
      "SELECT id, name, email, phone FROM users WHERE id = $1 LIMIT 1",
      [assignedTeacherId]
    );

    res.json({ message: "Teacher assigned successfully" });

    // Fire-and-forget notifications (non-blocking)
    if (reqRows.length) {
      const student = { id: reqRows[0].student_id, name: reqRows[0].student_name, email: reqRows[0].student_email, phone: reqRows[0].student_phone };
      const teacher = teacherRows[0] || {};
      sendNotification({
        userId:  student.id,
        type:    "info",
        title:   "Reviewer Assigned",
        message: `A reviewer (${teacher.name || "an admin"}) has been assigned to your clearance request.`,
      }).catch((err) => logger.warn("[clearance] Assign notification failed", { requestId, message: err.message }));
      if (teacher.id) {
        sendNotification({
          userId:  teacher.id,
          type:    "info",
          title:   "New Clearance Request Assigned",
          message: `Request #${requestId} from ${student.name} has been assigned to you for review.`,
        }).catch((err) => logger.warn("[clearance] Teacher notification failed", { requestId, teacherId: teacher.id, message: err.message }));
      }
      sendTeacherAssigned(student, teacher.name || "a reviewer").catch((err) => logger.warn("[clearance] Teacher assigned email failed", { requestId, message: err.message }));
      if (teacher.email) sendTeacherNewRequest(teacher, student.name, requestId).catch((err) => logger.warn("[clearance] Teacher new request email failed", { requestId, message: err.message }));
      sendTeacherAssignedSMS(student, teacher.name || "a reviewer").catch((err) => logger.warn("[clearance] Teacher assigned SMS failed", { requestId, message: err.message }));
    }
    return;
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/clearance/my-requests/:id
 * A student can cancel (delete) their own pending clearance request.
 * Rejects attempts to cancel requests that have already been approved or rejected.
 */
const cancelClearanceRequest = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const requestId = parseInt(req.params.id, 10);

    if (!requestId || requestId < 1) {
      return res.status(400).json({ message: "Valid request id is required" });
    }

    const { rows } = await db.query(
      "SELECT id, status FROM clearance_requests WHERE id = $1 AND student_id = $2 LIMIT 1",
      [requestId, studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Clearance request not found" });
    }

    if (rows[0].status !== "pending") {
      return res.status(409).json({
        message: `Cannot cancel a request that is already '${rows[0].status}'`,
      });
    }

    await db.query("DELETE FROM clearance_requests WHERE id = $1", [requestId]);

    // Audit log entry (non-fatal)
    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role)
       VALUES ($1, 'cancelled', $2, $3)`,
      [requestId, studentId, req.user.role]
    ).catch((err) => logger.warn("[clearance] Cancel audit log failed", { requestId, message: err.message }));

    return res.json({ message: "Clearance request cancelled successfully" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  assignTeacher,
  cancelClearanceRequest,
  createClearanceRequest,
  getAllRequests,
  getAssignedRequests,
  getStudentRequests,
  getTeachers,
  updateFeeStatus,
  updateRequestStatus,
};
