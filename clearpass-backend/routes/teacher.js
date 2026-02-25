const express = require("express");
const router = express.Router();
const db = require("../db");

// Get all students
router.get("/students", async (req, res) => {
  try {
    const [students] = await db.promise().query(`
      SELECT id, name, email, department, clearance_status
      FROM users
      WHERE role = 'student'
    `);

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve or Reject clearance
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const studentId = req.params.id;

    await db.promise().query(
      "UPDATE users SET clearance_status = ? WHERE id = ?",
      [status, studentId]
    );

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;