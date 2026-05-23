/**
 * ClearPass — Academic Structure Constants
 * Single source of truth for all year/semester values.
 * Import from here; never hardcode 3 or 6 anywhere.
 */

const YEARS     = [1, 2, 3, 4];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Returns which semester numbers belong to a given year.
 *   year 1 → [1, 2]
 *   year 2 → [3, 4]
 *   year 3 → [5, 6]
 *   year 4 → [7, 8]
 */
const semestersForYear = (year) => {
  const base = (year - 1) * 2;
  return [base + 1, base + 2];
};

/**
 * Returns which year a semester belongs to (e.g. semester 6 → year 3).
 */
const yearForSemester = (semester) => Math.ceil(semester / 2);

/**
 * Default legacy values — used only in migration seeding.
 */
const LEGACY_YEAR     = 3;
const LEGACY_SEMESTER = 6;

/**
 * All valid user roles.
 */
const ROLES = Object.freeze({
  STUDENT:     "student",
  TEACHER:     "teacher",
  ADMIN:       "admin",
  SUPER_ADMIN: "super_admin",
});

/**
 * Clearance request statuses.
 */
const CLEARANCE_STATUS = Object.freeze({
  PENDING:   "pending",
  APPROVED:  "approved",
  REJECTED:  "rejected",
  IN_REVIEW: "in_review",
  CLEARED:   "cleared",
});

/**
 * Authentication constants.
 * Import from here instead of hardcoding values in controllers.
 */
const JWT_EXPIRY    = process.env.JWT_EXPIRY    || "1h";   // access token lifetime
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "10", 10); // salt rounds

module.exports = { YEARS, SEMESTERS, semestersForYear, yearForSemester, LEGACY_YEAR, LEGACY_SEMESTER, ROLES, CLEARANCE_STATUS, JWT_EXPIRY, BCRYPT_ROUNDS };
