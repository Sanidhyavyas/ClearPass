const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/overview", async (req, res) => {
  try {
    // FIXED: removed clearance_status from users query (column doesn't exist)
    const { rows: [counts] } = await db.query(`
      SELECT
        COUNT(*) AS totalUsers,
        COALESCE(SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END), 0) AS totalStudents,
        COALESCE(SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END), 0) AS totalTeachers,
        COALESCE(SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END), 0) AS totalAdmins
      FROM users
    `);

    const { rows: [reqCounts] } = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejected
      FROM clearance_requests
    `);

    res.json({ ...counts, ...reqCounts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/students", async (req, res) => {
  try {
    // FIXED: removed clearance_status; join students table for student_code
    const { rows: students } = await db.query(`
      SELECT u.id, u.name, u.email, u.department,
             s.student_code, s.tgc
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      WHERE u.role = 'student'
      ORDER BY u.name ASC
    `);

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// FIXED: removed clearance_status update — status lives in clearance_requests
router.put("/students/:id/status", async (req, res) => {
  res.status(410).json({
    message: "This endpoint is deprecated. Clearance status is managed via clearance_requests."
  });
});

module.exports = router;
