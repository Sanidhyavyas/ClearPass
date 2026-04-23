const express = require("express");
const path    = require("path");

const { authorizeRoles, verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { deleteDocument, getDocuments, uploadDocuments } = require("../controllers/uploadController");

const router = express.Router();

// All upload routes require authentication
router.use(verifyToken);

// Students upload documents for their clearance request
router.post(
  "/documents",
  authorizeRoles("student"),
  upload.array("files", 5),
  (err, req, res, next) => {
    // Multer validation errors (file type, size limit, etc.)
    if (err && err.message) {
      return res.status(400).json({ message: err.message });
    }
    return next(err);
  },
  uploadDocuments
);

// Any authenticated user can list their own documents
router.get("/documents", authorizeRoles("student"), getDocuments);

// Student deletes their own document
router.delete("/documents/:id", authorizeRoles("student"), deleteDocument);

// Serve uploaded files (admin / teacher can preview)
router.get(
  "/files/:filename",
  authorizeRoles("student", "teacher", "admin", "super_admin"),
  (req, res) => {
    const filename = path.basename(req.params.filename); // prevent path traversal
    res.sendFile(filename, { root: path.join(__dirname, "..", "uploads") }, (err) => {
      if (err) res.status(404).json({ message: "File not found." });
    });
  }
);

module.exports = router;
