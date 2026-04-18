const express = require("express");

const {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser
} = require("../controllers/authController");
const {
  getSuperAdminOverview,
  getSuperAdminProfile,
  loginSuperAdmin
} = require("../controllers/superAdminController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", loginSuperAdmin);
router.get("/me", verifyToken, authorizeRoles("super_admin"), getSuperAdminProfile);
router.get("/overview", verifyToken, authorizeRoles("super_admin"), getSuperAdminOverview);
router.get("/users", verifyToken, authorizeRoles("super_admin"), getAllUsers);
router.post("/users", verifyToken, authorizeRoles("super_admin"), createUser);
router.put("/users/:id", verifyToken, authorizeRoles("super_admin"), updateUser);
router.delete("/users/:id", verifyToken, authorizeRoles("super_admin"), deleteUser);

module.exports = router;
