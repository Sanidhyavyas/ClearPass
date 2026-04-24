const express = require("express");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const {
  getPendingFinal,
  finalizeRequest,
  getCertificate,
  verifyToken: verifyQRToken,
} = require("../controllers/certificateController");

const router = express.Router();

// Admin/super_admin: queue + finalize
router.get(
  "/clearance/pending-final",
  verifyToken,
  authorizeRoles("admin", "super_admin"),
  getPendingFinal
);

router.patch(
  "/clearance/:id/finalize",
  verifyToken,
  authorizeRoles("admin", "super_admin"),
  finalizeRequest
);

// Authenticated: download certificate (student gets own, admin gets any)
router.get(
  "/clearance/:id/certificate",
  verifyToken,
  getCertificate
);

// Public: QR code verification — no auth required
router.get("/verify/:token", verifyQRToken);

module.exports = router;
