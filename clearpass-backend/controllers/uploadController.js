const path = require("path");
const fs   = require("fs");
const db   = require("../db");

/**
 * POST /api/upload/documents
 * Saves uploaded files to disk and records metadata in request_documents table.
 * Requires: student role, active clearance request.
 */
const uploadDocuments = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded." });
    }

    const studentId = req.user.id;

    // Fetch the student's latest pending request
    const { rows: requests } = await db.query(
      `SELECT id FROM clearance_requests
       WHERE student_id = $1 AND status = 'pending'
       ORDER BY COALESCE(submitted_at, created_at) DESC
       LIMIT 1`,
      [studentId]
    );

    if (!requests.length) {
      // Clean up uploaded files since we cannot associate them
      req.files.forEach((f) => {
        try { fs.unlinkSync(f.path); } catch { /* ignore */ }
      });
      return res.status(400).json({ message: "No active clearance request found. Submit a request first." });
    }

    const requestId = requests[0].id;

    const fileRows = req.files.map((f) => [
      requestId,
      studentId,
      f.originalname,
      f.filename,
      f.mimetype,
      f.size,
    ]);

    for (const row of fileRows) {
      await db.query(
        `INSERT INTO request_documents (request_id, student_id, file_name, file_path, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        row
      );
    }

    const saved = req.files.map((f) => ({
      fileName: f.originalname,
      storedAs: f.filename,
      size:     f.size,
      type:     f.mimetype,
    }));

    return res.status(201).json({
      message: `${saved.length} file${saved.length > 1 ? "s" : ""} uploaded successfully.`,
      files: saved,
    });
  } catch (err) {
    // Clean up any uploaded files on DB error
    if (req.files) {
      req.files.forEach((f) => {
        try { fs.unlinkSync(f.path); } catch { /* ignore */ }
      });
    }
    return next(err);
  }
};

/**
 * GET /api/upload/documents
 * Returns all uploaded documents for the authenticated student.
 */
const getDocuments = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    let docs = [];
    try {
      const { rows } = await db.query(
        `SELECT rd.id, rd.file_name, rd.file_path, rd.file_type, rd.file_size, rd.uploaded_at,
                cr.id AS request_id, cr.status AS request_status
         FROM request_documents rd
         LEFT JOIN clearance_requests cr ON cr.id = rd.request_id
         WHERE rd.student_id = $1
         ORDER BY rd.uploaded_at DESC`,
        [studentId]
      );
      docs = rows;
    } catch (err) {
      if (err.code !== "42P01") throw err;
    }

    return res.json({ documents: docs });
  } catch (err) {
    return next(err);
  }
};

/**
 * DELETE /api/upload/documents/:id
 * Student may delete their own uploaded document.
 */
const deleteDocument = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const docId     = req.params.id;

    const { rows } = await db.query(
      "SELECT * FROM request_documents WHERE id = $1 AND student_id = $2 LIMIT 1",
      [docId, studentId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Document not found." });
    }

    const doc      = rows[0];
    const filePath = path.join(__dirname, "..", "uploads", doc.file_path);

    await db.query("DELETE FROM request_documents WHERE id = $1", [docId]);

    // Best-effort file removal
    try { fs.unlinkSync(filePath); } catch { /* already gone */ }

    return res.json({ message: "Document deleted." });
  } catch (err) {
    return next(err);
  }
};

module.exports = { uploadDocuments, getDocuments, deleteDocument };
