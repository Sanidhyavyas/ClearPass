require("dotenv").config();

const cors = require("cors");
const express = require("express");

// ── Logging ──────────────────────────────────────────────────────────────
const logger        = require("./utils/logger");
const requestLogger = require("./middleware/requestLogger");
const logRoutes     = require("./routes/logRoutes");

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
// ADDED: TGC routes
const tgcSubjectRoutes        = require("./routes/tgcSubjectRoutes");
const checklistRoutes         = require("./routes/checklistRoutes");
const tgcCertRoutes           = require("./routes/tgcCertRoutes");
const assignmentRoutes        = require("./routes/assignmentRoutes");
// Smart platform additions
const notificationRoutes      = require("./routes/notificationRoutes");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || true,
    credentials: true
  })
);
app.use(express.json());

// ── Rate limiting ────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// ── Request / Response logger (must come after express.json) ────────────
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    message: "ClearPass backend is running"
  });
});

// ── Frontend log intake ──────────────────────────────────────────────────
app.use("/api/logs", logRoutes);

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
// ADDED: TGC — Term Grant Certificate routes
app.use("/api/subjects",     tgcSubjectRoutes);    // TGC subject management
app.use("/api/checklist",    checklistRoutes);     // Checklist builder + progress
app.use("/api/certificate",  tgcCertRoutes);       // TGC certificate request/download
app.use("/api/assignments",  assignmentRoutes);    // Assignment system
// Smart platform additions
app.use("/api/notifications", notificationRoutes); // Notification system

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found"
  });
});

// ── Centralized error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error("Unhandled error", {
    requestId: req.requestId || null,
    userId:    req.user?.id  || null,
    route:     req.originalUrl,
    method:    req.method,
    message:   err.message,
    stack:     err.stack,
  });

  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error"
  });
});

// On Vercel the module is imported as a serverless function; only listen locally
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || "development" });
  });
}

module.exports = app;
