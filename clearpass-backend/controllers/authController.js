const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");

const VALID_ROLES = ["student", "teacher", "admin"];

const buildAuthResponse = (user, authSource = "users") => {
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      authSource,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const userData = {
    id:         user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    department: user.department || null,
  };

  // Include academic placement for students
  if (user.role === "student") {
    userData.year     = user.year     != null ? Number(user.year)     : null;
    userData.semester = user.semester != null ? Number(user.semester) : null;
  }

  return {
    message: "Authentication successful",
    token,
    user: userData,
  };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    // Public registration is restricted to students only.
    const role = "student";

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows: existingUsers } = await db.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const { year, semester } = req.body;

    // Students must have a valid year (1-4) and semester (1-8).
    // Default to legacy values so existing integrations keep working.
    const studentYear     = year     != null ? parseInt(year,     10) : 3;
    const studentSemester = semester != null ? parseInt(semester, 10) : 6;

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows: inserted } = await db.query(
      `INSERT INTO users (name, email, password, role, year, semester)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, year, semester`,
      [name.trim(), normalizedEmail, hashedPassword, role, studentYear, studentSemester]
    );

    return res.status(201).json(buildAuthResponse(inserted[0]));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows: users } = await db.query(
      "SELECT id, name, email, password, role, department, year, semester FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const { rows: users } = await db.query(
      "SELECT id, name, email, role, department, year, semester FROM users WHERE id = $1 LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ user: users[0] });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    await db.query("UPDATE users SET name = $1 WHERE id = $2", [
      name.trim(),
      req.user.id,
    ]);

    const { rows: users } = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1",
      [req.user.id]
    );

    return res.json({ message: "Profile updated successfully", user: users[0] });
  } catch (error) {
    return next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const { rows: users } = await db.query(
      `SELECT id, name, email, role, department
       FROM users
       ORDER BY CASE role
         WHEN 'admin'   THEN 0
         WHEN 'teacher' THEN 1
         WHEN 'student' THEN 2
         ELSE 3
       END, name ASC`
    );
    return res.json({ users });
  } catch (error) {
    return next(error);
  }
};

const getStudents = async (req, res, next) => {
  try {
    const { rows: students } = await db.query(
      `SELECT u.id, u.name, u.email, s.student_code, s.tgc
       FROM users u
       JOIN students s ON s.user_id = u.id
       WHERE u.role = 'student'
       ORDER BY u.name ASC`
    );
    return res.json({ students });
  } catch (error) {
    return next(error);
  }
};

const getTeachers = async (req, res, next) => {
  try {
    const { rows: teachers } = await db.query(
      `SELECT u.id, u.name, u.email, t.department_id, u.department
       FROM users u
       LEFT JOIN teachers t ON t.user_id = u.id
       WHERE u.role = 'teacher'
       ORDER BY u.name ASC`
    );
    return res.json({ teachers });
  } catch (error) {
    return next(error);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    const { rows: admins } = await db.query(
      `SELECT id, name, email, role
       FROM users
       WHERE role IN ('admin', 'super_admin')
       ORDER BY name ASC`
    );
    return res.json({ admins });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  let connection;
  try {
    const { name, email, password, role, department = null, year, semester } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, password, and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Resolve year/semester for students (default to legacy 3/6)
    const studentYear     = role === "student" ? (year     != null ? parseInt(year,     10) : 3) : null;
    const studentSemester = role === "student" ? (semester != null ? parseInt(semester, 10) : 6) : null;

    connection = await db.connect();
    await connection.query("BEGIN");

    const { rows: existingUsers } = await connection.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.query("ROLLBACK");
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows: inserted } = await connection.query(
      `INSERT INTO users (name, email, password, role, department, year, semester)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        name.trim(),
        normalizedEmail,
        hashedPassword,
        role,
        department ? department.trim() : null,
        studentYear,
        studentSemester,
      ]
    );

    const userId = inserted[0].id;
    let student_code = null;

    if (role === "student") {
      let unique = false;
      while (!unique) {
        student_code = "STU" + String(Math.floor(10000 + Math.random() * 90000));
        const { rows: existing } = await connection.query(
          "SELECT id FROM students WHERE student_code = $1 LIMIT 1",
          [student_code]
        );
        if (existing.length === 0) unique = true;
      }
      await connection.query(
        "INSERT INTO students (user_id, student_code, tgc) VALUES ($1, $2, 0)",
        [userId, student_code]
      );

      // Auto-create TGC certificate + subject_approvals + checklist_progress
      // so the student appears in every teacher's TGC dashboard immediately.
      const DEFAULT_SEMESTER   = 6;
      const DEFAULT_ACAD_YEAR  = "2025-26";

      const { rows: [certificate] } = await connection.query(
        `INSERT INTO term_grant_certificates (student_id, semester, academic_year)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, semester, academic_year)
           DO UPDATE SET created_at = term_grant_certificates.created_at
         RETURNING *`,
        [userId, DEFAULT_SEMESTER, DEFAULT_ACAD_YEAR]
      );

      const { rows: tgcSubjects } = await connection.query(
        "SELECT id FROM subjects WHERE is_tgc = TRUE AND tgc_semester = $1 AND academic_year = $2",
        [DEFAULT_SEMESTER, DEFAULT_ACAD_YEAR]
      );

      for (const subject of tgcSubjects) {
        const { rows: teachers } = await connection.query(
          "SELECT teacher_id FROM subject_teacher_assignments WHERE subject_id = $1 LIMIT 1",
          [subject.id]
        );
        const teacherId = teachers.length > 0 ? teachers[0].teacher_id : null;

        await connection.query(
          `INSERT INTO subject_approvals (certificate_id, student_id, subject_id, teacher_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (certificate_id, subject_id) DO NOTHING`,
          [certificate.id, userId, subject.id, teacherId]
        );

        const { rows: checklistItems } = await connection.query(
          "SELECT id FROM checklist_templates WHERE subject_id = $1",
          [subject.id]
        );
        for (const item of checklistItems) {
          await connection.query(
            `INSERT INTO student_checklist_progress (student_id, checklist_item_id, subject_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (student_id, checklist_item_id) DO NOTHING`,
            [userId, item.id, subject.id]
          );
        }
      }
    } else if (role === "teacher") {
      await connection.query(
        "INSERT INTO teachers (user_id, department_id) VALUES ($1, NULL)",
        [userId]
      );
      // Seed the teacher into legacy year=3/semester=6 by default
      await connection.query(
        `INSERT INTO teacher_semesters (teacher_id, year, semester)
         VALUES ($1, 3, 6) ON CONFLICT (teacher_id, year, semester) DO NOTHING`,
        [userId]
      );
    }

    await connection.query("COMMIT");

    const successMsg =
      role === "student"
        ? `User created successfully. Student ID: ${student_code}`
        : "User created successfully";

    return res.status(201).json({
      message: successMsg,
      userId,
      ...(student_code ? { student_code } : {}),
    });
  } catch (error) {
    if (connection) await connection.query("ROLLBACK");
    return next(error);
  } finally {
    if (connection) connection.release();
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { name, email, password, role, department = null } = req.body;

    if (!name || !email || !role) {
      return res
        .status(400)
        .json({ message: "Name, email, and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows: existingUsers } = await db.query(
      "SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1",
      [normalizedEmail, userId]
    );

    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ message: "Another user already uses this email" });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE users SET name = $1, email = $2, password = $3, role = $4, department = $5 WHERE id = $6`,
        [
          name.trim(),
          normalizedEmail,
          hashedPassword,
          role,
          department ? department.trim() : null,
          userId,
        ]
      );
    } else {
      await db.query(
        `UPDATE users SET name = $1, email = $2, role = $3, department = $4 WHERE id = $5`,
        [
          name.trim(),
          normalizedEmail,
          role,
          department ? department.trim() : null,
          userId,
        ]
      );
    }

    const { rows: users } = await db.query(
      "SELECT id, name, email, role, department FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User updated successfully", user: users[0] });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  let connection;
  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({ message: "Valid user id is required" });
    }

    connection = await db.connect();
    await connection.query("BEGIN");

    const { rows: users } = await connection.query(
      "SELECT id, role, email FROM users WHERE id = $1 LIMIT 1",
      [userId]
    );

    if (users.length === 0) {
      await connection.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    await connection.query(
      "DELETE FROM approvals WHERE student_id = $1 OR teacher_id = $1",
      [userId]
    );
    await connection.query(
      "DELETE FROM enrollments WHERE student_id = $1",
      [userId]
    );
    await connection.query(
      "DELETE FROM grants WHERE student_id = $1 OR teacher_id = $1",
      [userId]
    );
    await connection.query("DELETE FROM qr_tokens WHERE student_id = $1", [
      userId,
    ]);
    await connection.query(
      "DELETE FROM student_subjects WHERE student_id = $1",
      [userId]
    );
    await connection.query("DELETE FROM users WHERE id = $1", [userId]);

    await connection.query("COMMIT");

    return res.json({ message: "User deleted successfully" });
  } catch (error) {
    if (connection) await connection.query("ROLLBACK");
    return next(error);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  createUser,
  deleteUser,
  getAllUsers,
  getStudents,
  getTeachers,
  getAdmins,
  getCurrentUser,
  login,
  register,
  updateProfile,
  updateUser,
};
