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

module.exports = { YEARS, SEMESTERS, semestersForYear, yearForSemester, LEGACY_YEAR, LEGACY_SEMESTER };
