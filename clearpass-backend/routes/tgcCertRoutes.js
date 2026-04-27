// ADDED: routes/tgcCertRoutes.js — Term Grant Certificate endpoints
const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const {
  requestCertificate,
  getMyCertificateStatus,
  generateTGCPDF,
  updateCertificateFlags,
  getAllStudentsWithCertStatus,
  getMyAssignedSubjects,
  approveStudentSubject,
  getTermGrantAnalytics,
} = require("../controllers/tgcController");

const router = express.Router();
router.use(verifyToken);

// Student endpoints
router.post(
  "/request",
  authorizeRoles("student"),
  requestCertificate
);

router.get(
  "/my-status",
  authorizeRoles("student"),
  getMyCertificateStatus
);

// Admin endpoints
router.get(
  "/all-students",
  authorizeRoles("admin", "super_admin"),
  getAllStudentsWithCertStatus
);

router.patch(
  "/:certId/flags",
  authorizeRoles("admin", "super_admin"),
  updateCertificateFlags
);

// Teacher: my assigned subjects
router.get(
  "/my-subjects",
  authorizeRoles("teacher", "admin", "super_admin"),
  getMyAssignedSubjects
);

// Teacher: approve student for a subject (also accessible here)
router.post(
  "/subjects/:subjectId/approve/:studentId",
  authorizeRoles("teacher", "admin", "super_admin"),
  approveStudentSubject
);

// PDF download — students get own, admin gets any
router.get("/:studentId/download", generateTGCPDF);

module.exports = router;
