// assignmentController.js — Teacher/Student assignment system
const db   = require("../db");
const path = require("path");
const fs   = require("fs");

// ── Helper: insert a notification row ────────────────────────────────────
async function notifyUser({ userId, type, title, message, relatedId }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, related_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message || null, relatedId || null]
    );
  } catch (err) {
    console.error("[notify] Failed:", err.message);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// TEACHER — Create assignment
// POST /api/assignments
// ══════════════════════════════════════════════════════════════════════════
const createAssignment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { subject_id, title, description, due_date, checklist_item_id } = req.body;

    if (!subject_id || !title?.trim()) {
      return res.status(400).json({ message: "subject_id and title are required" });
    }

    // Verify teacher is assigned to this subject (admins bypass)
    if (!["admin", "super_admin"].includes(req.user.role)) {
      const { rows: asgn } = await db.query(
        "SELECT id FROM subject_teacher_assignments WHERE subject_id = $1 AND teacher_id = $2 LIMIT 1",
        [subject_id, teacherId]
      );
      if (asgn.length === 0) {
        return res.status(403).json({ message: "You are not assigned to this subject" });
      }
    }

    const { rows: [assignment] } = await db.query(
      `INSERT INTO assignments (subject_id, teacher_id, title, description, due_date, checklist_item_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [subject_id, teacherId, title.trim(), description || null, due_date || null, checklist_item_id || null]
    );

    // Fetch subject name for notification message
    const { rows: subRows } = await db.query(
      "SELECT name FROM subjects WHERE id = $1 LIMIT 1",
      [subject_id]
    );
    const subjectName = subRows[0]?.name || "a subject";

    // Notify all enrolled students (students with subject_approvals for this subject)
    const { rows: students } = await db.query(
      `SELECT DISTINCT u.id
       FROM users u
       JOIN term_grant_certificates tgc ON tgc.student_id = u.id
       JOIN subject_approvals sa ON sa.certificate_id = tgc.id AND sa.subject_id = $1
       WHERE u.role = 'student'`,
      [subject_id]
    );

    const duePart = due_date
      ? ` Due: ${new Date(due_date).toLocaleDateString("en-IN")}.`
      : "";

    for (const student of students) {
      await notifyUser({
        userId:    student.id,
        type:      "new_assignment",
        title:     `New Assignment: ${title.trim()}`,
        message:   `A new assignment has been posted for ${subjectName}.${duePart}`,
        relatedId: assignment.id,
      });
    }

    return res.status(201).json({
      message:   "Assignment created",
      assignment,
      notified:  students.length,
    });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// TEACHER — List my assignments (with submission counts)
// GET /api/assignments/my-assignments
// ══════════════════════════════════════════════════════════════════════════
const getTeacherAssignments = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { rows } = await db.query(
      `SELECT
         a.*,
         s.name          AS subject_name,
         s.subject_code,
         COUNT(sub.id)                                              AS total_submissions,
         COUNT(sub.id) FILTER (WHERE sub.status = 'submitted')     AS pending_review,
         COUNT(sub.id) FILTER (WHERE sub.status = 'accepted')      AS accepted,
         COUNT(sub.id) FILTER (WHERE sub.status = 'rejected')      AS rejected
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
       WHERE a.teacher_id = $1
       GROUP BY a.id, s.name, s.subject_code
       ORDER BY a.created_at DESC`,
      [teacherId]
    );
    return res.json({ assignments: rows });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// TEACHER — Get all submissions for an assignment
// GET /api/assignments/:assignmentId/submissions
// ══════════════════════════════════════════════════════════════════════════
const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;

    // Verify ownership
    const { rows: asgn } = await db.query(
      `SELECT a.*, s.name AS subject_name
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       WHERE a.id = $1 LIMIT 1`,
      [assignmentId]
    );
    if (asgn.length === 0) return res.status(404).json({ message: "Assignment not found" });
    if (
      asgn[0].teacher_id !== teacherId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // All enrolled students + their submission (LEFT JOIN)
    const { rows: students } = await db.query(
      `SELECT
         u.id           AS student_id,
         u.name         AS student_name,
         u.email,
         u.roll_number,
         sub.id         AS submission_id,
         sub.file_path,
         sub.file_name,
         sub.file_size,
         sub.status     AS submission_status,
         sub.remarks,
         sub.submitted_at,
         sub.reviewed_at
       FROM users u
       JOIN term_grant_certificates tgc ON tgc.student_id = u.id
       JOIN subject_approvals sa
         ON sa.certificate_id = tgc.id AND sa.subject_id = $1
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = $2 AND sub.student_id = u.id
       WHERE u.role = 'student'
       ORDER BY u.roll_number NULLS LAST, u.name`,
      [asgn[0].subject_id, assignmentId]
    );

    return res.json({ assignment: asgn[0], students });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// TEACHER — Accept or reject a submission
// PATCH /api/assignments/submissions/:submissionId/review
// ══════════════════════════════════════════════════════════════════════════
const reviewSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, remarks } = req.body;
    const teacherId = req.user.id;

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
    }

    // Fetch submission + assignment info
    const { rows: sub } = await db.query(
      `SELECT
         sub.*,
         a.teacher_id,
         a.subject_id,
         a.checklist_item_id,
         a.title AS assignment_title
       FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       WHERE sub.id = $1 LIMIT 1`,
      [submissionId]
    );
    if (sub.length === 0) return res.status(404).json({ message: "Submission not found" });
    if (
      sub[0].teacher_id !== teacherId &&
      !["admin", "super_admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { rows: [updated] } = await db.query(
      `UPDATE assignment_submissions
       SET status = $1, remarks = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $4
       RETURNING *`,
      [status, remarks || null, teacherId, submissionId]
    );

    // If accepted + assignment is linked to a checklist item → auto-mark completed
    if (status === "accepted" && sub[0].checklist_item_id) {
      await db.query(
        `INSERT INTO student_checklist_progress
           (student_id, checklist_item_id, subject_id, status, verified_by, verified_at)
         VALUES ($1, $2, $3, 'completed', $4, NOW())
         ON CONFLICT (student_id, checklist_item_id)
           DO UPDATE SET
             status      = 'completed',
             verified_by = EXCLUDED.verified_by,
             verified_at = NOW()`,
        [sub[0].student_id, sub[0].checklist_item_id, sub[0].subject_id, teacherId]
      );
    }

    // Notify student
    await notifyUser({
      userId:    sub[0].student_id,
      type:      `submission_${status}`,
      title:     status === "accepted" ? "Submission Accepted ✓" : "Submission Rejected ✗",
      message:   `Your submission for "${sub[0].assignment_title}" was ${status}.${remarks ? ` Remark: ${remarks}` : ""}`,
      relatedId: sub[0].assignment_id,
    });

    return res.json({ message: `Submission ${status}`, submission: updated });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// STUDENT — Get all assignments for my enrolled subjects
// GET /api/assignments/student/all
// ══════════════════════════════════════════════════════════════════════════
const getStudentAssignments = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { rows } = await db.query(
      `SELECT
         a.id,
         a.title,
         a.description,
         a.due_date,
         a.created_at,
         a.checklist_item_id,
         s.id            AS subject_id,
         s.name          AS subject_name,
         s.subject_code,
         u.name          AS teacher_name,
         sub.id          AS submission_id,
         sub.file_name,
         sub.file_size,
         sub.status      AS submission_status,
         sub.remarks,
         sub.submitted_at,
         sub.reviewed_at
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       JOIN users u ON u.id = a.teacher_id
       JOIN subject_approvals sa ON sa.subject_id = s.id
       JOIN term_grant_certificates tgc
         ON tgc.id = sa.certificate_id AND tgc.student_id = $1
       LEFT JOIN assignment_submissions sub
         ON sub.assignment_id = a.id AND sub.student_id = $1
       ORDER BY a.created_at DESC`,
      [studentId]
    );

    // Group by subject
    const bySubject = {};
    rows.forEach((row) => {
      if (!bySubject[row.subject_id]) {
        bySubject[row.subject_id] = {
          subject_id:   row.subject_id,
          subject_name: row.subject_name,
          subject_code: row.subject_code,
          assignments:  [],
        };
      }
      bySubject[row.subject_id].assignments.push({
        id:                row.id,
        title:             row.title,
        description:       row.description,
        due_date:          row.due_date,
        created_at:        row.created_at,
        teacher_name:      row.teacher_name,
        submission_id:     row.submission_id,
        file_name:         row.file_name,
        file_size:         row.file_size,
        submission_status: row.submission_status,
        remarks:           row.remarks,
        submitted_at:      row.submitted_at,
        reviewed_at:       row.reviewed_at,
      });
    });

    return res.json({ subjects: Object.values(bySubject) });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// STUDENT — Submit (or re-submit) an assignment
// POST /api/assignments/:id/submit   (multipart/form-data  field: "file")
// ══════════════════════════════════════════════════════════════════════════
const submitAssignment = async (req, res, next) => {
  try {
    const studentId    = req.user.id;
    const assignmentId = Number(req.params.id);
    const file         = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // Check assignment exists
    const { rows: asgn } = await db.query(
      `SELECT a.*, s.name AS subject_name
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       WHERE a.id = $1 LIMIT 1`,
      [assignmentId]
    );
    if (asgn.length === 0) {
      fs.unlink(file.path, () => {});
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify student is enrolled in the subject
    const { rows: enroll } = await db.query(
      `SELECT 1
       FROM subject_approvals sa
       JOIN term_grant_certificates tgc ON tgc.id = sa.certificate_id
       WHERE sa.subject_id = $1 AND tgc.student_id = $2
       LIMIT 1`,
      [asgn[0].subject_id, studentId]
    );
    if (enroll.length === 0) {
      fs.unlink(file.path, () => {});
      return res.status(403).json({ message: "You are not enrolled in this subject" });
    }

    // Check for existing submission
    const { rows: existing } = await db.query(
      "SELECT * FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2 LIMIT 1",
      [assignmentId, studentId]
    );

    if (existing.length > 0) {
      if (existing[0].status === "accepted") {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ message: "Submission already accepted — cannot re-submit" });
      }
      // Delete old file
      if (existing[0].file_path && fs.existsSync(existing[0].file_path)) {
        fs.unlink(existing[0].file_path, () => {});
      }
      // Replace submission
      const { rows: [updated] } = await db.query(
        `UPDATE assignment_submissions
         SET file_path = $1, file_name = $2, file_size = $3,
             status = 'submitted', remarks = NULL,
             submitted_at = NOW(), reviewed_at = NULL, reviewed_by = NULL
         WHERE id = $4 RETURNING *`,
        [file.path, file.originalname, file.size, existing[0].id]
      );
      await notifyUser({
        userId:    asgn[0].teacher_id,
        type:      "submission_updated",
        title:     "Assignment Re-submitted",
        message:   `A student re-submitted for "${asgn[0].title}"`,
        relatedId: assignmentId,
      });
      return res.json({ message: "Submission updated", submission: updated });
    }

    // New submission
    const { rows: [submission] } = await db.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, file_path, file_name, file_size)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [assignmentId, studentId, file.path, file.originalname, file.size]
    );

    // Notify teacher
    const { rows: [student] } = await db.query(
      "SELECT name FROM users WHERE id = $1 LIMIT 1",
      [studentId]
    );
    await notifyUser({
      userId:    asgn[0].teacher_id,
      type:      "new_submission",
      title:     "New Submission",
      message:   `${student?.name || "A student"} submitted for "${asgn[0].title}"`,
      relatedId: assignmentId,
    });

    return res.status(201).json({ message: "Submission uploaded", submission });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// STUDENT — Delete own submission (only if not yet reviewed)
// DELETE /api/assignments/submissions/:submissionId
// ══════════════════════════════════════════════════════════════════════════
const deleteSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const studentId = req.user.id;

    const { rows: sub } = await db.query(
      "SELECT * FROM assignment_submissions WHERE id = $1 AND student_id = $2 LIMIT 1",
      [submissionId, studentId]
    );
    if (sub.length === 0) return res.status(404).json({ message: "Submission not found" });
    if (sub[0].status !== "submitted") {
      return res.status(400).json({ message: "Cannot delete a reviewed submission" });
    }

    if (sub[0].file_path && fs.existsSync(sub[0].file_path)) {
      fs.unlink(sub[0].file_path, () => {});
    }
    await db.query("DELETE FROM assignment_submissions WHERE id = $1", [submissionId]);

    return res.json({ message: "Submission deleted" });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SHARED — Get notifications for current user
// GET /api/assignments/notifications
// ══════════════════════════════════════════════════════════════════════════
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    const unread_count = rows.filter((n) => !n.is_read).length;
    return res.json({ notifications: rows, unread_count });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// SHARED — Mark all notifications as read
// PATCH /api/assignments/notifications/read
// ══════════════════════════════════════════════════════════════════════════
const markNotificationsRead = async (req, res, next) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1",
      [req.user.id]
    );
    return res.json({ message: "Notifications marked as read" });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createAssignment,
  getTeacherAssignments,
  getAssignmentSubmissions,
  reviewSubmission,
  getStudentAssignments,
  submitAssignment,
  deleteSubmission,
  getNotifications,
  markNotificationsRead,
};
