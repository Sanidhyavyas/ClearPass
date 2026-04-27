// ADDED: routes/checklistRoutes.js — Checklist builder + student progress endpoints
const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createChecklistItem,
  getChecklistForSubject,
  updateChecklistItem,
  deleteChecklistItem,
  getStudentsForSubject,
  updateChecklistProgress,
  upsertChecklistProgress,
  approveStudentSubject,
} = require("../controllers/tgcController");

const router = express.Router();
router.use(verifyToken);

// Checklist CRUD
router.post(
  "/create",
  authorizeRoles("teacher", "admin", "super_admin"),
  createChecklistItem
);

router.get("/subject/:subjectId", getChecklistForSubject);

router.put(
  "/:itemId",
  authorizeRoles("teacher", "admin", "super_admin"),
  updateChecklistItem
);

router.delete(
  "/:itemId",
  authorizeRoles("teacher", "admin", "super_admin"),
  deleteChecklistItem
);

// Student progress — POST before PATCH to avoid route collision on /progress/upsert
router.post(
  "/progress/upsert",
  authorizeRoles("teacher", "admin", "super_admin"),
  upsertChecklistProgress
);

router.patch(
  "/progress/:progressId",
  authorizeRoles("teacher", "admin", "super_admin"),
  updateChecklistProgress
);

// Teacher views student list for a subject
router.get(
  "/students/:subjectId",
  authorizeRoles("teacher", "admin", "super_admin"),
  getStudentsForSubject
);

module.exports = router;
