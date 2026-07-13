// ADDED: routes/tgcSubjectRoutes.js — TGC subject management endpoints
const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createTGCSubject,
  assignTeacher,
  removeTeacherAssignment,
  listTGCSubjects,
  getSubjectsBySemester,
  deleteTGCSubject,
  backfillStudentTGC,
} = require("../controllers/tgcController");

const router = express.Router();
router.use(verifyToken);

// NOTE: specific paths before parameterized paths
router.get("/semester/:sem", authorizeRoles("student", "teacher", "admin", "super_admin"), listTGCSubjects);
router.get("/", authorizeRoles("student", "teacher", "admin", "super_admin"), listTGCSubjects);

router.post(
  "/create",
  authorizeRoles("admin", "super_admin"),
  createTGCSubject
);

router.post(
  "/backfill-tgc",
  authorizeRoles("admin", "super_admin"),
  backfillStudentTGC
);

router.post(
  "/:subjectId/assign-teacher",
  authorizeRoles("admin", "super_admin"),
  assignTeacher
);

router.delete(
  "/:subjectId/assign-teacher/:teacherId",
  authorizeRoles("admin", "super_admin"),
  removeTeacherAssignment
);

router.delete(
  "/:id",
  authorizeRoles("super_admin"),
  deleteTGCSubject
);

// ADDED: Teacher final approval for a student's subject
const { approveStudentSubject } = require("../controllers/tgcController");
router.post(
  "/:subjectId/approve/:studentId",
  authorizeRoles("teacher", "admin", "super_admin"),
  approveStudentSubject
);

module.exports = router;
