const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { getAnalyticsOverview } = require("../controllers/analyticsController");

const router = express.Router();

router.get(
  "/overview",
  verifyToken,
  authorizeRoles("admin", "super_admin"),
  getAnalyticsOverview
);

module.exports = router;
