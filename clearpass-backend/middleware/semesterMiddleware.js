/**
 * semesterMiddleware.js
 * Validates optional year/semester query params and attaches
 * parsed integers to req.semesterFilter for downstream use.
 */
const { YEARS, SEMESTERS } = require("../config/constants");

const validateSemesterParams = (req, res, next) => {
  const { year, semester } = req.query;

  if (year !== undefined) {
    const y = parseInt(year, 10);
    if (isNaN(y) || !YEARS.includes(y)) {
      return res.status(400).json({ message: `year must be one of ${YEARS.join(", ")}` });
    }
    req.query.year = y;
  }

  if (semester !== undefined) {
    const s = parseInt(semester, 10);
    if (isNaN(s) || !SEMESTERS.includes(s)) {
      return res.status(400).json({ message: `semester must be one of ${SEMESTERS.join(", ")}` });
    }
    req.query.semester = s;
  }

  return next();
};

module.exports = { validateSemesterParams };
