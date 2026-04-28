const express = require("express");

const { getAuditLogs } = require("../controllers/auditController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", verifyToken, authorizeRoles("admin"), getAuditLogs);

module.exports = router;
