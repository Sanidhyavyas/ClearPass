const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const {
  getRequests,
  getRequestById,
  approveRequest,
  rejectRequest,
  requestChanges,
  getStats,
} = require("../controllers/teacherController");

const router = express.Router();

// All routes require authentication + teacher/admin/super_admin role
router.use(verifyToken, authorizeRoles("teacher", "admin", "super_admin"));

router.get("/requests",              getRequests);
router.get("/requests/:id",          getRequestById);
router.post("/approve/:id",          approveRequest);
router.post("/reject/:id",           rejectRequest);
router.post("/request-changes/:id",  requestChanges);
router.get("/stats",                 getStats);

module.exports = router;
