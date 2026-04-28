// assignmentRoutes.js
const router = require("express").Router();
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const {
  createAssignment,
  getTeacherAssignments,
  getAssignmentSubmissions,
  reviewSubmission,
  getStudentAssignments,
  submitAssignment,
  deleteSubmission,
  getNotifications,
  markNotificationsRead,
} = require("../controllers/assignmentController");

// ── Shared (any authenticated user) ──────────────────────────────────────
router.get(
  "/notifications",
  verifyToken,
  getNotifications
);
router.patch(
  "/notifications/read",
  verifyToken,
  markNotificationsRead
);

// ── Teacher routes ────────────────────────────────────────────────────────
router.post(
  "/",
  verifyToken,
  authorizeRoles("teacher", "admin", "super_admin"),
  createAssignment
);
router.get(
  "/my-assignments",
  verifyToken,
  authorizeRoles("teacher", "admin", "super_admin"),
  getTeacherAssignments
);
router.get(
  "/:assignmentId/submissions",
  verifyToken,
  authorizeRoles("teacher", "admin", "super_admin"),
  getAssignmentSubmissions
);
router.patch(
  "/submissions/:submissionId/review",
  verifyToken,
  authorizeRoles("teacher", "admin", "super_admin"),
  reviewSubmission
);

// ── Student routes ────────────────────────────────────────────────────────
router.get(
  "/student/all",
  verifyToken,
  authorizeRoles("student"),
  getStudentAssignments
);
router.post(
  "/:id/submit",
  verifyToken,
  authorizeRoles("student"),
  upload.single("file"),
  submitAssignment
);
router.delete(
  "/submissions/:submissionId",
  verifyToken,
  authorizeRoles("student"),
  deleteSubmission
);

module.exports = router;
