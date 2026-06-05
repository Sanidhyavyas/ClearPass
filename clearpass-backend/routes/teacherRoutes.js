const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { validateSemesterParams } = require("../middleware/semesterMiddleware");
const { validate, schemas }       = require("../middleware/validate");
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
router.post("/approve/:id",          validate(schemas.approveRequest),   approveRequest);
router.post("/reject/:id",           validate(schemas.rejectRequest),    rejectRequest);
router.post("/request-changes/:id",  validate(schemas.requestChanges),   requestChanges);
router.get("/stats",                 getStats);

// Semester assignment management
router.get("/semesters",  getSemesterAssignments);
router.put("/semesters",  authorizeRoles("admin", "super_admin"), setSemesterAssignments);

module.exports = router;
