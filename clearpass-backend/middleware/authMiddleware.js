const jwt = require("jsonwebtoken");

const db = require("../db");

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token is required"
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.authSource === "super_admins") {
      const [superAdmins] = await db.query(
        "SELECT id, name, email FROM super_admins WHERE id = ? LIMIT 1",
        [decoded.id]
      );

      if (superAdmins.length === 0) {
        return res.status(401).json({
          message: "Invalid token"
        });
      }

      req.user = {
        ...superAdmins[0],
        role: "super_admin"
      };

      return next();
    }

    // Try full query (requires migration to have added department/roll_number).
    // Fall back to basic columns so auth still works before migration is run.
    let users;
    try {
      [users] = await db.query(
        "SELECT id, name, email, role, department, roll_number FROM users WHERE id = ? LIMIT 1",
        [decoded.id]
      );
    } catch {
      [users] = await db.query(
        "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
        [decoded.id]
      );
    }

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }

    req.user = users[0];
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      message: "Forbidden: insufficient permissions"
    });
  }

  return next();
};

module.exports = {
  authorizeRoles,
  verifyToken
};
