const db = require("../db");

const getDashboard = async (req, res, next) => {
  try {
    const { rows: users } = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1",
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
      const { rows } = await db.query(
        `SELECT
            COUNT(*) AS totalRequests,
            COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pendingRequests,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedRequests,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedRequests
         FROM clearance_requests
         WHERE student_id = $1`,
        [user.id]
      );

      stats = rows[0];
    }

    if (user.role === "teacher") {
      const { rows } = await db.query(
        `SELECT
            COUNT(*) AS totalAssigned,
            COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pendingRequests,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedRequests,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedRequests
         FROM clearance_requests
         WHERE teacher_id = $1`,
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
        const { rows: requestRows } = await db.query(
          `SELECT
              COUNT(*) AS totalRequests,
              COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pendingRequests,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedRequests,
              COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedRequests
           FROM clearance_requests`
        );

        requestStats = requestRows[0];
      } catch (error) {
        if (error.code !== "42P01") {
          throw error;
        }
      }

      const { rows: userRows } = await db.query(
        `SELECT
            COUNT(*) AS totalUsers,
            COALESCE(SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END), 0) AS totalStudents,
            COALESCE(SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END), 0) AS totalTeachers,
            COALESCE(SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END), 0) AS totalAdmins
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
