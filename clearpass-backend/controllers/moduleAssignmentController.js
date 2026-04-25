const db = require("../db");

/**
 * GET /api/modules/assignments
 * Returns all 4 module rows with assigned_user_id + user name/email.
 * Access: admin, super_admin
 */
const getAssignments = async (req, res, next) => {
  try {
    const { rows } = await db.query(`
      SELECT ma.module_name, ma.assigned_user_id, ma.updated_at,
             u.name  AS assigned_user_name,
             u.email AS assigned_user_email,
             u.role  AS assigned_user_role
      FROM module_assignments ma
      LEFT JOIN users u ON u.id = ma.assigned_user_id
      ORDER BY ma.module_name
    `);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /api/modules/assignments/:moduleName
 * Body: { assigned_user_id }  (null to unassign)
 * Access: admin, super_admin
 */
const setAssignment = async (req, res, next) => {
  try {
    const { moduleName }       = req.params;
    const { assigned_user_id } = req.body;

    const VALID_MODULES = ["library", "accounts", "hostel", "department"];
    if (!VALID_MODULES.includes(moduleName)) {
      return res.status(400).json({ message: "Invalid module name" });
    }

    // Validate user exists and has a staff role (teacher/admin)
    if (assigned_user_id !== null && assigned_user_id !== undefined) {
      const { rows: users } = await db.query(
        "SELECT id, role FROM users WHERE id = $1 LIMIT 1",
        [assigned_user_id]
      );
      if (!users.length) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!["teacher", "admin", "super_admin"].includes(users[0].role)) {
        return res.status(400).json({ message: "Only teachers or admins can be assigned to modules" });
      }
    }

    await db.query(
      `INSERT INTO module_assignments (module_name, assigned_user_id)
       VALUES ($1, $2)
       ON CONFLICT (module_name) DO UPDATE SET assigned_user_id = EXCLUDED.assigned_user_id, updated_at = NOW()`,
      [moduleName, assigned_user_id || null]
    );

    return res.json({ success: true, message: `Module '${moduleName}' assignment updated` });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/modules/staff
 * Returns all teachers and admins for the assignment picker.
 * Access: admin, super_admin
 */
const getStaff = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      "SELECT id, name, email, role, department FROM users WHERE role IN ('teacher','admin') ORDER BY name"
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAssignments, setAssignment, getStaff };
