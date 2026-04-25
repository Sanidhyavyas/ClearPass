const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");

const buildSuperAdminAuthResponse = (superAdmin) => {
  const token = jwt.sign(
    {
      id: superAdmin.id,
      role: "super_admin",
      email: superAdmin.email,
      authSource: "super_admins"
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    message: "Authentication successful",
    token,
    user: {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: "super_admin"
    }
  };
};

const loginSuperAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await db.query(
      "SELECT id, name, email, password FROM super_admins WHERE email = $1 LIMIT 1",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const superAdmin = rows[0];
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    return res.json(buildSuperAdminAuthResponse(superAdmin));
  } catch (error) {
    return next(error);
  }
};

const getSuperAdminProfile = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, email FROM super_admins WHERE id = $1 LIMIT 1",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Super admin not found"
      });
    }

    return res.json({
      user: {
        ...rows[0],
        role: "super_admin"
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getSuperAdminOverview = async (req, res, next) => {
  try {
    const { rows: [userCounts] } = await db.query(
      `SELECT
          COUNT(*) AS totalUsers,
          COALESCE(SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END), 0) AS totalStudents,
          COALESCE(SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END), 0) AS totalTeachers,
          COALESCE(SUM(CASE WHEN role = 'admin'   THEN 1 ELSE 0 END), 0) AS totalAdmins
       FROM users`
    );

    const { rows: [superAdminCounts] } = await db.query(
      "SELECT COUNT(*) AS totalSuperAdmins FROM super_admins"
    );

    return res.json({
      stats: {
        ...userCounts[0],
        ...superAdminCounts[0]
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSuperAdminOverview,
  getSuperAdminProfile,
  loginSuperAdmin
};
