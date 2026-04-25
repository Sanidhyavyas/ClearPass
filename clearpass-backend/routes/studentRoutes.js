const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { getClearanceStatus, getClearanceHistory, getClearanceModules, getProfile } = require("../controllers/studentController"); // ADDED: getProfile

const router = express.Router();

router.use(verifyToken, authorizeRoles("student"));

router.get("/profile",           getProfile);          // ADDED
router.get("/clearance/status",  getClearanceStatus);
router.get("/clearance/history", getClearanceHistory);
router.get("/clearance/modules", getClearanceModules);

module.exports = router;
