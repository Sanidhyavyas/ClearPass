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
const PORTAL = () => process.env.CLIENT_URL || "http://localhost:3000";

/**
 * Shared branded HTML email wrapper.
 */
function emailTemplate({ title, preheader, bodyHtml, ctaLabel, ctaUrl }) {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td align="center" style="padding:24px 0 8px;">
         <a href="${ctaUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">${ctaLabel}</a>
       </td></tr>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader || title}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:28px 36px;">
            <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
              🎓 ClearPass
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Digital Clearance Management</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <h2 style="margin:0 0 16px;font-size:18px;color:#1e293b;font-weight:700;">${title}</h2>
            ${bodyHtml}
            ${cta}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This is an automated message from ClearPass. Please do not reply to this email.
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;">
              &copy; ${new Date().getFullYear()} ClearPass · All rights reserved
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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
    html: emailTemplate({
      title:    "Request Submitted Successfully",
      preheader: "Your clearance request is now pending review.",
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your clearance request has been <strong style="color:#2563eb;">submitted successfully</strong> and is now pending department review.
        </p>
        <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">What happens next?</p>
          <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#1e40af;line-height:1.7;">
            <li>An admin will assign a reviewer to your request</li>
            <li>Each department will verify and approve your clearance</li>
            <li>You will receive email updates at every step</li>
          </ul>
        </div>
        <p style="color:#475569;font-size:14px;line-height:1.6;">Track your real-time progress in the student portal.</p>
      `,
      ctaLabel: "Track My Progress",
      ctaUrl:   PORTAL(),
    }),
  });

/** Sent when a department approves or rejects a student's module */
const sendModuleStatusUpdate = (student, moduleName, status, remarks) => {
  const approved = status === "approved";
  return sendMail({
    to:      student.email,
    subject: `${approved ? "✅" : "❌"} ${moduleName} Clearance ${approved ? "Approved" : "Rejected"} – ClearPass`,
    html: emailTemplate({
      title:    `${moduleName} Clearance ${approved ? "Approved" : "Rejected"}`,
      preheader: `Your ${moduleName} clearance was ${status}.`,
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your <strong>${moduleName}</strong> clearance has been
          <strong style="color:${approved ? "#16a34a" : "#dc2626"};">${status}</strong>.
        </p>
        ${remarks ? `
        <div style="background:${approved ? "#f0fdf4" : "#fef2f2"};border-left:4px solid ${approved ? "#16a34a" : "#dc2626"};border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:${approved ? "#15803d" : "#b91c1c"};"><strong>Remarks:</strong> ${remarks}</p>
        </div>` : ""}
        ${!approved ? `<p style="color:#475569;font-size:13px;">Please contact the <strong>${moduleName}</strong> department to resolve any outstanding issues.</p>` : ""}
      `,
      ctaLabel: "View Clearance Status",
      ctaUrl:   PORTAL(),
    }),
  });
};

/** Sent to student on final approval — PDF certificate attached */
const sendFinalApproval = (student, pdfPath) =>
  sendMail({
    to:      student.email,
    subject: "🎓 Clearance Certificate Issued – ClearPass",
    html: emailTemplate({
      title:    "Congratulations — Fully Cleared!",
      preheader: "Your clearance certificate is ready to download.",
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px;margin:16px 0;text-align:center;">
          <p style="margin:0;font-size:28px;">🎉</p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:700;color:#15803d;">Clearance Fully Approved!</p>
          <p style="margin:6px 0 0;font-size:13px;color:#166534;">All departments have cleared you and your certificate has been issued.</p>
        </div>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your official clearance certificate is ${pdfPath ? "attached to this email and " : ""}available for download from the student portal.
        </p>
      `,
      ctaLabel: "Download Certificate",
      ctaUrl:   PORTAL(),
    }),
    attachments: pdfPath
      ? [{ filename: "clearance_certificate.pdf", path: pdfPath }]
      : [],
  });

/** Sent to student on final rejection */
const sendFinalRejection = (student, reason) =>
  sendMail({
    to:      student.email,
    subject: "❌ Clearance Request Rejected – ClearPass",
    html: emailTemplate({
      title:    "Clearance Request Rejected",
      preheader: "Your clearance request has been rejected.",
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          We regret to inform you that your clearance request has been <strong style="color:#dc2626;">rejected</strong>.
        </p>
        ${reason ? `
        <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#b91c1c;"><strong>Reason:</strong> ${reason}</p>
        </div>` : ""}
        <p style="color:#475569;font-size:13px;">Please contact the administration office for further assistance.</p>
      `,
      ctaLabel: "View Details",
      ctaUrl:   PORTAL(),
    }),
  });

/** Sent to student when admin assigns a reviewer to their request */
const sendTeacherAssigned = (student, teacherName) =>
  sendMail({
    to:      student.email,
    subject: "👤 Reviewer Assigned to Your Clearance – ClearPass",
    html: emailTemplate({
      title:    "A Reviewer Has Been Assigned",
      preheader: "Your clearance request is now under review.",
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          A reviewer (<strong>${teacherName}</strong>) has been assigned to evaluate your clearance request.
          Your request is now actively under review.
        </p>
        <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:#1e40af;">You will receive a notification once a decision is made.</p>
        </div>
      `,
      ctaLabel: "Track Progress",
      ctaUrl:   PORTAL(),
    }),
  });

/** Sent to teacher when a new clearance request is assigned to them */
const sendTeacherNewRequest = (teacher, studentName, requestId) =>
  sendMail({
    to:      teacher.email,
    subject: "📋 New Clearance Request Assigned – ClearPass",
    html: emailTemplate({
      title:    "New Request Assigned to You",
      preheader: `${studentName}'s clearance request is awaiting your review.`,
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${teacher.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          A clearance request from <strong>${studentName}</strong> (Request #${requestId}) has been assigned to you for review.
        </p>
        <p style="color:#475569;font-size:13px;">Please log in to the teacher portal to review and take action.</p>
      `,
      ctaLabel: "Review Request",
      ctaUrl:   `${PORTAL()}/teacher`,
    }),
  });

/** Sent to student when admin approves or rejects their fee payment */
const sendFeeStatusUpdate = (student, status, remarks) => {
  const approved = status === "approved";
  return sendMail({
    to:      student.email,
    subject: `${approved ? "✅" : "❌"} Fee Payment ${approved ? "Verified" : "Rejected"} – ClearPass`,
    html: emailTemplate({
      title:    `Fee Payment ${approved ? "Verified" : "Rejected"}`,
      preheader: `Your fee payment has been ${status} by admin.`,
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your fee payment has been <strong style="color:${approved ? "#16a34a" : "#dc2626"};">${approved ? "verified and approved" : "rejected"}</strong> by the admin.
        </p>
        ${remarks ? `
        <div style="background:${approved ? "#f0fdf4" : "#fef2f2"};border-left:4px solid ${approved ? "#16a34a" : "#dc2626"};border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:${approved ? "#15803d" : "#b91c1c"};"><strong>Remarks:</strong> ${remarks}</p>
        </div>` : ""}
        ${approved ? `<p style="color:#475569;font-size:13px;">Your certificate will be available for download once all other clearances are also complete.</p>` : ""}
      `,
      ctaLabel: "View Clearance Status",
      ctaUrl:   PORTAL(),
    }),
  });
};

/** Sent to student when a TGC subject is approved or rejected by a teacher */
const sendTGCSubjectUpdate = (student, subjectName, status, remarks) => {
  const approved = status === "approved";
  return sendMail({
    to:      student.email,
    subject: `${approved ? "✅" : "❌"} TGC Subject "${subjectName}" ${approved ? "Approved" : "Rejected"} – ClearPass`,
    html: emailTemplate({
      title:    `TGC: ${subjectName} ${approved ? "Approved" : "Rejected"}`,
      preheader: `Your TGC subject "${subjectName}" was ${status}.`,
      bodyHtml: `
        <p style="color:#475569;font-size:14px;line-height:1.6;">Hi <strong>${student.name}</strong>,</p>
        <p style="color:#475569;font-size:14px;line-height:1.6;">
          Your Term Grant Certificate subject <strong>${subjectName}</strong> has been
          <strong style="color:${approved ? "#16a34a" : "#dc2626"};">${status}</strong>.
        </p>
        ${remarks ? `
        <div style="background:${approved ? "#f0fdf4" : "#fef2f2"};border-left:4px solid ${approved ? "#16a34a" : "#dc2626"};border-radius:4px;padding:14px 18px;margin:20px 0;">
          <p style="margin:0;font-size:13px;color:${approved ? "#15803d" : "#b91c1c"};"><strong>Remarks:</strong> ${remarks}</p>
        </div>` : ""}
      `,
      ctaLabel: "View TGC Progress",
      ctaUrl:   PORTAL(),
    }),
  });
};

module.exports = {
  sendClearanceSubmitted,
  sendModuleStatusUpdate,
  sendFinalApproval,
  sendFinalRejection,
  sendTeacherAssigned,
  sendTeacherNewRequest,
  sendFeeStatusUpdate,
  sendTGCSubjectUpdate,
};
