const express = require("express");

const {
  createSubject,
  listSubjects,
  updateSubject,
  deleteSubject,
  mapSubject,
  getSubjectsForSlot,
  removeMapping,
  getAcademicStructure,
  reorderSlot,
} = require("../controllers/subjectController");
const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Read endpoints — super_admin + admin can view
const canRead  = authorizeRoles("super_admin", "admin");
// Write endpoints — super_admin only
const canWrite = authorizeRoles("super_admin");

// Order matters: specific paths before parameterised paths
router.get("/structure",       canRead,  getAcademicStructure);
router.post("/reorder",        canWrite, reorderSlot);
router.get("/map/:year/:sem",  canRead,  getSubjectsForSlot);
router.post("/map",            canWrite, mapSubject);
router.delete("/map/:id",      canWrite, removeMapping);

router.get("/",    canRead,  listSubjects);
router.post("/",   canWrite, createSubject);
router.put("/:id", canWrite, updateSubject);
router.delete("/:id", canWrite, deleteSubject);

module.exports = router;
