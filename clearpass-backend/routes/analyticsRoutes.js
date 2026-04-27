const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { getAnalyticsOverview } = require("../controllers/analyticsController");
// ADDED: TGC analytics
const { getTermGrantAnalytics } = require("../controllers/tgcController");

const router = express.Router();

router.get(
  "/overview",
  verifyToken,
  authorizeRoles("admin", "super_admin"),
  getAnalyticsOverview
);

// ADDED: Term Grant Certificate analytics
router.get(
  "/term-grant",
  verifyToken,
  authorizeRoles("admin", "super_admin"),
  getTermGrantAnalytics
);

module.exports = router;
