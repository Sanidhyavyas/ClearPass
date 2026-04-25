require("dotenv").config();

const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const auditRoutes = require("./routes/auditRoutes");
const clearanceRoutes = require("./routes/clearanceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const subjectRoutes    = require("./routes/subjectRoutes");
const teacherRoutes    = require("./routes/teacherRoutes");
const studentRoutes    = require("./routes/studentRoutes");
const uploadRoutes            = require("./routes/uploadRoutes");
const analyticsRoutes         = require("./routes/analyticsRoutes");
const certificateRoutes       = require("./routes/certificateRoutes");
const moduleAssignmentRoutes  = require("./routes/moduleAssignmentRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ClearPass backend is running"
  });
});

app.use("/", authRoutes);
app.use("/", clearanceRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/super-admin", superAdminRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/clearance", clearanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/admin/subjects", subjectRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/upload",  uploadRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api",           certificateRoutes);   // /api/clearance/:id/finalize, /api/verify/:token
app.use("/api/modules",   moduleAssignmentRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
});

// On Vercel the module is imported as a serverless function; only listen locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
