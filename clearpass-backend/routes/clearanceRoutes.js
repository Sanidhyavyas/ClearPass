const express = require("express");

const {
  assignTeacher,
  createClearanceRequest,
  getAllRequests,
  getAssignedRequests,
  getStudentRequests,
  getTeachers,
  updateFeeStatus,
  updateRequestStatus
} = require("../controllers/clearanceController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/request-clearance", verifyToken, authorizeRoles("student"), createClearanceRequest);
router.get("/my-requests", verifyToken, authorizeRoles("student"), getStudentRequests);
router.get("/assigned-requests", verifyToken, authorizeRoles("teacher"), getAssignedRequests);
router.put("/update-status/:id", verifyToken, authorizeRoles("teacher"), updateRequestStatus);
router.get("/all-requests", verifyToken, authorizeRoles("admin"), getAllRequests);
router.get("/teachers", verifyToken, authorizeRoles("admin"), getTeachers);
router.put("/assign-teacher/:id", verifyToken, authorizeRoles("admin"), assignTeacher);
router.patch("/:id/fee", verifyToken, authorizeRoles("admin"), updateFeeStatus);

module.exports = router;
