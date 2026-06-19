const express = require("express");
const router = express.Router();
const db = require("../db");
const logger = require("../utils/logger");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/overview", verifyToken, authorizeRoles("admin", "super_admin"), async (req, res, next) => {
  try {
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
    return next(error);
  }
});

router.get("/students", verifyToken, authorizeRoles("admin", "super_admin"), async (req, res, next) => {
  try {
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
    return next(error);
  }
});

// FIXED: removed clearance_status update — status lives in clearance_requests
router.put("/students/:id/status", async (req, res) => {
  res.status(410).json({
    message: "This endpoint is deprecated. Clearance status is managed via clearance_requests."
  });
});

module.exports = router;
