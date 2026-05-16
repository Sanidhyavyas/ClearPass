/**
 * SemesterBadge — colorful pill showing Year / Semester.
 * Usage: <SemesterBadge year={3} semester={6} />
 */
const YEAR_COLORS = [
  "from-violet-500 to-purple-600",   // Year 1
  "from-blue-500 to-indigo-600",     // Year 2
  "from-emerald-500 to-teal-600",    // Year 3
  "from-orange-500 to-amber-600",    // Year 4
];

export default function SemesterBadge({ year, semester, size = "md" }) {
  if (!year && !semester) return null;

  const gradient = YEAR_COLORS[(year - 1) % YEAR_COLORS.length] || YEAR_COLORS[0];

  const sizeMap = {
    xs: "text-[9px]  px-1.5 py-0.5 gap-0.5",
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  const cls = sizeMap[size] || sizeMap.md;
  const ariaLabel = [year && `Year ${year}`, semester && `Semester ${semester}`].filter(Boolean).join(", ");

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold text-white bg-gradient-to-r ${gradient} ${cls} shadow-sm`}
      aria-label={ariaLabel}
    >
      {year  && <span>Yr {year}</span>}
      {year  && semester && <span className="opacity-60">·</span>}
      {semester && <span>Sem {semester}</span>}
    </span>
  );
}
