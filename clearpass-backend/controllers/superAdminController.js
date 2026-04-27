const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");
const { createAuditLog } = require("./auditController");

const buildSuperAdminAuthResponse = (superAdmin) => {
  const token = jwt.sign(
    {
      id: superAdmin.id,
      role: "super_admin",
      email: superAdmin.email,
      authSource: "super_admins"
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    message: "Authentication successful",
    token,
    user: {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: "super_admin"
    }
  };
};

const loginSuperAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await db.query(
      "SELECT id, name, email, password FROM super_admins WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const superAdmin = rows[0];
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    return res.json(buildSuperAdminAuthResponse(superAdmin));
  } catch (error) {
    return next(error);
  }
};

const getSuperAdminProfile = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, email FROM super_admins WHERE id = $1 LIMIT 1",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Super admin not found"
      });
    }

    return res.json({
      user: {
        ...rows[0],
        role: "super_admin"
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getSuperAdminOverview = async (req, res, next) => {
  try {
    const { rows: [userCounts] } = await db.query(
      `SELECT
          COUNT(*) AS totalUsers,
          COALESCE(SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END), 0) AS totalStudents,
          COALESCE(SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END), 0) AS totalTeachers,
          COALESCE(SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END), 0) AS totalAdmins
       FROM users`
    );

    const { rows: [superAdminCounts] } = await db.query(
      "SELECT COUNT(*) AS totalSuperAdmins FROM super_admins"
    );

    return res.json({
      stats: {
        ...userCounts[0],
        ...superAdminCounts[0]
      }
    });
  } catch (error) {
    return next(error);
  }
};

// ── PATCH /api/super-admin/users/:userId/approve-clearance ───────────────
const approveStudentClearance = async (req, res, next) => {
  try {
    const userId = Number(req.params.userId);

    // Verify the user is actually a student
    const { rows: userRows } = await db.query(
      "SELECT id, name, role, department, roll_number, semester, year FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ message: "User not found" });
    if (userRows[0].role !== "student") return res.status(400).json({ message: "User is not a student" });
    const student = userRows[0];

    // Find the most recent clearance request for this student (any status)
    const { rows } = await db.query(
      "SELECT id, status FROM clearance_requests WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    let requestId;

    if (rows.length === 0) {
      // No clearance request exists — create one and immediately approve it
      const { rows: [newReq] } = await db.query(
        `INSERT INTO clearance_requests
           (student_id, student_name, department, roll_number, semester, year,
            status, current_stage, approved_at, submitted_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6,
                 'approved', 'completed', NOW(), NOW(), NOW(), NOW())
         RETURNING id`,
        [
          userId,
          student.name || null,
          student.department || null,
          student.roll_number || null,
          student.semester || null,
          student.year || null,
        ]
      );
      requestId = newReq.id;
    } else if (rows[0].status === "approved") {
      return res.json({ message: "Student clearance is already approved" });
    } else {
      // Existing pending/rejected request — approve it
      requestId = rows[0].id;
      await db.query(
        `UPDATE clearance_requests
           SET status = 'approved', current_stage = 'completed',
               approved_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
    }

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name || "Super Admin",
      userRole:   "super_admin",
      action:     "approved",
      targetType: "clearance_request",
      targetId:   requestId,
      details:    `Clearance for student #${userId} (${student.name}) approved by Super Admin via user management`,
    });

    // ── Also mark the TGC certificate as fully approved (all subjects) ──
    const DEFAULT_SEM = 6;
    const DEFAULT_AY  = "2025-26";

    const { rows: [cert] } = await db.query(
      `INSERT INTO term_grant_certificates
         (student_id, semester, academic_year, overall_status)
       VALUES ($1, $2, $3, 'approved')
       ON CONFLICT (student_id, semester, academic_year)
         DO UPDATE SET overall_status = 'approved'
       RETURNING id`,
      [userId, DEFAULT_SEM, DEFAULT_AY]
    );

    const { rows: tgcSubjects } = await db.query(
      "SELECT id FROM subjects WHERE is_tgc = TRUE AND tgc_semester = $1 AND academic_year = $2",
      [DEFAULT_SEM, DEFAULT_AY]
    );

    for (const subj of tgcSubjects) {
      const { rows: teachers } = await db.query(
        "SELECT teacher_id FROM subject_teacher_assignments WHERE subject_id = $1 LIMIT 1",
        [subj.id]
      );
      const teacherId = teachers.length > 0 ? teachers[0].teacher_id : null;

      await db.query(
        `INSERT INTO subject_approvals
           (certificate_id, student_id, subject_id, teacher_id, status, approved_at)
         VALUES ($1, $2, $3, $4, 'approved', NOW())
         ON CONFLICT (certificate_id, subject_id)
           DO UPDATE SET status = 'approved', approved_at = NOW()`,
        [cert.id, userId, subj.id, teacherId]
      );
    }

    return res.json({ message: "Student clearance approved" });
  } catch (error) {
    return next(error);
  }
};

// ── GET /api/super-admin/clearance-requests ───────────────────────────────
const getClearanceRequests = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT cr.id, cr.status, cr.remarks, cr.rejection_reason, cr.department,
              cr.semester, cr.year, cr.roll_number, cr.student_name, cr.current_stage,
              cr.fee_status, cr.fee_remarks, cr.fee_approved_at,
              COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
              cr.approved_at, cr.updated_at,
              u.id    AS student_id,
              u.email AS student_email,
              t.name  AS assigned_teacher_name
       FROM clearance_requests cr
       JOIN  users u ON u.id = cr.student_id
       LEFT JOIN users t ON t.id = cr.teacher_id
       ORDER BY CASE cr.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
                COALESCE(cr.submitted_at, cr.created_at) DESC`
    );
    return res.json({ requests: rows });
  } catch (error) {
    return next(error);
  }
};

// ── PATCH /api/super-admin/clearance/:id/approve ─────────────────────────
const superAdminApproveClearance = async (req, res, next) => {
  try {
    const requestId           = Number(req.params.id);
    const { status, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }

    const { rows } = await db.query(
      "SELECT id, student_id FROM clearance_requests WHERE id = $1 LIMIT 1",
      [requestId]
    );
    if (!rows.length) return res.status(404).json({ message: "Clearance request not found" });

    if (status === "approved") {
      await db.query(
        `UPDATE clearance_requests
           SET status = 'approved', current_stage = 'completed',
               approved_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
    } else {
      await db.query(
        `UPDATE clearance_requests
           SET status = 'rejected', rejection_reason = $1,
               rejected_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [remarks || null, requestId]
      );
    }

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name || "Super Admin",
      userRole:   "super_admin",
      action:     status,
      targetType: "clearance_request",
      targetId:   requestId,
      details:    `Clearance request #${requestId} ${status} by Super Admin${remarks ? `. Remarks: ${remarks}` : ""}`,
    });

    return res.json({ message: `Clearance request ${status} by super admin` });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  approveStudentClearance,
  getClearanceRequests,
  getSuperAdminOverview,
  getSuperAdminProfile,
  loginSuperAdmin,
  superAdminApproveClearance,
};
