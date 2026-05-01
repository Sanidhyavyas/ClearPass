const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { validateSemesterParams } = require("../middleware/semesterMiddleware");
const {
  getRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  requestChanges,
  getStats,
  getSemesterAssignments,
  setSemesterAssignments,
} = require("../controllers/teacherController");

const router = express.Router();

// All routes require authentication + teacher/admin/super_admin role
router.use(verifyToken, authorizeRoles("teacher", "admin", "super_admin"));

router.get("/requests",              validateSemesterParams, getRequests);
router.get("/requests/:id",          getRequestById);
router.post("/approve/:id",          approveRequest);
router.post("/reject/:id",           rejectRequest);
router.post("/request-changes/:id",  requestChanges);
router.get("/stats",                 getStats);

// Semester assignment management
router.get("/semesters",  getSemesterAssignments);
router.put("/semesters",  authorizeRoles("admin", "super_admin"), setSemesterAssignments);

module.exports = router;
