/**
 * controllers/tgcController.js
 * ADDED: Term Grant Certificate — all TGC-specific operations.
 *
 * Covers:
 *   Part 2A — Subject Management (super_admin / admin)
 *   Part 2B — Checklist Builder   (teacher)
 *   Part 2C — Student Progress & Teacher Approval
 *   Part 2D — Certificate Request & Status (student)
 *   Part 2E — Analytics (admin / super_admin)
 *   Part 6  — PDF Generation
 */

const fs   = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const db   = require("../db");

// ── Certificate upload directory ─────────────────────────────────────────
const CERT_DIR = path.join(__dirname, "..", "uploads", "certificates");
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

// ══════════════════════════════════════════════════════════════════════════
// PART 2A — Subject Management
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/subjects/create
 */
const createTGCSubject = async (req, res, next) => {
  try {
    const { name, code, type, semester, year, academic_year } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "name and code are required" });
    }
    const validTypes = ["TH", "PR", "MP", "MDM", "PBL", "SCIL"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ message: `type must be one of: ${validTypes.join(", ")}` });
    }
    const subjectCode = String(code).trim().toUpperCase();

    const { rows: dup } = await db.query(
      "SELECT id FROM subjects WHERE subject_code = $1 LIMIT 1", [subjectCode]
    );
    if (dup.length > 0) {
      return res.status(409).json({ message: "Subject code already exists" });
    }

    const { rows: [created] } = await db.query(
      `INSERT INTO subjects
         (subject_code, name, credits, is_tgc, subject_type, tgc_semester, tgc_year, academic_year)
       VALUES ($1, $2, 1, TRUE, $3, $4, $5, $6)
       RETURNING *`,
      [
        subjectCode,
        name.trim(),
        type          || null,
        semester      || 6,
        year          || "TY",
        academic_year || "2025-26",
      ]
    );
    return res.status(201).json({ message: "Subject created", subject: created });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/subjects/:subjectId/assign-teacher
 */
const assignTeacher = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { teacher_id } = req.body;
    if (!teacher_id) {
      return res.status(400).json({ message: "teacher_id is required" });
    }

    const { rows: subs } = await db.query(
      "SELECT id FROM subjects WHERE id = $1 AND is_tgc = TRUE LIMIT 1", [subjectId]
    );
    if (subs.length === 0) return res.status(404).json({ message: "TGC subject not found" });

    const { rows: teachers } = await db.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'teacher' LIMIT 1", [teacher_id]
    );
    if (teachers.length === 0) return res.status(404).json({ message: "Teacher user not found" });

    const { rows: [assignment] } = await db.query(
      `INSERT INTO subject_teacher_assignments (subject_id, teacher_id, assigned_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (subject_id, teacher_id)
         DO UPDATE SET assigned_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [subjectId, teacher_id, req.user.id]
    );
    return res.status(201).json({ message: "Teacher assigned", assignment });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/subjects/:subjectId/assign-teacher/:teacherId
 */
const removeTeacherAssignment = async (req, res, next) => {
  try {
    const { subjectId, teacherId } = req.params;
    await db.query(
      "DELETE FROM subject_teacher_assignments WHERE subject_id = $1 AND teacher_id = $2",
      [subjectId, teacherId]
    );
    return res.json({ message: "Assignment removed" });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/subjects
 */
const listTGCSubjects = async (req, res, next) => {
  try {
    const { semester, year, academic_year } = req.query;
    const conds  = ["s.is_tgc = TRUE"];
    const params = [];

    if (semester)      { conds.push(`s.tgc_semester = $${params.length + 1}`);  params.push(parseInt(semester, 10)); }
    if (year)          { conds.push(`s.tgc_year = $${params.length + 1}`);      params.push(year); }
    if (academic_year) { conds.push(`s.academic_year = $${params.length + 1}`); params.push(academic_year); }

    const where = `WHERE ${conds.join(" AND ")}`;

    const { rows: subjects } = await db.query(
      `SELECT
         s.id, s.subject_code, s.name,
         s.subject_type  AS type,
         s.tgc_semester  AS semester,
         s.tgc_year      AS year,
         s.academic_year,
         s.is_active,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'teacher_id',    u.id,
               'teacher_name',  u.name,
               'teacher_email', u.email
             )
           ) FILTER (WHERE u.id IS NOT NULL),
           '[]'
         ) AS teachers
       FROM subjects s
       LEFT JOIN subject_teacher_assignments sta ON sta.subject_id = s.id
       LEFT JOIN users u ON u.id = sta.teacher_id
       ${where}
       GROUP BY s.id
       ORDER BY s.tgc_semester, s.subject_type, s.name`,
      params
    );
    return res.json({ subjects });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/subjects/semester/:sem
 */
const getSubjectsBySemester = async (req, res, next) => {
  try {
    const sem = parseInt(req.params.sem, 10);
    const { rows: subjects } = await db.query(
      `SELECT
         s.id, s.subject_code, s.name,
         s.subject_type AS type,
         s.tgc_semester AS semester,
         s.tgc_year     AS year,
         s.academic_year,
         COALESCE(
           JSON_AGG(JSON_BUILD_OBJECT('teacher_id', u.id, 'teacher_name', u.name))
             FILTER (WHERE u.id IS NOT NULL),
           '[]'
         ) AS teachers
       FROM subjects s
       LEFT JOIN subject_teacher_assignments sta ON sta.subject_id = s.id
       LEFT JOIN users u ON u.id = sta.teacher_id
       WHERE s.is_tgc = TRUE AND s.tgc_semester = $1
       GROUP BY s.id
       ORDER BY s.subject_type, s.name`,
      [sem]
    );
    return res.json({ subjects });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/subjects/:id
 */
const deleteTGCSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await db.query(
      "DELETE FROM subjects WHERE id = $1 AND is_tgc = TRUE RETURNING id", [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "TGC subject not found" });
    return res.json({ message: "Subject deleted" });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// PART 2B — Checklist Management (Teacher)
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/checklist/create
 */
const createChecklistItem = async (req, res, next) => {
  try {
    const { subject_id, item_name, item_type, is_required } = req.body;
    const teacherId = req.user.id;

    if (!subject_id || !item_name) {
      return res.status(400).json({ message: "subject_id and item_name are required" });
    }

    // Teacher must be assigned unless admin/super_admin
    if (!["admin", "super_admin"].includes(req.user.role)) {
      const { rows: assign } = await db.query(
        "SELECT id FROM subject_teacher_assignments WHERE subject_id = $1 AND teacher_id = $2 LIMIT 1",
        [subject_id, teacherId]
      );
      if (assign.length === 0) {
        return res.status(403).json({ message: "You are not assigned to this subject" });
      }
    }

    const validTypes = [
      "Assignment","TA1","TA2","JA1","JA2",
      "Open Assessment","Repeat TA","Remedial Task",
      "Attendance","Exam","Custom",
    ];
    if (item_type && !validTypes.includes(item_type)) {
      return res.status(400).json({ message: "Invalid item_type" });
    }

    const { rows: [item] } = await db.query(
      `INSERT INTO checklist_templates (subject_id, teacher_id, item_name, item_type, is_required)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [subject_id, teacherId, item_name.trim(), item_type || "Custom", is_required !== false]
    );
    return res.status(201).json({ message: "Checklist item created", item });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/checklist/subject/:subjectId
 */
const getChecklistForSubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const { rows: items } = await db.query(
      `SELECT ct.*, u.name AS teacher_name
       FROM checklist_templates ct
       LEFT JOIN users u ON u.id = ct.teacher_id
       WHERE ct.subject_id = $1
       ORDER BY ct.created_at`,
      [subjectId]
    );
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
};

/**
 * PUT /api/checklist/:itemId
 */
const updateChecklistItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { item_name, item_type, is_required } = req.body;
    const teacherId = req.user.id;

    const { rows: existing } = await db.query(
      "SELECT * FROM checklist_templates WHERE id = $1 LIMIT 1", [itemId]
    );
    if (existing.length === 0) return res.status(404).json({ message: "Item not found" });

    const item = existing[0];
    if (item.teacher_id !== teacherId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to edit this item" });
    }

    const { rows: [updated] } = await db.query(
      `UPDATE checklist_templates
       SET item_name   = COALESCE($1, item_name),
           item_type   = COALESCE($2, item_type),
           is_required = COALESCE($3, is_required)
       WHERE id = $4
       RETURNING *`,
      [item_name?.trim() || null, item_type || null, is_required ?? null, itemId]
    );
    return res.json({ message: "Item updated", item: updated });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/checklist/:itemId
 */
const deleteChecklistItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const teacherId  = req.user.id;

    const { rows: existing } = await db.query(
      "SELECT * FROM checklist_templates WHERE id = $1 LIMIT 1", [itemId]
    );
    if (existing.length === 0) return res.status(404).json({ message: "Item not found" });

    const item = existing[0];
    if (item.teacher_id !== teacherId && !["admin", "super_admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await db.query("DELETE FROM checklist_templates WHERE id = $1", [itemId]);
    return res.json({ message: "Item deleted" });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// PART 2C — Student Progress & Teacher Approval
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/checklist/students/:subjectId
 * Teacher sees ALL students who have a TGC application + their checklist progress.
 * LEFT JOIN on subject_approvals so students without an approval row still appear.
 */
const getStudentsForSubject = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const { rows: items } = await db.query(
      "SELECT * FROM checklist_templates WHERE subject_id = $1 ORDER BY created_at",
      [subjectId]
    );

    // LEFT JOIN so a student shows up even if no subject_approval row exists yet
    const { rows: students } = await db.query(
      `SELECT
         u.id            AS student_id,
         u.name          AS student_name,
         u.email,
         u.roll_number,
         u.enrollment_no,
         u.division,
         sa.id           AS approval_id,
         sa.status       AS subject_approval_status,
         sa.remarks      AS approval_remarks,
         sa.mini_project_status
       FROM users u
       JOIN term_grant_certificates tgc ON tgc.student_id = u.id
       LEFT JOIN subject_approvals sa
         ON sa.certificate_id = tgc.id AND sa.subject_id = $1
       WHERE u.role = 'student'
       ORDER BY u.roll_number NULLS LAST, u.name`,
      [subjectId]
    );

    let progressMap = {};
    if (students.length > 0) {
      const studentIds = students.map((s) => s.student_id);
      const { rows: progress } = await db.query(
        `SELECT * FROM student_checklist_progress
         WHERE subject_id = $1 AND student_id = ANY($2)`,
        [subjectId, studentIds]
      );
      progress.forEach((p) => {
        if (!progressMap[p.student_id]) progressMap[p.student_id] = {};
        progressMap[p.student_id][p.checklist_item_id] = p;
      });
    }

    const result = students.map((s) => ({
      student_id:              s.student_id,
      student_name:            s.student_name,
      email:                   s.email,
      roll_number:             s.roll_number,
      enrollment_no:           s.enrollment_no,
      division:                s.division,
      approval_id:             s.approval_id,
      subject_approval_status: s.subject_approval_status,
      approval_remarks:        s.approval_remarks,
      mini_project_status:     s.mini_project_status,
      checklist: items.map((item) => {
        const prog = progressMap[s.student_id]?.[item.id] || {
          status: "pending", remarks: null, verified_at: null,
        };
        return {
          checklist_item_id: item.id,
          item_name:         item.item_name,
          item_type:         item.item_type,
          is_required:       item.is_required,
          status:            prog.status,
          remarks:           prog.remarks,
        };
      }),
    }));

    return res.json({ subject_id: subjectId, items, students: result });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/checklist/progress/:progressId
 */
const updateChecklistProgress = async (req, res, next) => {
  try {
    const { progressId } = req.params;
    const { status, remarks } = req.body;
    const teacherId = req.user.id;

    const valid = ["pending", "completed", "waived"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "status must be: pending | completed | waived" });
    }

    const { rows: [updated] } = await db.query(
      `UPDATE student_checklist_progress
       SET status = $1, remarks = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, remarks || null, teacherId, progressId]
    );
    if (!updated) return res.status(404).json({ message: "Progress entry not found" });

    return res.json({ message: "Progress updated", progress: updated });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/checklist/progress/upsert
 * Create or update a student's checklist item status.
 */
const upsertChecklistProgress = async (req, res, next) => {
  try {
    const { student_id, checklist_item_id, subject_id, status, remarks } = req.body;
    const teacherId = req.user.id;

    if (!student_id || !checklist_item_id || !subject_id) {
      return res.status(400).json({ message: "student_id, checklist_item_id, subject_id are required" });
    }
    const valid = ["pending", "completed", "waived"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "status must be: pending | completed | waived" });
    }

    const { rows: [result] } = await db.query(
      `INSERT INTO student_checklist_progress
         (student_id, checklist_item_id, subject_id, status, remarks, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, checklist_item_id)
       DO UPDATE SET
         status      = EXCLUDED.status,
         remarks     = EXCLUDED.remarks,
         verified_by = EXCLUDED.verified_by,
         verified_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student_id, checklist_item_id, subject_id, status, remarks || null, teacherId]
    );
    return res.json({ message: "Progress saved", progress: result });
  } catch (err) {
    return next(err);
  }
};

/**
 * POST /api/subjects/:subjectId/approve/:studentId
 * Teacher gives final subject approval.
 */
const approveStudentSubject = async (req, res, next) => {
  try {
    const { subjectId, studentId } = req.params;
    const { status, remarks, mini_project_status } = req.body;
    const teacherId = req.user.id;

    const valid = ["approved", "rejected", "pending"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "status must be: approved | rejected | pending" });
    }

    let { rows: approval } = await db.query(
      `SELECT sa.*
       FROM subject_approvals sa
       JOIN term_grant_certificates tgc ON tgc.id = sa.certificate_id
       WHERE sa.subject_id = $1 AND sa.student_id = $2
       LIMIT 1`,
      [subjectId, studentId]
    );

    // If no approval row exists yet, auto-create one from the student's TGC cert
    if (approval.length === 0) {
      const { rows: certs } = await db.query(
        "SELECT id FROM term_grant_certificates WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
        [studentId]
      );
      if (certs.length === 0) {
        return res.status(404).json({ message: "Student has not applied for TGC yet." });
      }
      const { rows: created } = await db.query(
        `INSERT INTO subject_approvals (certificate_id, student_id, subject_id, teacher_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (certificate_id, subject_id) DO UPDATE SET teacher_id = EXCLUDED.teacher_id
         RETURNING *`,
        [certs[0].id, studentId, subjectId, teacherId]
      );
      approval = created;
    }

    // Compute approved_at in JS to avoid reusing $1 in CASE (causes "inconsistent types" error in PostgreSQL)
    const approvedAt = status === "approved" ? new Date() : null;
    const { rows: [updated] } = await db.query(
      `UPDATE subject_approvals
       SET status              = $1,
           remarks             = $2,
           mini_project_status = $3,
           teacher_id          = $4,
           approved_at         = $6
       WHERE id = $5
       RETURNING *`,
      [status, remarks || null, mini_project_status || null, teacherId, approval[0].id, approvedAt]
    );

    // Re-check overall certificate status
    const certId = approval[0].certificate_id;
    const { rows: [certCheck] } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE sa.status = 'approved') AS approved_count,
         COUNT(*)                                        AS total_count
       FROM subject_approvals sa
       WHERE sa.certificate_id = $1`,
      [certId]
    );

    if (
      certCheck &&
      Number(certCheck.approved_count) > 0 &&
      Number(certCheck.approved_count) === Number(certCheck.total_count)
    ) {
      await db.query(
        "UPDATE term_grant_certificates SET overall_status = 'approved' WHERE id = $1",
        [certId]
      );
    } else if (status === "rejected") {
      await db.query(
        `UPDATE term_grant_certificates
         SET overall_status = 'rejected'
         WHERE id = $1 AND overall_status = 'pending'`,
        [certId]
      );
    }

    return res.json({ message: `Subject ${status}`, approval: updated });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// PART 2D — Term Grant Certificate (Student)
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/certificate/request
 */
const requestCertificate = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { semester = 6, academic_year = "2025-26" } = req.body;

    // Upsert certificate record
    const { rows: [certificate] } = await db.query(
      `INSERT INTO term_grant_certificates (student_id, semester, academic_year)
       VALUES ($1, $2, $3)
       ON CONFLICT (student_id, semester, academic_year)
         DO UPDATE SET created_at = term_grant_certificates.created_at
       RETURNING *`,
      [studentId, semester, academic_year]
    );

    // Get all TGC subjects for this semester
    const { rows: subjects } = await db.query(
      "SELECT id FROM subjects WHERE is_tgc = TRUE AND tgc_semester = $1 AND academic_year = $2",
      [semester, academic_year]
    );

    for (const subject of subjects) {
      const { rows: teachers } = await db.query(
        "SELECT teacher_id FROM subject_teacher_assignments WHERE subject_id = $1 LIMIT 1",
        [subject.id]
      );
      const teacherId = teachers.length > 0 ? teachers[0].teacher_id : null;

      // Create subject_approval (ignore if exists)
      await db.query(
        `INSERT INTO subject_approvals (certificate_id, student_id, subject_id, teacher_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (certificate_id, subject_id) DO NOTHING`,
        [certificate.id, studentId, subject.id, teacherId]
      );

      // Create checklist progress entries for each template item
      const { rows: items } = await db.query(
        "SELECT id FROM checklist_templates WHERE subject_id = $1",
        [subject.id]
      );
      for (const item of items) {
        await db.query(
          `INSERT INTO student_checklist_progress (student_id, checklist_item_id, subject_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (student_id, checklist_item_id) DO NOTHING`,
          [studentId, item.id, subject.id]
        );
      }
    }

    return res.status(201).json({ message: "Certificate request created", certificate });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/certificate/my-status
 */
const getMyCertificateStatus = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const { rows: certs } = await db.query(
      "SELECT * FROM term_grant_certificates WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
      [studentId]
    );

    if (certs.length === 0) {
      return res.json({
        certificate: null, subjects: [],
        approved_count: 0, total_count: 0,
      });
    }
    const cert = certs[0];

    const { rows: approvals } = await db.query(
      `SELECT
         sa.id, sa.subject_id, sa.teacher_id,
         sa.status, sa.remarks,
         sa.mini_project_status, sa.approved_at,
         s.name            AS subject_name,
         s.subject_code,
         s.subject_type    AS type,
         u.name            AS teacher_name
       FROM subject_approvals sa
       JOIN subjects s ON s.id = sa.subject_id
       LEFT JOIN users u ON u.id = sa.teacher_id
       WHERE sa.certificate_id = $1
       ORDER BY s.subject_type, s.name`,
      [cert.id]
    );

    const subjectIds = approvals.map((a) => a.subject_id);
    let progressBySubject = {};

    if (subjectIds.length > 0) {
      const { rows: progress } = await db.query(
        `SELECT
           scp.*,
           ct.item_name, ct.item_type, ct.is_required
         FROM student_checklist_progress scp
         JOIN checklist_templates ct ON ct.id = scp.checklist_item_id
         WHERE scp.student_id = $1 AND scp.subject_id = ANY($2)
         ORDER BY ct.created_at`,
        [studentId, subjectIds]
      );
      progress.forEach((p) => {
        if (!progressBySubject[p.subject_id]) progressBySubject[p.subject_id] = [];
        progressBySubject[p.subject_id].push(p);
      });
    }

    const subjects = approvals.map((a) => ({
      ...a,
      checklist: progressBySubject[a.subject_id] || [],
    }));

    const approvedCount = approvals.filter((a) => a.status === "approved").length;

    return res.json({
      certificate: cert,
      subjects,
      approved_count: approvedCount,
      total_count: approvals.length,
    });
  } catch (err) {
    return next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
// PART 6 — PDF Certificate Generation
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/certificate/:studentId/download
 */
const generateTGCPDF = async (req, res, next) => {
  try {
    const studentId = parseInt(req.params.studentId, 10);

    // Students can only download their own
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { rows: certs } = await db.query(
      "SELECT * FROM term_grant_certificates WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
      [studentId]
    );
    if (certs.length === 0) return res.status(404).json({ message: "No certificate request found" });

    const cert = certs[0];
    if (cert.overall_status !== "approved") {
      return res.status(400).json({
        message: "Certificate not fully approved yet",
        overall_status: cert.overall_status,
      });
    }

    const { rows: [student] } = await db.query(
      "SELECT id, name, email, roll_number, enrollment_no, division, mobile, parent_mobile FROM users WHERE id = $1 LIMIT 1",
      [studentId]
    );
    if (!student) return res.status(404).json({ message: "Student not found" });

    const { rows: approvals } = await db.query(
      `SELECT
         sa.*,
         s.name         AS subject_name,
         s.subject_code,
         s.subject_type AS type,
         u.name         AS teacher_name,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'item_name', ct.item_name,
               'item_type', ct.item_type,
               'status',    scp.status
             ) ORDER BY ct.created_at
           ) FILTER (WHERE ct.id IS NOT NULL),
           '[]'
         ) AS checklist
       FROM subject_approvals sa
       JOIN subjects s ON s.id = sa.subject_id
       LEFT JOIN users u ON u.id = sa.teacher_id
       LEFT JOIN checklist_templates ct ON ct.subject_id = s.id
       LEFT JOIN student_checklist_progress scp
         ON scp.checklist_item_id = ct.id AND scp.student_id = $2
       WHERE sa.certificate_id = $1
       GROUP BY sa.id, s.name, s.subject_code, s.subject_type, u.name
       ORDER BY s.subject_type, s.name`,
      [cert.id, studentId]
    );

    const fileName = `TGC_${studentId}_sem${cert.semester}.pdf`;
    const filePath = path.join(CERT_DIR, fileName);

    await buildTGCPDF({ student, cert, approvals, filePath });

    await db.query(
      "UPDATE term_grant_certificates SET generated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [cert.id]
    );

    return res.download(filePath, fileName);
  } catch (err) {
    return next(err);
  }
};

// ── PDF builder ──────────────────────────────────────────────────────────
async function buildTGCPDF({ student, cert, approvals, filePath }) {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const W      = doc.page.width;
    const M      = 36;
    const innerW = W - 2 * M;

    // ── Outer border ────────────────────────────────────────────────────
    doc.rect(M - 4, M - 4, innerW + 8, doc.page.height - 2 * (M - 4))
       .strokeColor("#1e3a5f").lineWidth(2).stroke();

    // ── Header block ────────────────────────────────────────────────────
    doc.rect(M, M, innerW, 58).fill("#1e3a5f");
    doc.fontSize(14).font("Helvetica-Bold").fillColor("#fff")
       .text("MIT School of Computing", M, M + 6, { width: innerW, align: "center" });
    doc.fontSize(9).font("Helvetica").fillColor("#cde")
       .text("Dept. of Computer Science and Engineering", M, M + 24, { width: innerW, align: "center" });
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffd700")
       .text("TERM GRANT CERTIFICATE", M, M + 38, { width: innerW, align: "center" });

    // ── Sub-header ───────────────────────────────────────────────────────
    const shY = M + 64;
    doc.fontSize(8).font("Helvetica").fillColor("#333")
       .text(
         `Class: TY  |  Academic Year: ${cert.academic_year}  |  Semester: II  |  Date: ${new Date().toLocaleDateString("en-IN")}`,
         M, shY, { width: innerW, align: "center" }
       );

    // ── Student Details ─────────────────────────────────────────────────
    const detY = shY + 14;
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#1e3a5f")
       .text("STUDENT DETAILS", M, detY);
    const dBoxY = detY + 10;
    doc.rect(M, dBoxY, innerW, 32).strokeColor("#aaa").lineWidth(0.5).stroke();

    const cw   = innerW / 4;
    const detInfo = [
      ["Name",        student.name         || "—"],
      ["Roll No.",     student.roll_number  || "—"],
      ["Enrollment No.", student.enrollment_no || "—"],
      ["Division",    student.division      || "—"],
      ["Email",       student.email         || "—"],
      ["Mobile",      student.mobile        || "—"],
      ["Dept.",       "Computer Science & Engg."],
      ["Year",        "TY (Sem 6)"],
    ];

    detInfo.forEach((pair, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x   = M + col * cw + 4;
      const y   = dBoxY + 4 + row * 14;
      doc.font("Helvetica-Bold").fillColor("#555").fontSize(7)
         .text(`${pair[0]}: `, x, y, { continued: true })
         .font("Helvetica").fillColor("#111")
         .text(pair[1], { lineBreak: false });
    });

    // ── Subject Table ───────────────────────────────────────────────────
    const tblY  = dBoxY + 40;
    const hdrH  = 22;
    const rowH  = 17;

    const colDefs = [
      { key: "sr",       label: "Sr.",           w: 28  },
      { key: "course",   label: "Course Title",  w: 185 },
      { key: "assign",   label: "Assign-\nments", w: 52 },
      { key: "ta1",      label: "TA1/\nJA1",     w: 42  },
      { key: "ta2",      label: "TA2/\nJA2",     w: 42  },
      { key: "openA",    label: "Open\nAssessmt", w: 52  },
      { key: "repeatTA", label: "Repeat\nTA",     w: 44  },
      { key: "remedial", label: "Remedial\nTask", w: 50  },
      { key: "sign",     label: "Teacher\nSign",  w: 60  },
    ];

    // Build X positions
    let cx = M;
    colDefs.forEach((c) => { c.x = cx; cx += c.w; });

    // Header row
    doc.rect(M, tblY, innerW, hdrH).fill("#1e3a5f");
    doc.fillColor("#fff").fontSize(7).font("Helvetica-Bold");
    colDefs.forEach((c) => {
      doc.text(c.label, c.x + 2, tblY + 3, { width: c.w - 4, align: "center", lineGap: 0 });
    });

    // Data rows
    approvals.forEach((row, idx) => {
      const y  = tblY + hdrH + idx * rowH;
      const bg = idx % 2 === 0 ? "#f0f4ff" : "#ffffff";
      doc.rect(M, y, innerW, rowH).fill(bg);

      // Draw col borders
      colDefs.forEach((c) => {
        doc.rect(c.x, y, c.w, rowH).strokeColor("#ddd").lineWidth(0.3).stroke();
      });

      const checklist = Array.isArray(row.checklist) ? row.checklist : [];
      const getStatus = (type) => {
        const hit = checklist.find(
          (c) => c.item_type === type || c.item_name?.toLowerCase().includes(type.toLowerCase())
        );
        return hit?.status === "completed" ? "✓" : hit?.status === "waived" ? "W" : "—";
      };

      const vals = {
        sr:       String(idx + 1),
        course:   row.subject_name || "—",
        assign:   getStatus("Assignment"),
        ta1:      getStatus("TA1"),
        ta2:      getStatus("TA2"),
        openA:    getStatus("Open Assessment"),
        repeatTA: getStatus("Repeat TA"),
        remedial: getStatus("Remedial Task"),
        sign:     row.status === "approved" ? (row.teacher_name?.split(" ")[0] || "✓") : "—",
      };

      doc.fillColor("#222").fontSize(7).font("Helvetica");
      colDefs.forEach((c) => {
        doc.text(vals[c.key], c.x + 2, y + 4, {
          width: c.w - 4,
          align: c.key === "course" ? "left" : "center",
          lineBreak: false,
        });
      });
    });

    // ── Footer ───────────────────────────────────────────────────────────
    const ftrY = tblY + hdrH + approvals.length * rowH + 10;

    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor("#555")
       .text(
         "This is to certify that the above student has satisfactorily completed all theory and practical work for the subjects mentioned.",
         M, ftrY, { width: innerW }
       );

    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333")
       .text(`Fee Cleared: ${cert.fee_cleared ? "Yes" : "No"}`, M, ftrY + 14)
       .text(`MIT ADTU Student Satisfaction Survey: ${cert.survey_completed ? "Completed" : "Pending"}`, M + 220, ftrY + 14);

    // Signature boxes
    const sigY  = ftrY + 30;
    const sigW  = 118;
    const sigH  = 36;
    const sigGap = Math.floor((innerW - 4 * sigW) / 3);
    const sigs  = ["Student", "Mentor", "AMC Member", "Class Teacher"];

    sigs.forEach((label, i) => {
      const sx = M + i * (sigW + sigGap);
      doc.rect(sx, sigY, sigW, sigH).strokeColor("#888").lineWidth(0.5).stroke();
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#555")
         .text("Name & Sign of", sx, sigY + sigH - 13, { width: sigW, align: "center" })
         .text(label,            sx, sigY + sigH - 5,  { width: sigW, align: "center" });
    });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error",  reject);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// PART 2E — Analytics
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/analytics/term-grant
 */
const getTermGrantAnalytics = async (req, res, next) => {
  try {
    const { rows: [totals] } = await db.query(
      `SELECT
         COUNT(DISTINCT tgc.student_id)                                                        AS total_students,
         COUNT(DISTINCT CASE WHEN tgc.overall_status = 'approved' THEN tgc.student_id END)     AS fully_approved,
         COUNT(DISTINCT CASE WHEN tgc.overall_status = 'pending'  THEN tgc.student_id END)     AS pending,
         COUNT(DISTINCT CASE WHEN tgc.overall_status = 'rejected' THEN tgc.student_id END)     AS rejected
       FROM term_grant_certificates tgc`
    );

    const { rows: subjectWise } = await db.query(
      `SELECT
         s.name         AS subject_name,
         s.subject_code,
         COUNT(*) FILTER (WHERE sa.status = 'approved') AS approved,
         COUNT(*) FILTER (WHERE sa.status = 'pending')  AS pending,
         COUNT(*) FILTER (WHERE sa.status = 'rejected') AS rejected
       FROM subject_approvals sa
       JOIN subjects s ON s.id = sa.subject_id
       WHERE s.is_tgc = TRUE
       GROUP BY s.id, s.name, s.subject_code
       ORDER BY s.tgc_semester, s.subject_type, s.name`
    );

    return res.json({
      total_students: Number(totals.total_students),
      fully_approved: Number(totals.fully_approved),
      pending:        Number(totals.pending),
      rejected:       Number(totals.rejected),
      subject_wise:   subjectWise.map((r) => ({
        subject_name: r.subject_name,
        subject_code: r.subject_code,
        approved:     Number(r.approved),
        pending:      Number(r.pending),
        rejected:     Number(r.rejected),
      })),
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/tgc/students — Admin: all students with cert status.
 */
const getAllStudentsWithCertStatus = async (req, res, next) => {
  try {
    const { status, division, search } = req.query;
    const conds  = ["u.role = 'student'"];
    const params = [];

    if (status) {
      conds.push(`tgc.overall_status = $${params.length + 1}`);
      params.push(status);
    }
    if (division) {
      conds.push(`u.division = $${params.length + 1}`);
      params.push(division);
    }
    if (search) {
      const n = params.length;
      conds.push(`(u.name ILIKE $${n + 1} OR u.roll_number ILIKE $${n + 2})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const { rows: students } = await db.query(
      `SELECT
         u.id, u.name, u.email, u.roll_number, u.division, u.enrollment_no,
         tgc.id             AS cert_id,
         tgc.overall_status,
         tgc.semester,
         tgc.academic_year,
         tgc.fee_cleared,
         tgc.survey_completed,
         COUNT(sa.id) FILTER (WHERE sa.status = 'approved') AS approved_subjects,
         COUNT(sa.id)                                        AS total_subjects
       FROM users u
       LEFT JOIN term_grant_certificates tgc ON tgc.student_id = u.id
       LEFT JOIN subject_approvals sa         ON sa.certificate_id = tgc.id
       WHERE ${conds.join(" AND ")}
       GROUP BY u.id, tgc.id
       ORDER BY u.roll_number`,
      params
    );

    return res.json({ students });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/tgc/my-subjects — Teacher: list assigned subjects.
 */
const getMyAssignedSubjects = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { rows: subjects } = await db.query(
      `SELECT
         s.id, s.subject_code, s.name,
         s.subject_type AS type,
         s.tgc_semester AS semester,
         s.tgc_year     AS year,
         s.academic_year,
         COUNT(ct.id)   AS checklist_count
       FROM subject_teacher_assignments sta
       JOIN subjects s ON s.id = sta.subject_id
       LEFT JOIN checklist_templates ct ON ct.subject_id = s.id
       WHERE sta.teacher_id = $1 AND s.is_tgc = TRUE
       GROUP BY s.id
       ORDER BY s.tgc_semester, s.subject_type, s.name`,
      [teacherId]
    );
    return res.json({ subjects });
  } catch (err) {
    return next(err);
  }
};

/**
 * PATCH /api/tgc/certificate/:certId/flags
 * Admin updates fee_cleared, survey_completed, mentor/amc/class_teacher signed flags.
 */
const updateCertificateFlags = async (req, res, next) => {
  try {
    const { certId } = req.params;
    const {
      fee_cleared, survey_completed,
      mentor_signed, amc_signed, class_teacher_signed,
    } = req.body;

    const { rows: [updated] } = await db.query(
      `UPDATE term_grant_certificates
       SET fee_cleared          = COALESCE($1, fee_cleared),
           survey_completed     = COALESCE($2, survey_completed),
           mentor_signed        = COALESCE($3, mentor_signed),
           amc_signed           = COALESCE($4, amc_signed),
           class_teacher_signed = COALESCE($5, class_teacher_signed)
       WHERE id = $6
       RETURNING *`,
      [
        fee_cleared ?? null,
        survey_completed ?? null,
        mentor_signed ?? null,
        amc_signed ?? null,
        class_teacher_signed ?? null,
        certId,
      ]
    );
    if (!updated) return res.status(404).json({ message: "Certificate not found" });
    return res.json({ message: "Flags updated", certificate: updated });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  // Subject management
  createTGCSubject,
  assignTeacher,
  removeTeacherAssignment,
  listTGCSubjects,
  getSubjectsBySemester,
  deleteTGCSubject,
  // Checklist
  createChecklistItem,
  getChecklistForSubject,
  updateChecklistItem,
  deleteChecklistItem,
  // Teacher approval
  getStudentsForSubject,
  updateChecklistProgress,
  upsertChecklistProgress,
  approveStudentSubject,
  // Certificate
  requestCertificate,
  getMyCertificateStatus,
  generateTGCPDF,
  updateCertificateFlags,
  // Analytics / admin
  getTermGrantAnalytics,
  getAllStudentsWithCertStatus,
  getMyAssignedSubjects,
};
