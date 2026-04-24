const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const {
  getAssignments,
  setAssignment,
  getStaff,
} = require("../controllers/moduleAssignmentController");

const router = express.Router();

router.use(verifyToken, authorizeRoles("admin", "super_admin"));

router.get("/assignments",              getAssignments);
router.put("/assignments/:moduleName",  setAssignment);
router.get("/staff",                    getStaff);

module.exports = router;
