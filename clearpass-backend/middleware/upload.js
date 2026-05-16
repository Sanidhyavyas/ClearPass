const multer = require("multer");
const path   = require("path");
const fs     = require("fs");

const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MAX_FILES_PER_REQUEST: 5,
};

// Vercel's filesystem is read-only except /tmp; use /tmp in production
const UPLOAD_DIR = process.env.VERCEL
  ? "/tmp/uploads"
  : path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Sanitize original name: keep only alphanumeric, dots, dashes
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WebP, and PDF files are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES,
    files:    UPLOAD_LIMITS.MAX_FILES_PER_REQUEST,
  },
});

module.exports = { upload, UPLOAD_LIMITS };
