/**
 * routes/notificationRoutes.js
 */

const express = require("express");
const { verifyToken } = require("../middleware/authMiddleware");
const { validate, schemas } = require("../middleware/validate");
const {
  getNotifications,
  getUnreadCount,
  updatePreferences,
  markAllRead,
  markOneRead,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

router.get(   "/",             verifyToken, getNotifications);
router.get(   "/unread-count", verifyToken, getUnreadCount);
router.put(   "/preferences",  verifyToken, validate(schemas.updateNotificationPrefs), updatePreferences);
router.patch( "/read-all",     verifyToken, markAllRead);
router.patch( "/:id/read",     verifyToken, markOneRead);
router.delete("/:id",          verifyToken, deleteNotification);

module.exports = router;
