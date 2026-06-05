const express = require("express");

const {
  changePassword,
  getAllUsers,
  getUserById,
  getStudents,
  getTeachers,
  getAdmins,
  getCurrentUser,
  login,
  logout,
  refreshToken,
  register,
  updateProfile,
  createUser,
  updateUser,
  deleteUser
} = require("../controllers/authController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const { validate, schemas }           = require("../middleware/validate");

const router = express.Router();

router.post("/register", validate(schemas.register), register);
router.post("/login",    validate(schemas.login),    login);
router.post("/logout",   logout);
router.post("/refresh",  validate(schemas.refreshToken), refreshToken);
router.get("/me", verifyToken, getCurrentUser);
router.put("/profile", verifyToken, validate(schemas.updateProfile), updateProfile);
router.post("/change-password", verifyToken, validate(schemas.changePassword), changePassword);
router.get("/users", verifyToken, authorizeRoles("admin"), getAllUsers);

// Admin user management routes
router.post("/admin/create-user",      verifyToken, authorizeRoles("admin", "super_admin"), validate(schemas.createUser), createUser);
router.get("/admin/users/students",    verifyToken, authorizeRoles("admin", "super_admin"), getStudents);
router.get("/admin/users/teachers",    verifyToken, authorizeRoles("admin", "super_admin"), getTeachers);
router.get("/admin/users/admins",      verifyToken, authorizeRoles("admin", "super_admin"), getAdmins);
router.get("/admin/users/:id",         verifyToken, authorizeRoles("admin", "super_admin"), getUserById);
router.put("/admin/users/:id",         verifyToken, authorizeRoles("admin", "super_admin"), updateUser);
router.delete("/admin/users/:id",      verifyToken, authorizeRoles("admin", "super_admin"), deleteUser);

module.exports = router;
