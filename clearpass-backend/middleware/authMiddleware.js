const jwt = require("jsonwebtoken");

const db = require("../db");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authorization token is required"
    });
  }

  const token = authHeader.split(" ")[1];

  // Verify JWT separately so DB errors are not masked as token errors.
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token"
    });
  }

  try {
    if (decoded.authSource === "super_admins") {
      const { rows: superAdmins } = await db.query(
        "SELECT id, name, email FROM super_admins WHERE id = $1 LIMIT 1",
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

    // Fetch user including year/semester (added by multi-semester migration).
    // Falls back to base columns if migration has not yet been applied.
    let users;
    try {
      const { rows } = await db.query(
        "SELECT id, name, email, role, department, roll_number, year, semester FROM users WHERE id = $1 LIMIT 1",
        [decoded.id]
      );
      users = rows;
    } catch {
      try {
        const { rows } = await db.query(
          "SELECT id, name, email, role, department, roll_number FROM users WHERE id = $1 LIMIT 1",
          [decoded.id]
        );
        users = rows;
      } catch {
        const { rows } = await db.query(
          "SELECT id, name, email, role FROM users WHERE id = $1 LIMIT 1",
          [decoded.id]
        );
        users = rows;
      }
    }

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }

    req.user = users[0];
    return next();
  } catch (error) {
    console.error("[authMiddleware] DB error during token verification:", error.message);
    return next(error);
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
