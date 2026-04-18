const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db");

const VALID_ROLES = ["student", "teacher", "admin"];

const buildAuthResponse = (user, authSource = "users") => {
  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      authSource
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  return {
    message: "Authentication successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [name.trim(), normalizedEmail, hashedPassword, role]
    );

    const [users] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [result.insertId]
    );

    return res.status(201).json(buildAuthResponse(users[0]));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [users] = await db.query(
      "SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    return res.json(buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
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

    return res.json({
      user: users[0]
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    await db.query("UPDATE users SET name = ? WHERE id = ?", [
      name.trim(),
      req.user.id,
    ]);

    const [users] = await db.query(
      "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    return res.json({ message: "Profile updated successfully", user: users[0] });
  } catch (error) {
    return next(error);
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT id, name, email, role, department, clearance_status
       FROM users
       ORDER BY FIELD(role, 'admin', 'teacher', 'student'), name ASC`
    );

    return res.json({
      users
    });
  } catch (error) {
    return next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      department = null,
      clearanceStatus = "Pending"
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        message: "Name, email, password, and role are required"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, clearance_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        normalizedEmail,
        hashedPassword,
        role,
        department ? department.trim() : null,
        clearanceStatus
      ]
    );

    const [users] = await db.query(
      `SELECT id, name, email, role, department, clearance_status
       FROM users
       WHERE id = ? LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "User created successfully",
      user: users[0]
    });
  } catch (error) {
    return next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const {
      name,
      email,
      password,
      role,
      department = null,
      clearanceStatus = "Pending"
    } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email, and role are required"
      });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        message: "Invalid role selected"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [normalizedEmail, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Another user already uses this email"
      });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.query(
        `UPDATE users
         SET name = ?, email = ?, password = ?, role = ?, department = ?, clearance_status = ?
         WHERE id = ?`,
        [
          name.trim(),
          normalizedEmail,
          hashedPassword,
          role,
          department ? department.trim() : null,
          clearanceStatus,
          userId
        ]
      );
    } else {
      await db.query(
        `UPDATE users
         SET name = ?, email = ?, role = ?, department = ?, clearance_status = ?
         WHERE id = ?`,
        [
          name.trim(),
          normalizedEmail,
          role,
          department ? department.trim() : null,
          clearanceStatus,
          userId
        ]
      );
    }

    const [users] = await db.query(
      `SELECT id, name, email, role, department, clearance_status
       FROM users
       WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.json({
      message: "User updated successfully",
      user: users[0]
    });
  } catch (error) {
    return next(error);
  }
};

const deleteUser = async (req, res, next) => {
  let connection;

  try {
    const userId = Number(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "Valid user id is required"
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [users] = await connection.query(
      "SELECT id, role, email FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "User not found"
      });
    }

    await connection.query("DELETE FROM approvals WHERE student_id = ? OR teacher_id = ?", [userId, userId]);
    await connection.query("DELETE FROM enrollments WHERE student_id = ?", [userId]);
    await connection.query("DELETE FROM grants WHERE student_id = ? OR teacher_id = ?", [userId, userId]);
    await connection.query("DELETE FROM qr_tokens WHERE student_id = ?", [userId]);
    await connection.query("DELETE FROM student_subjects WHERE student_id = ?", [userId]);
    await connection.query("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();

    return res.json({
      message: "User deleted successfully"
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  createUser,
  deleteUser,
  getAllUsers,
  getCurrentUser,
  login,
  register,
  updateProfile,
  updateUser
};
