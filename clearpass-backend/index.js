// ===============================
// CLEARPASS BACKEND - INDEX.JS
// ===============================
require("dotenv").config();
const teacherRoutes = require("./routes/teacher");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/teacher", teacherRoutes);

const PORT = process.env.PORT || 5000;   // ✅ ONLY ONCE

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* =========================
   ROOT ROUTE
========================= */
app.get("/", (req, res) => {
  res.send("🚀 ClearPass Backend Running");
});

/* =========================
   REGISTER USER
========================= */
app.post("/register", async (req, res) => {
  try {
    console.log("Incoming Register Data:", req.body);

    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if email already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {

      if (err) {
        console.log("SELECT Error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      db.query(
        "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, role],
        (err, result) => {

          if (err) {
            console.log("INSERT Error:", err);
            return res.status(500).json({ message: err.message });
          }

          return res.status(201).json({
            message: "User Registered Successfully"
          });
        }
      );
    });

  } catch (error) {
    console.log("Server Error:", error);
    return res.status(500).json({ message: error.message });
  }
});

/* =========================
   LOGIN USER
========================= */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

    if (err) {
      console.log("Login SELECT Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid Email" });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login Successful",
      token,
      role: user.role,
      name: user.name
    });
  });
});

/* =========================
   START SERVER
========================= */

app.get("/student/dashboard/:id", (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT s.subject_name, a.status
    FROM approvals a
    JOIN subjects s ON a.subject_id = s.id
    WHERE a.student_id = ?
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Database error" });
    }

    res.json(results);
  });
});

app.get("/student/progress/:id", (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(status = 'approved') AS approved
    FROM approvals
    WHERE student_id = ?
  `;

  db.query(query, [studentId], (err, result) => {
    if (err) return res.status(500).json({ message: "Database error" });

    const total = result[0].total;
    const approved = result[0].approved;

    const percentage = total > 0 ? (approved / total) * 100 : 0;

    res.json({ percentage });
  });
});

app.get("/teacher/pending/:id", (req, res) => {
  const teacherId = req.params.id;

  const query = `
    SELECT a.id, u.name AS student_name, s.subject_name, a.status
    FROM approvals a
    JOIN users u ON a.student_id = u.id
    JOIN subjects s ON a.subject_id = s.id
    WHERE a.teacher_id = ?
    AND a.status = 'pending'
  `;

  db.query(query, [teacherId], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });

    res.json(results);
  });
});

app.put("/teacher/update/:approvalId", (req, res) => {
  const approvalId = req.params.approvalId;
  const { status } = req.body;

  const query = `
    UPDATE approvals
    SET status = ?, approved_at = NOW()
    WHERE id = ?
  `;

  db.query(query, [status, approvalId], (err, result) => {
    if (err) return res.status(500).json({ message: "Update failed" });

    res.json({ message: "Status updated successfully" });
  });
});

app.get("/student/full-dashboard/:id", (req, res) => {
  const studentId = req.params.id;

  const query = `
    SELECT 
      s.subject_name,
      a.status,
      t.name AS teacher_name
    FROM approvals a
    JOIN subjects s ON a.subject_id = s.id
    JOIN users t ON a.teacher_id = t.id
    WHERE a.student_id = ?
  `;

  db.query(query, [studentId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Database error" });
    }

    const total = results.length;
    const approved = results.filter(r => r.status === "approved").length;
    const percentage = total > 0 ? (approved / total) * 100 : 0;

    res.json({
      subjects: results,
      percentage
    });
  });
});