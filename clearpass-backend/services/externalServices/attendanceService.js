/**
 * services/externalServices/attendanceService.js
 *
 * Abstraction layer for the Attendance system.
 * Replace mock logic with real HTTP calls when an attendance API is available.
 *
 * Environment variables:
 *   ATTENDANCE_API_URL — base URL for the attendance system
 *   ATTENDANCE_API_KEY — API key
 */

const db = require("../../db");

/**
 * Returns attendance data for a student.
 *
 * @returns {{ percentage: number, totalClasses: number, presentClasses: number, source: string }}
 */
async function getStudentAttendance(studentId) {
  // ── Option A: External attendance API ────────────────────────────────
  if (process.env.ATTENDANCE_API_URL) {
    return callExternalAttendanceApi(studentId);
  }

  // ── Option B: Mock — returns 100% until real API is wired ─────────────
  // Replace with a real DB query if you store attendance locally.
  return {
    percentage:     100,
    totalClasses:   0,
    presentClasses: 0,
    source:         "mock",
    details:        "Attendance system not yet integrated — assuming full attendance",
  };
}

async function callExternalAttendanceApi(studentId) {
  const axios = await import("axios").catch(() => null);
  if (!axios) throw new Error("axios not available for external attendance API");

  const res = await axios.default.get(
    `${process.env.ATTENDANCE_API_URL}/students/${studentId}/attendance`,
    { headers: { "x-api-key": process.env.ATTENDANCE_API_KEY || "" }, timeout: 5000 }
  );

  return {
    percentage:     Number(res.data.percentage     || 0),
    totalClasses:   Number(res.data.total_classes   || 0),
    presentClasses: Number(res.data.present_classes || 0),
    source:         "external_attendance_api",
    details:        res.data.message || "",
  };
}

module.exports = { getStudentAttendance };
