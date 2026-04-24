/**
 * utils/mailer.js — Nodemailer wrapper for ClearPass notifications.
 * Configure via .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CLIENT_URL
 */
const nodemailer = require("nodemailer");

const createTransport = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const FROM = () => `"ClearPass" <${process.env.SMTP_USER}>`;

/**
 * Core send — all errors are caught and logged so a failed email
 * never breaks the main request flow.
 */
const sendMail = async ({ to, subject, html, attachments = [] }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[mailer] SMTP not configured — email skipped.");
    return;
  }
  try {
    const transporter = createTransport();
    await transporter.sendMail({ from: FROM(), to, subject, html, attachments });
  } catch (err) {
    console.error("[mailer] Failed to send email to", to, ":", err.message);
  }
};

// ── Notification helpers ────────────────────────────────────────────────────

/** Sent to student when they submit a clearance request */
const sendClearanceSubmitted = (student) =>
  sendMail({
    to:      student.email,
    subject: "Clearance Request Submitted – ClearPass",
    html: `<p>Hi ${student.name},</p>
           <p>Your clearance request has been submitted and is now pending department review.</p>
           <p>You can track your progress at <a href="${process.env.CLIENT_URL}">${process.env.CLIENT_URL}</a></p>`,
  });

/** Sent when a department approves or rejects a student's module */
const sendModuleStatusUpdate = (student, moduleName, status, remarks) => {
  const emoji = status === "approved" ? "✅" : "❌";
  return sendMail({
    to:      student.email,
    subject: `${emoji} ${moduleName} Clearance ${status === "approved" ? "Approved" : "Rejected"} – ClearPass`,
    html: `<p>Hi ${student.name},</p>
           <p>Your <strong>${moduleName}</strong> clearance has been <strong>${status}</strong>.</p>
           ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ""}
           <p>Log in to view your full clearance status.</p>`,
  });
};

/** Sent to student on final approval — PDF certificate attached */
const sendFinalApproval = (student, pdfPath) =>
  sendMail({
    to:      student.email,
    subject: "🎓 Clearance Certificate Issued – ClearPass",
    html: `<p>Hi ${student.name},</p>
           <p>Congratulations! Your clearance has been <strong>fully approved</strong>.</p>
           <p>Your official clearance certificate is attached to this email.</p>
           <p>You can also download it anytime from the student portal.</p>`,
    attachments: pdfPath
      ? [{ filename: "clearance_certificate.pdf", path: pdfPath }]
      : [],
  });

/** Sent to student on final rejection */
const sendFinalRejection = (student, reason) =>
  sendMail({
    to:      student.email,
    subject: "❌ Clearance Request Rejected – ClearPass",
    html: `<p>Hi ${student.name},</p>
           <p>Your clearance request has been <strong>rejected</strong>.</p>
           ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
           <p>Please contact the administration for further assistance.</p>`,
  });

module.exports = {
  sendClearanceSubmitted,
  sendModuleStatusUpdate,
  sendFinalApproval,
  sendFinalRejection,
};
