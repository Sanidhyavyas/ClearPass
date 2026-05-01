/**
 * controllers/notificationController.js
 *
 * Notification system for ClearPass.
 * Supports in-app notifications stored in the `notifications` DB table.
 *
 * API:
 *   GET  /api/notifications          — get current user's notifications (paginated)
 *   PATCH /api/notifications/read-all — mark all as read
 *   PATCH /api/notifications/:id/read — mark one as read
 *   DELETE /api/notifications/:id     — delete one notification
 */

const db = require("../db");

// ── Send a notification to a user ──────────────────────────────────────────
/**
 * Creates a notification row for a user.
 * Non-fatal — errors are caught so the main request flow is never broken.
 *
 * @param {object} opts
 * @param {number}  opts.userId   — recipient user ID
 * @param {string}  opts.type     — e.g. 'clearance_approved', 'clearance_rejected', 'reminder', 'system'
 * @param {string}  opts.title    — short heading
 * @param {string}  opts.message  — full notification text
 * @param {object}  [opts.meta]   — optional JSON metadata (request ID, etc.)
 */
async function sendNotification({ userId, type, title, message, meta = null }) {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, meta ? JSON.stringify(meta) : null]
    );
  } catch (err) {
    console.error("[notifications] Failed to insert notification:", err.message);
  }
}

// ── Batch notify multiple users ────────────────────────────────────────────
async function sendNotificationBatch(notifications) {
  await Promise.allSettled(notifications.map((n) => sendNotification(n)));
}

// ── HTTP handlers ──────────────────────────────────────────────────────────

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const { rows: notifications } = await db.query(
      `SELECT id, type, title, message, meta, is_read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const { rows: countRows } = await db.query(
      "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT is_read) AS unread FROM notifications WHERE user_id = $1",
      [userId]
    );

    return res.json({
      notifications,
      total:  parseInt(countRows[0].total,  10),
      unread: parseInt(countRows[0].unread, 10),
    });
  } catch (err) {
    return next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
      [req.user.id]
    );
    return res.json({ message: "All notifications marked as read" });
  } catch (err) {
    return next(err);
  }
};

const markOneRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    return res.json({ message: "Notification marked as read" });
  } catch (err) {
    return next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    return res.json({ message: "Notification deleted" });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  sendNotification,
  sendNotificationBatch,
  getNotifications,
  markAllRead,
  markOneRead,
  deleteNotification,
};
