const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validate");
const { getClearanceStatus, getClearanceHistory, getClearanceModules, getProfile, updateAcademicInfo } = require("../controllers/studentController");

const router = express.Router();

router.use(verifyToken, authorizeRoles("student"));

router.get("/profile",             getProfile);
router.put("/academic-info",       validate(schemas.updateAcademicInfo), updateAcademicInfo);
router.get("/clearance/status",    getClearanceStatus);
router.get("/clearance/history",   getClearanceHistory);
router.get("/clearance/modules",   getClearanceModules);

module.exports = router;
