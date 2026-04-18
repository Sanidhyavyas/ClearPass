// StudentDetailDrawer.js — Right-side drawer with full request detail
import { useEffect, useState } from "react";
import API from "../services/api";
import { useToast } from "../context/ToastContext";

const MODULE_META = {
  library:    { label: "Library",    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  accounts:   { label: "Accounts",   icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 14h.01M15 14h.01M9 14h.01M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h7l2 2h5a2 2 0 012 2v3" },
  hostel:     { label: "Hostel",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  department: { label: "Department", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" },
};

const STATUS_COLORS = {
  approved:     "bg-green-100 text-green-800",
  pending:      "bg-amber-100 text-amber-800",
  rejected:     "bg-red-100 text-red-800",
  not_required: "bg-gray-100 text-gray-600",
};

const AUDIT_COLORS = {
  approved:          "bg-green-500",
  rejected:          "bg-red-500",
  changes_requested: "bg-amber-500",
  submitted:         "bg-blue-500",
  resubmitted:       "bg-blue-400",
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace("_", " ") || "—"}
    </span>
  );
}

function DocumentPreview({ docs }) {
  const [preview, setPreview] = useState(null);
  if (!docs || !Array.isArray(docs) || docs.length === 0) {
    return <p className="text-sm text-gray-400 italic">No documents uploaded</p>;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {docs.map((url, i) => {
          const isPdf = typeof url === "string" && url.toLowerCase().endsWith(".pdf");
          const name  = url.split("/").pop();
          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3 flex items-center gap-2 hover:bg-gray-50">
              <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                {isPdf ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <img src={url} alt={name} className="w-8 h-8 object-cover rounded" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
                <button type="button" onClick={() => setPreview({ url, isPdf })} className="text-xs text-blue-600 hover:underline">Preview</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-screen document preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setPreview(null)}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-700">{preview.url.split("/").pop()}</p>
              <button type="button" onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="h-[75vh]">
              {preview.isPdf ? (
                <iframe src={preview.url} className="w-full h-full" title="Document preview" />
              ) : (
                <img src={preview.url} alt="Preview" className="w-full h-full object-contain p-4" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Props:
 *   requestId — int
 *   onClose   — () => void
 *   onApprove — (requestId) => void
 *   onReject  — (request) => void
 */
export default function StudentDetailDrawer({ requestId, onClose, onApprove, onReject }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    setLoading(true);
    API.get(`/api/teacher/requests/${requestId}`)
      .then((res) => setData(res.data.data))
      .catch(() => { addToast("Failed to load request details", "error"); onClose(); })
      .finally(() => setLoading(false));
  }, [requestId]); // eslint-disable-line

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return "—"; }
  };

  const initials = (name) =>
    (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const progress = () => {
    if (!data?.modules) return 0;
    const approved = data.modules.filter((m) => m.status === "approved" || m.status === "not_required").length;
    return Math.round((approved / 4) * 100);
  };

  const isActioned = data?.status === "approved" || data?.status === "rejected";

  const docs = (() => {
    try {
      if (!data?.documents) return [];
      return typeof data.documents === "string" ? JSON.parse(data.documents) : data.documents;
    } catch { return []; }
  })();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 w-full sm:w-[480px] bg-white shadow-2xl flex flex-col"
        style={{ transform: "translateX(0)", transition: "transform 0.3s ease" }}
        role="dialog"
        aria-label="Student request details"
      >
        {/* Close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Request Details</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close drawer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Section 1: Student Profile ── */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {initials(data?.student_name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{data?.student_name || "—"}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {data?.roll_number && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{data.roll_number}</span>
                      )}
                      {data?.department && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{data.department}</span>
                      )}
                      {data?.semester && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Sem {data.semester}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Overall clearance progress</span>
                    <span className="font-semibold">{progress()}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress()}%`,
                        backgroundColor: progress() === 100 ? "#16A34A" : "#2563EB",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Module Status Grid ── */}
              <div className="px-6 py-5 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Status</h4>
                <div className="grid grid-cols-2 gap-3">
                  {(data?.modules?.length ? data.modules : Object.keys(MODULE_META).map((k) => ({ module_name: k, status: "pending" }))).map((mod) => {
                    const meta = MODULE_META[mod.module_name] || {};
                    return (
                      <div key={mod.module_name} className="border border-gray-100 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
                            </svg>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                        </div>
                        <StatusBadge status={mod.status} />
                        {mod.remarks && (
                          <p className="text-xs text-gray-500 italic mt-1.5 line-clamp-2">{mod.remarks}</p>
                        )}
                        {mod.last_updated && (
                          <p className="text-xs text-gray-400 mt-1">{formatDate(mod.last_updated)}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Section 3: Documents ── */}
              <div className="px-6 py-5 border-b border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Uploaded Documents</h4>
                <DocumentPreview docs={docs} />
              </div>

              {/* ── Section 4: Audit History Timeline ── */}
              <div className="px-6 py-5">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">Clearance History</h4>
                {(!data?.auditLog || data.auditLog.length === 0) ? (
                  <p className="text-sm text-gray-400 italic">No history yet</p>
                ) : (
                  <div className="relative pl-5">
                    {/* Vertical line */}
                    <div className="absolute left-1.5 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {data.auditLog.map((log, i) => (
                        <div key={log.id || i} className="relative flex gap-3">
                          {/* Dot */}
                          <div className={`absolute -left-3.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white ${AUDIT_COLORS[log.action] || "bg-gray-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-800 capitalize">
                              {log.action?.replace("_", " ")}
                            </p>
                            {log.performer_name && (
                              <p className="text-xs text-gray-500">by {log.performer_name}</p>
                            )}
                            {log.remarks && (
                              <p className="text-xs text-gray-600 italic mt-0.5">{log.remarks}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 5: Action Footer (fixed at bottom) ── */}
            <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 bg-white">
              {data?.status === "approved" ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800 font-medium">
                    Approved on {formatDate(data.approved_at)}
                  </p>
                </div>
              ) : data?.status === "rejected" ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 font-medium">
                    Rejected on {formatDate(data.rejected_at)}
                  </p>
                  {data.rejection_reason && (
                    <p className="text-xs text-red-700 mt-1 italic">{data.rejection_reason}</p>
                  )}
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { onApprove(data.id); onClose(); }}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    ✓ Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => { onReject(data); onClose(); }}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
