const express = require("express");

const {
  getAllUsers,
  getCurrentUser,
  login,
  register,
  updateProfile
} = require("../controllers/authController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser);
router.put("/profile", verifyToken, updateProfile);
router.get("/users", verifyToken, authorizeRoles("admin"), getAllUsers);

module.exports = router;
