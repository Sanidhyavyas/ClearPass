// RequestsTable.js — Requests table with pagination, skeleton, empty state

function StatusPill({ status, isOverdue }) {
  if (isOverdue && status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
        </span>
        Overdue
      </span>
    );
  }
  const map = {
    pending:  "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  };
  const dot = { pending: "bg-amber-500", approved: "bg-green-500", rejected: "bg-red-500" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[status] || "bg-gray-400"}`} />
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function Avatar({ name, department }) {
  // Color avatar by first letter of department
  const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-amber-500", "bg-red-500", "bg-indigo-500"];
  const idx    = (department || name || "A").charCodeAt(0) % colors.length;
  const initials = (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${colors[idx]}`}>
      {initials}
    </div>
  );
}

/**
 * Props:
 *   requests     — array of request objects
 *   loading      — boolean
 *   page         — current page number
 *   totalCount   — total records
 *   limit        — records per page
 *   onPageChange — (page) => void
 *   onApprove    — (requestId) => void
 *   onReject     — (request) => void
 *   onView       — (request) => void
 */
export default function RequestsTable({ requests, loading, page, totalCount, limit, onPageChange, onApprove, onReject, onView }) {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  const from       = (page - 1) * limit + 1;
  const to         = Math.min(page * limit, totalCount);

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return "—"; }
  };

  const relativeTime = (d) => {
    if (!d) return "";
    try {
      const diff = Date.now() - new Date(d).getTime();
      const mins  = Math.floor(diff / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch { return ""; }
  };

  const isDeadlinePast = (d) => {
    if (!d) return false;
    try { return new Date(d).getTime() < Date.now(); }
    catch { return false; }
  };

  // Page numbers to show (max 5 around current)
  const pageNumbers = () => {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end   = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Sticky header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Student", "Department", "Sem / Year", "Submitted", "Deadline", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-500">No requests found</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                </td>
              </tr>
            ) : (
              requests.map((r) => {
                const deadlinePast = isDeadlinePast(r.deadline);
                const actioned     = r.status === "approved" || r.status === "rejected";
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors duration-150">
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.student_name} department={r.department} />
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{r.student_name || "—"}</p>
                          <p className="text-xs text-gray-400">{r.roll_number || r.student_email || "—"}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{r.department || "—"}</span>
                    </td>

                    {/* Sem / Year */}
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {r.semester ? `Sem ${r.semester}` : "—"}{r.year ? ` / Year ${r.year}` : ""}
                    </td>

                    {/* Submitted */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm text-gray-700">{formatDate(r.submitted_at)}</p>
                      <p className="text-xs text-gray-400">{relativeTime(r.submitted_at)}</p>
                    </td>

                    {/* Deadline */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.deadline ? (
                        <div>
                          <p className={`text-sm font-medium ${deadlinePast ? "text-red-600" : "text-gray-700"}`}>
                            {formatDate(r.deadline)}
                          </p>
                          {deadlinePast && r.status === "pending" && (
                            <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Overdue</span>
                          )}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusPill status={r.status} isOverdue={r.is_overdue} />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {actioned ? (
                        <span className="text-xs text-gray-400 italic">Actioned</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onApprove(r.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-colors"
                            title="Approve"
                          >
                            ✓ Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(r)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            ✗ Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => onView(r)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            title="View details"
                          >
                            ⋯ View
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-500">
            Showing {from}–{to} of {totalCount} results
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {pageNumbers().map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                  n === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-600 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-2.5 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
