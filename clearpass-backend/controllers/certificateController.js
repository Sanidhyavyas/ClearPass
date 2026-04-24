/**
 * controllers/certificateController.js
 *
 * Handles:
 *   GET  /api/clearance/pending-final      — requests awaiting final admin approval
 *   PATCH /api/clearance/:id/finalize      — admin finalizes (approved/rejected), generates PDF+QR
 *   GET  /api/clearance/:id/certificate    — authenticated: serve the PDF
 *   GET  /api/verify/:token                — public: verify QR token
 */

const crypto = require("crypto");
const fs     = require("fs");
const path   = require("path");

const PDFDocument = require("pdfkit");
const QRCode      = require("qrcode");

const db              = require("../db");
const { createAuditLog } = require("./auditController");
const {
  sendFinalApproval,
  sendFinalRejection,
} = require("../utils/mailer");

// ── Directory for certificates ────────────────────────────────────────────
const CERT_DIR = path.join(__dirname, "..", "uploads", "certificates");
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

// ── Helper: generate PDF certificate ─────────────────────────────────────
async function generateCertificate({ student, request, modules, token, certPath }) {
  const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/verify/${token}`;

  // QR code as PNG buffer
  const qrBuffer = await QRCode.toBuffer(verifyUrl, { width: 120, margin: 1 });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 60 });
    const stream = fs.createWriteStream(certPath);

    doc.pipe(stream);

    // ── Header ──────────────────────────────────────────────────────
    doc
      .fontSize(22).font("Helvetica-Bold")
      .fillColor("#1e3a5f")
      .text("CLEARANCE CERTIFICATE", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(10).font("Helvetica")
      .fillColor("#555")
      .text("ClearPass — Student Clearance Management System", { align: "center" });

    doc.moveDown(1);
    doc
      .moveTo(60, doc.y).lineTo(535, doc.y)
      .strokeColor("#1e3a5f").lineWidth(1.5).stroke();

    // ── Student Info ─────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e3a5f").text("Student Details");
    doc.moveDown(0.4);

    const infoLines = [
      ["Name",        student.name],
      ["Student ID",  String(student.id)],
      ["Roll No.",    request.roll_number  || "—"],
      ["Department",  request.department   || student.department || "—"],
      ["Semester",    request.semester     ? `Semester ${request.semester}` : "—"],
      ["Year",        request.year         ? `Year ${request.year}` : "—"],
    ];

    infoLines.forEach(([label, value]) => {
      doc
        .fontSize(10).font("Helvetica-Bold").fillColor("#333")
        .text(`${label}: `, { continued: true })
        .font("Helvetica").fillColor("#444")
        .text(value);
    });

    // ── Module Table ─────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#1e3a5f").text("Clearance Modules");
    doc.moveDown(0.5);

    const tableTop  = doc.y;
    const colX      = [60, 200, 300, 430];
    const rowHeight = 20;
    const headers   = ["Module", "Status", "Reviewed By", "Date"];

    // Header row
    doc.fontSize(9).font("Helvetica-Bold").fillColor("#fff");
    doc.rect(60, tableTop, 475, rowHeight).fill("#1e3a5f");
    headers.forEach((h, i) => {
      doc.fillColor("#fff").text(h, colX[i], tableTop + 5, { width: 130, lineBreak: false });
    });

    // Data rows
    modules.forEach((mod, idx) => {
      const rowY = tableTop + rowHeight + idx * rowHeight;
      const bg   = idx % 2 === 0 ? "#f0f4f8" : "#ffffff";
      doc.rect(60, rowY, 475, rowHeight).fill(bg);

      const statusColor =
        mod.status === "approved"     ? "#16a34a" :
        mod.status === "not_required" ? "#6b7280" :
        mod.status === "rejected"     ? "#dc2626" : "#d97706";

      doc.fontSize(9).font("Helvetica").fillColor(statusColor)
        .text(mod.module_name.charAt(0).toUpperCase() + mod.module_name.slice(1), colX[0], rowY + 5, { width: 130, lineBreak: false });
      doc.fillColor(statusColor)
        .text(mod.status.replace("_", " "), colX[1], rowY + 5, { width: 90, lineBreak: false });
      doc.fillColor("#333")
        .text(mod.reviewer_name || "—", colX[2], rowY + 5, { width: 120, lineBreak: false });
      doc.text(
        mod.last_updated ? new Date(mod.last_updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
        colX[3], rowY + 5, { width: 100, lineBreak: false }
      );
    });

    // ── Certificate Info ─────────────────────────────────────────
    doc.moveDown(modules.length + 1.5);
    doc.fontSize(10).font("Helvetica").fillColor("#333");
    doc.text(`Certificate No.: ${token.substring(0, 16).toUpperCase()}`);
    doc.text(`Date of Issue:   ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`);

    // ── QR Code ──────────────────────────────────────────────────
    doc.image(qrBuffer, 435, doc.y - 40, { width: 80, height: 80 });

    // ── Footer ───────────────────────────────────────────────────
    doc
      .moveTo(60, 760).lineTo(535, 760)
      .strokeColor("#ccc").lineWidth(0.5).stroke();

    doc.fontSize(8).fillColor("#888")
      .text(
        "This certificate is digitally verifiable. Scan the QR code or visit: " + verifyUrl,
        60, 768, { align: "center", width: 475 }
      );

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// ── GET /api/clearance/pending-final ─────────────────────────────────────
const getPendingFinal = async (req, res, next) => {
  try {
    const [rows] = await db.query(`
      SELECT cr.*,
             COALESCE(cr.submitted_at, cr.created_at) AS submitted_at,
             u.name  AS student_name,
             u.email AS student_email
      FROM clearance_requests cr
      JOIN users u ON u.id = cr.student_id
      WHERE cr.current_stage = 'admin' AND cr.status = 'pending'
      ORDER BY COALESCE(cr.submitted_at, cr.created_at) ASC
    `);
    return res.json({ success: true, data: rows, message: "Pending final approvals fetched" });
  } catch (error) {
    return next(error);
  }
};

// ── PATCH /api/clearance/:id/finalize ────────────────────────────────────
const finalizeRequest = async (req, res, next) => {
  try {
    const requestId            = Number(req.params.id);
    const { status, remarks }  = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
    }

    // Fetch request + student
    const [rows] = await db.query(
      `SELECT cr.*, u.name AS student_name, u.email AS student_email, u.department AS student_dept
       FROM clearance_requests cr
       JOIN users u ON u.id = cr.student_id
       WHERE cr.id = ? LIMIT 1`,
      [requestId]
    );
    if (!rows.length) return res.status(404).json({ message: "Request not found" });

    const request = rows[0];
    const student = { id: request.student_id, name: request.student_name, email: request.student_email, department: request.student_dept };

    // ── Update request status ─────────────────────────────────────
    if (status === "approved") {
      await db.query(
        `UPDATE clearance_requests
           SET status = 'approved', current_stage = 'completed',
               approved_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [requestId]
      );
    } else {
      await db.query(
        `UPDATE clearance_requests
           SET status = 'rejected', rejection_reason = ?, rejected_at = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [remarks || null, requestId]
      );
    }

    // ── Audit log ─────────────────────────────────────────────────
    await db.query(
      `INSERT INTO clearance_audit_logs (request_id, action, performed_by, performed_by_role, remarks)
       VALUES (?, ?, ?, ?, ?)`,
      [requestId, status, req.user.id, req.user.role, remarks || null]
    );

    await createAuditLog({
      userId:     req.user.id,
      userName:   req.user.name,
      userRole:   req.user.role,
      action:     `finalized_${status}`,
      targetType: "clearance_request",
      targetId:   requestId,
      details:    `Request #${requestId} finalized as ${status} by ${req.user.name}`,
    });

    // ── For approved: generate QR + PDF, send email ───────────────
    let certPath = null;
    if (status === "approved") {
      const token = crypto.randomBytes(32).toString("hex");
      certPath    = path.join(CERT_DIR, `${student.id}_${requestId}.pdf`);

      // Fetch modules with reviewer names
      const [modules] = await db.query(
        `SELECT cm.*, u.name AS reviewer_name
         FROM clearance_modules cm
         LEFT JOIN users u ON u.id = cm.reviewed_by
         WHERE cm.student_id = ?
         ORDER BY cm.module_name`,
        [student.id]
      );

      await generateCertificate({ student: { ...student, id: request.student_id }, request, modules, token, certPath });

      // Store QR token
      await db.query(
        `INSERT INTO qr_tokens (token, request_id, student_id, certificate_path)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE certificate_path = VALUES(certificate_path)`,
        [token, requestId, student.id, certPath]
      );

      // Send email (non-fatal)
      sendFinalApproval(student, certPath).catch(() => {});
    } else {
      // Send rejection email (non-fatal)
      sendFinalRejection(student, remarks).catch(() => {});
    }

    return res.json({
      success: true,
      message: `Request ${status === "approved" ? "approved and certificate issued" : "rejected"}`,
      certificate_ready: status === "approved",
    });
  } catch (error) {
    return next(error);
  }
};

// ── GET /api/clearance/:id/certificate ───────────────────────────────────
const getCertificate = async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    const userId    = req.user.id;
    const userRole  = req.user.role;

    // Students may only fetch their own certificate
    const [rows] = await db.query(
      "SELECT * FROM qr_tokens WHERE request_id = ? LIMIT 1",
      [requestId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Certificate not found for this request" });
    }

    const record = rows[0];

    if (userRole === "student" && record.student_id !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const certPath = record.certificate_path;
    if (!certPath || !fs.existsSync(certPath)) {
      return res.status(404).json({ message: "Certificate file not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="clearance_${requestId}.pdf"`);
    fs.createReadStream(certPath).pipe(res);
  } catch (error) {
    return next(error);
  }
};

// ── GET /api/verify/:token (public, no auth) ─────────────────────────────
const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    const [rows] = await db.query(
      `SELECT qt.*, u.name AS student_name, u.department,
              cr.status AS clearance_status, cr.approved_at
       FROM qr_tokens qt
       JOIN users               u  ON u.id  = qt.student_id
       JOIN clearance_requests  cr ON cr.id = qt.request_id
       WHERE qt.token = ? LIMIT 1`,
      [token]
    );

    if (!rows.length) {
      return res.status(404).json({ valid: false, message: "Invalid or expired token" });
    }

    const r = rows[0];
    return res.json({
      valid:            true,
      student_name:     r.student_name,
      department:       r.department,
      clearance_status: r.clearance_status,
      issued_at:        r.created_at,
      approved_at:      r.approved_at,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getPendingFinal,
  finalizeRequest,
  getCertificate,
  verifyToken,
};
