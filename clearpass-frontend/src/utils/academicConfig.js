/**
 * ClearPass Frontend — Academic Structure Config
 * Single source of truth for year/semester values.
 * Import from here; never hardcode 3 or 6 in UI code.
 */

export const YEARS     = [1, 2, 3, 4];
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/** Semesters that belong to a given year (e.g. year 3 → [5, 6]) */
export const semestersForYear = (year) => {
  const base = (year - 1) * 2;
  return [base + 1, base + 2];
};

/** Year a semester belongs to (e.g. semester 6 → year 3) */
export const yearForSemester = (semester) => Math.ceil(semester / 2);

/**
 * Human-readable label for a year/semester combination.
 * e.g.  yearSemLabel(3, 6) → "Year 3 — Semester 6"
 */
export const yearSemLabel = (year, semester) =>
  year && semester ? `Year ${year} — Semester ${semester}` : "—";

/** All (year, semester) combos as a flat array for dropdowns */
export const ALL_SEMESTER_OPTIONS = YEARS.flatMap((y) =>
  semestersForYear(y).map((s) => ({ year: y, semester: s, label: yearSemLabel(y, s) }))
);
