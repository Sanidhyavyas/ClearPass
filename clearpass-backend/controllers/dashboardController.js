const db = require("../db");

const getDashboard = async (req, res, next) => {
  try {
    const { rows: users } = await db.query(
      "SELECT id, name, email, role, year, semester FROM users WHERE id = $1 LIMIT 1",
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
      // Scope student stats to their own semester
      const semWhere = user.year && user.semester
        ? " AND year = $2 AND semester = $3"
        : "";
      const semParams = user.year && user.semester
        ? [user.id, user.year, user.semester]
        : [user.id];

      const { rows } = await db.query(
        `SELECT
            COUNT(*) AS totalRequests,
            COALESCE(SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END), 0) AS pendingRequests,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedRequests,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedRequests
         FROM clearance_requests
         WHERE student_id = $1${semWhere}`,
        semParams
      );

      stats = {
        ...rows[0],
        year:     user.year     || null,
        semester: user.semester || null,
      };
    }

    if (user.role === "teacher") {
      // Fetch which semesters this teacher is assigned to
      const { rows: semRows } = await db.query(
        "SELECT year, semester FROM teacher_semesters WHERE teacher_id = $1 ORDER BY year, semester",
        [user.id]
      );

      let semWhere = "";
      const qParams = [];

      if (semRows.length > 0) {
        const pairs = semRows.map((s, i) =>
          `(cr.year = $${i * 2 + 1} AND cr.semester = $${i * 2 + 2})`
        ).join(" OR ");
        semWhere = ` AND (${pairs})`;
        semRows.forEach((s) => qParams.push(s.year, s.semester));
      }

      qParams.push(user.id); // teacher_id param

      const { rows } = await db.query(
        `SELECT
            COUNT(*) AS totalAssigned,
            COALESCE(SUM(CASE WHEN cr.status = 'pending'  THEN 1 ELSE 0 END), 0) AS pendingRequests,
            COALESCE(SUM(CASE WHEN cr.status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedRequests,
            COALESCE(SUM(CASE WHEN cr.status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedRequests
         FROM clearance_requests cr
         WHERE cr.teacher_id = $${qParams.length}${semWhere}`,
        qParams
      );

      stats = {
        ...rows[0],
        assignedSemesters: semRows,
      };
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

      // Breakdown by semester for quick insight
      let semesterBreakdown = [];
      try {
        const { rows: sbRows } = await db.query(
          `SELECT year, semester,
             COUNT(*) AS total,
             SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
             SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
           FROM clearance_requests
           WHERE year IS NOT NULL AND semester IS NOT NULL
           GROUP BY year, semester
           ORDER BY year, semester`
        );
        semesterBreakdown = sbRows.map((r) => ({
          year:     Number(r.year),
          semester: Number(r.semester),
          total:    Number(r.total),
          approved: Number(r.approved),
          pending:  Number(r.pending),
          rejected: Number(r.rejected),
        }));
      } catch { /* non-fatal */ }

      stats = {
        ...requestStats,
        ...userRows[0],
        semesterBreakdown,
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
