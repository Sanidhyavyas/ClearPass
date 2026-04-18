const db = require("../db");

/**
 * Silently inserts an audit log row. Errors are caught so a failed
 * log write never breaks the main request flow.
 */
const createAuditLog = async ({
  userId,
  userName,
  userRole,
  action,
  targetType = null,
  targetId = null,
  details = null,
}) => {
  try {
    await db.query(
      `INSERT INTO audit_logs
         (user_id, user_name, user_role, action, target_type, target_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, action, targetType, targetId, details]
    );
  } catch (err) {
    console.error("Audit log write failed:", err.message);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const [logs] = await db.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
    return res.json({ logs });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createAuditLog, getAuditLogs };
