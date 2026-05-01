/**
 * SemesterSwitcher — year + semester dropdowns for teachers and admins.
 *
 * Props:
 *   year          {number|null}  currently selected year
 *   semester      {number|null}  currently selected semester
 *   onChange      {(year, semester) => void}
 *   allowedPairs  {Array<{year,semester}>|null}  restrict to these pairs (teacher view)
 *   className     {string}
 */
import { YEARS, semestersForYear } from "../utils/academicConfig";

export default function SemesterSwitcher({
  year,
  semester,
  onChange,
  allowedPairs = null,
  className   = "",
}) {
  // Which years are selectable?
  const availableYears = allowedPairs
    ? [...new Set(allowedPairs.map((p) => p.year))].sort((a, b) => a - b)
    : YEARS;

  // Which semesters are selectable given the current year?
  const availableSems = allowedPairs && year
    ? allowedPairs.filter((p) => p.year === year).map((p) => p.semester).sort((a, b) => a - b)
    : year
      ? semestersForYear(year)
      : [];

  const handleYearChange = (e) => {
    const newYear = e.target.value ? parseInt(e.target.value, 10) : null;
    // Reset semester if it no longer belongs to the new year
    const sems = newYear ? (allowedPairs
      ? allowedPairs.filter((p) => p.year === newYear).map((p) => p.semester)
      : semestersForYear(newYear)) : [];
    const newSemester = sems.includes(semester) ? semester : (sems[0] || null);
    onChange(newYear, newSemester);
  };

  const handleSemChange = (e) => {
    const newSem = e.target.value ? parseInt(e.target.value, 10) : null;
    onChange(year, newSem);
  };

  const selectCls =
    "text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
    "transition-all cursor-pointer shadow-sm";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Year selector */}
      <div className="relative">
        <select value={year || ""} onChange={handleYearChange} className={selectCls}>
          <option value="">All Years</option>
          {availableYears.map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
      </div>

      {/* Semester selector — only active if a year is chosen */}
      <div className="relative">
        <select
          value={semester || ""}
          onChange={handleSemChange}
          disabled={!year}
          className={`${selectCls} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">All Semesters</option>
          {availableSems.map((s) => (
            <option key={s} value={s}>Semester {s}</option>
          ))}
        </select>
      </div>

      {/* Clear button */}
      {(year || semester) && (
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
