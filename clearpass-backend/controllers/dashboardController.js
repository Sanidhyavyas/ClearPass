const db = require("../db");

const getDashboard = async (req, res, next) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const user = users[0];
    let stats = {};

    if (user.role === "student") {
      const [rows] = await db.query(
        `SELECT
            COUNT(*) AS totalRequests,
            COALESCE(SUM(status = 'pending'), 0) AS pendingRequests,
            COALESCE(SUM(status = 'approved'), 0) AS approvedRequests,
            COALESCE(SUM(status = 'rejected'), 0) AS rejectedRequests
         FROM clearance_requests
         WHERE student_id = ?`,
        [user.id]
      );

      stats = rows[0];
    }

    if (user.role === "teacher") {
      const [rows] = await db.query(
        `SELECT
            COUNT(*) AS totalAssigned,
            COALESCE(SUM(status = 'pending'), 0) AS pendingRequests,
            COALESCE(SUM(status = 'approved'), 0) AS approvedRequests,
            COALESCE(SUM(status = 'rejected'), 0) AS rejectedRequests
         FROM clearance_requests
         WHERE assigned_teacher_id = ?`,
        [user.id]
      );

      stats = rows[0];
    }

    if (user.role === "admin") {
      let requestStats = {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0
      };

      try {
        const [requestRows] = await db.query(
          `SELECT
              COUNT(*) AS totalRequests,
              COALESCE(SUM(status = 'pending'), 0) AS pendingRequests,
              COALESCE(SUM(status = 'approved'), 0) AS approvedRequests,
              COALESCE(SUM(status = 'rejected'), 0) AS rejectedRequests
           FROM clearance_requests`
        );

        requestStats = requestRows[0];
      } catch (error) {
        if (error.code !== "ER_NO_SUCH_TABLE") {
          throw error;
        }
      }

      const [userRows] = await db.query(
        `SELECT
            COUNT(*) AS totalUsers,
            COALESCE(SUM(role = 'student'), 0) AS totalStudents,
            COALESCE(SUM(role = 'teacher'), 0) AS totalTeachers,
            COALESCE(SUM(role = 'admin'), 0) AS totalAdmins
         FROM users`
      );

      stats = {
        ...requestStats,
        ...userRows[0]
      };
    }

    return res.json({
      user,
      stats
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getDashboard
};
