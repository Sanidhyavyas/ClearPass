// --- STATUS BADGE ---
const STATUS_STYLES = {
  pending:  { dot: "bg-amber-400",  pill: "bg-amber-50  text-amber-700  ring-amber-200"  },
  approved: { dot: "bg-green-500",  pill: "bg-green-50  text-green-700  ring-green-200"  },
  rejected: { dot: "bg-red-500",    pill: "bg-red-50    text-red-700    ring-red-200"    },
  default:  { dot: "bg-slate-400",  pill: "bg-slate-50  text-slate-700  ring-slate-200" },
};

function StatusBadge({ status }) {
  const key = (status || "pending").toLowerCase();
  const { dot, pill } = STATUS_STYLES[key] || STATUS_STYLES.default;
  const label = key.split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

export default StatusBadge;
