const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/overview", async (req, res) => {
  try {
    const [counts] = await db.promise().query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(role = 'student') AS totalStudents,
        SUM(role = 'teacher') AS totalTeachers,
        SUM(role = 'admin') AS totalAdmins,
        SUM(clearance_status = 'Approved') AS approved,
        SUM(clearance_status = 'Pending') AS pending,
        SUM(clearance_status = 'Rejected') AS rejected
      FROM users
    `);

    res.json(counts[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/students", async (req, res) => {
  try {
    const [students] = await db.promise().query(`
      SELECT id, name, email, department, clearance_status
      FROM users
      WHERE role = 'student'
      ORDER BY name ASC
    `);

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/students/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const studentId = req.params.id;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    await db.promise().query(
      "UPDATE users SET clearance_status = ? WHERE id = ? AND role = 'student'",
      [status, studentId]
    );

    res.json({ message: "Student clearance status updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
