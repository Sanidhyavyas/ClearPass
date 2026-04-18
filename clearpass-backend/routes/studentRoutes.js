const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { getClearanceStatus, getClearanceHistory, getClearanceModules } = require("../controllers/studentController");

const router = express.Router();

router.use(verifyToken, authorizeRoles("student"));

router.get("/clearance/status",  getClearanceStatus);
router.get("/clearance/history", getClearanceHistory);
router.get("/clearance/modules", getClearanceModules);

module.exports = router;
