const express = require("express");

const {
  getAllUsers,
  getStudents,   // ADDED
  getTeachers,   // ADDED
  getAdmins,     // ADDED
  getCurrentUser,
  login,
  register,
  updateProfile,
  createUser,    // ADDED
  updateUser,
  deleteUser
} = require("../controllers/authController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser);
router.put("/profile", verifyToken, updateProfile);
router.get("/users", verifyToken, authorizeRoles("admin"), getAllUsers);

// ADDED: Admin user management routes
router.post("/admin/create-user",      verifyToken, authorizeRoles("admin", "super_admin"), createUser);
router.get("/admin/users/students",    verifyToken, authorizeRoles("admin", "super_admin"), getStudents);
router.get("/admin/users/teachers",    verifyToken, authorizeRoles("admin", "super_admin"), getTeachers);
router.get("/admin/users/admins",      verifyToken, authorizeRoles("admin", "super_admin"), getAdmins);
router.put("/admin/users/:id",         verifyToken, authorizeRoles("admin", "super_admin"), updateUser);
router.delete("/admin/users/:id",      verifyToken, authorizeRoles("admin", "super_admin"), deleteUser);

module.exports = router;
