/**
 * utils/sms.js — Twilio SMS wrapper for ClearPass.
 *
 * Required .env variables (all optional — SMS is silently skipped if absent):
 *   TWILIO_ACCOUNT_SID   — e.g. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *   TWILIO_AUTH_TOKEN    — your Twilio auth token
 *   TWILIO_FROM          — your Twilio phone number, e.g. +15005550006
 *
 * Student / user phone numbers must be stored in the `phone` column of the
 * `users` table. SMS is skipped for users without a phone number.
 *
 * Uses Node.js built-in `https` — no extra package required.
 */

"use strict";

const https = require("https");

/**
 * Low-level SMS sender via Twilio REST API.
 * Non-fatal — errors are caught and logged.
 *
 * @param {object} opts
 * @param {string} opts.to   — recipient phone number (E.164 format or will be normalised)
 * @param {string} opts.body — message text (max 160 chars for a single SMS segment)
 */
function sendSMS({ to, body }) {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_FROM;

  if (!sid || !token || !from) {
    // SMS not configured — skip silently
    return Promise.resolve();
  }

  if (!to) return Promise.resolve(); // no phone number on user record

  // Normalise to E.164 (add leading + if missing)
  const toE164 = to.startsWith("+") ? to : `+${to}`;

  const postData = new URLSearchParams({ To: toE164, From: from, Body: body }).toString();

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "api.twilio.com",
        path:     `/2010-04-01/Accounts/${sid}/Messages.json`,
        method:   "POST",
        auth:     `${sid}:${token}`,
        headers:  {
          "Content-Type":   "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        // Drain the response body so the socket is released
        res.on("data", () => {});
        res.on("end", resolve);
        if (res.statusCode >= 400) {
          console.error("[sms] Twilio returned HTTP", res.statusCode, "for", toE164);
        }
      }
    );
    req.on("error", (err) => {
      console.error("[sms] Failed to send SMS to", toE164, ":", err.message);
      resolve(); // non-fatal
    });
    req.write(postData);
    req.end();
  });
}

// ── High-level notification helpers ────────────────────────────────────────

/**
 * SMS when a student submits a clearance request.
 * @param {{ name: string, phone?: string }} student
 */
const sendClearanceSubmittedSMS = (student) =>
  sendSMS({
    to:   student.phone,
    body: `ClearPass: Hi ${student.name}, your clearance request has been submitted and is pending review. Track it at ${process.env.CLIENT_URL || "the portal"}.`,
  });

/**
 * SMS when teacher/admin updates the overall request status.
 * @param {{ name: string, phone?: string }} student
 * @param {string} status — "approved" | "rejected"
 */
const sendStatusUpdateSMS = (student, status) =>
  sendSMS({
    to:   student.phone,
    body: `ClearPass: ${status === "approved" ? "✅" : "❌"} Your clearance request has been ${status}. Log in to the portal for details.`,
  });

/**
 * SMS when admin assigns a reviewer to the student's request.
 * @param {{ name: string, phone?: string }} student
 * @param {string} teacherName
 */
const sendTeacherAssignedSMS = (student, teacherName) =>
  sendSMS({
    to:   student.phone,
    body: `ClearPass: A reviewer (${teacherName}) has been assigned to your clearance request. You will be notified once reviewed.`,
  });

/**
 * SMS when admin approves or rejects fee payment.
 * @param {{ name: string, phone?: string }} student
 * @param {string} status — "approved" | "rejected"
 */
const sendFeeStatusSMS = (student, status) =>
  sendSMS({
    to:   student.phone,
    body: `ClearPass: ${status === "approved" ? "✅" : "❌"} Your fee payment has been ${status} by the admin. Log in to check your clearance status.`,
  });

/**
 * SMS when a TGC subject is approved or rejected by a teacher.
 * @param {{ name: string, phone?: string }} student
 * @param {string} subjectName
 * @param {string} status — "approved" | "rejected"
 */
const sendTGCSubjectSMS = (student, subjectName, status) =>
  sendSMS({
    to:   student.phone,
    body: `ClearPass: ${status === "approved" ? "✅" : "❌"} Your TGC subject "${subjectName}" has been ${status}. Log in for details.`,
  });

module.exports = {
  sendSMS,
  sendClearanceSubmittedSMS,
  sendStatusUpdateSMS,
  sendTeacherAssignedSMS,
  sendFeeStatusSMS,
  sendTGCSubjectSMS,
};
