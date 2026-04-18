// StudentDashboard.js — Refined: clearance status, modules, history timeline
import { useCallback, useEffect, useRef, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const MODULE_META = {
  library:    { label: "Library",    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  accounts:   { label: "Accounts",   icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 14h.01M15 14h.01M9 14h.01M9 20H5a2 2 0 01-2-2V6a2 2 0 012-2h7l2 2h5a2 2 0 012 2v3" },
  hostel:     { label: "Hostel",     icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  department: { label: "Department", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9" },
};

const STATUS_STYLE = {
  approved:     { pill: "bg-green-100 text-green-800", border: "" },
  pending:      { pill: "bg-amber-100 text-amber-800", border: "" },
  rejected:     { pill: "bg-red-100 text-red-800",     border: "border-l-4 border-red-500" },
  not_required: { pill: "bg-gray-100 text-gray-600",   border: "" },
};

const TIMELINE_DOT = {
  approved:          "bg-green-500",
  rejected:          "bg-red-500",
  changes_requested: "bg-amber-500",
  submitted:         "bg-blue-500",
  resubmitted:       "bg-blue-400",
};

const navItems = [
  { key: "overview", label: "Overview", caption: "Your clearance status" },
  { key: "history",  label: "History",  caption: "Application timeline"   },
];

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || { pill: "bg-gray-100 text-gray-600", border: "" };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.pill}`}>
      {status?.replace("_", " ") || "—"}
    </span>
  );
}

function ModuleCard({ mod }) {
  const meta  = MODULE_META[mod.module_name] || {};
  const style = STATUS_STYLE[mod.status]     || STATUS_STYLE.pending;
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm ${style.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={meta.icon} />
          </svg>
        </div>
        <StatusPill status={mod.status} />
      </div>
      <p className="text-sm font-semibold text-gray-800">{meta.label || mod.module_name}</p>
      {mod.remarks && (
        <p className="text-xs text-gray-500 italic mt-1.5">{mod.remarks}</p>
      )}
      {mod.status === "rejected" && (
        <p className="text-xs text-red-600 font-medium mt-2">Action required</p>
      )}
      {mod.last_updated && (
        <p className="text-xs text-gray-400 mt-2">
          Updated {new Date(mod.last_updated).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { addToast } = useToast();

  const [activeKey, setActiveKey] = useState("overview");
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState(null);   // { request, modules, overall_progress, status_label }
  const [history, setHistory]     = useState([]);
  const prevStatusRef = useRef(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await API.get("/api/student/clearance/status");
      setStatus(res.data.data);
      return res.data.data;
    } catch { /* silent */ }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await API.get("/api/student/clearance/history");
      setHistory(res.data.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadHistory()]);
      setLoading(false);
    };
    init();
  }, [loadStatus, loadHistory]);

  // Poll every 15s for status changes and toast if something changed
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await API.get("/api/student/clearance/status");
        const data = res.data.data;

        if (prevStatusRef.current !== null) {
          const prev = prevStatusRef.current;
          // Check if any module changed
          (data?.modules || []).forEach((mod) => {
            const prevMod = prev?.modules?.find((m) => m.module_name === mod.module_name);
            if (prevMod && prevMod.status !== mod.status) {
              const meta = MODULE_META[mod.module_name]?.label || mod.module_name;
              addToast(`Your ${meta} clearance was ${mod.status}!`, mod.status === "approved" ? "success" : "error");
            }
          });
          // Check overall request status
          if (prev?.request?.status !== data?.request?.status) {
            addToast(`Your clearance request is now ${data?.request?.status}`, "info");
          }
        }

        prevStatusRef.current = data;
        setStatus(data);
      } catch { /* silent */ }
    };

    const interval = setInterval(poll, 15_000);
    return () => clearInterval(interval);
  }, [addToast]);

  const formatDate = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
  };

  const MODULE_NAMES = ["library", "accounts", "hostel", "department"];
  const allModules = MODULE_NAMES.map((name) => {
    const found = status?.modules?.find((m) => m.module_name === name);
    return found || { module_name: name, status: "pending", remarks: null, last_updated: null };
  });

  const progress    = status?.overall_progress ?? 0;
  const statusLabel = status?.status_label    ?? "In Progress";

  const progressColor =
    progress === 100       ? "#16A34A" :
    statusLabel === "Action Required" ? "#DC2626" : "#2563EB";

  return (
    <DashboardLayout
      title="Student"
      subtitle="Track your clearance progress"
      navItems={navItems}
      activeKey={activeKey}
      onNavigate={setActiveKey}
    >
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* ── OVERVIEW ───────────────────────────────────────────── */}
          {activeKey === "overview" && (
            <div className="space-y-6">

              {/* Clearance Status Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Your clearance status</h2>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Overall progress</span>
                  <span className="font-bold text-gray-900">{progress}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, backgroundColor: progressColor }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    statusLabel === "Fully Cleared"    ? "bg-green-100 text-green-800" :
                    statusLabel === "Action Required"  ? "bg-red-100 text-red-800" :
                                                         "bg-blue-100 text-blue-800"
                  }`}>
                    {statusLabel}
                  </span>
                  {status?.request?.updated_at && (
                    <span className="text-xs text-gray-400">
                      Updated {formatDate(status.request.updated_at)}
                    </span>
                  )}
                </div>
              </div>

              {/* Module Cards 2×2 Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Module breakdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  {allModules.map((mod) => (
                    <ModuleCard key={mod.module_name} mod={mod} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TIMELINE ───────────────────────────────────── */}
          {activeKey === "history" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Application History</h2>
                <p className="text-sm text-gray-500 mt-0.5">All actions taken on your clearance request.</p>
              </div>

              {history.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 py-16 text-center shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">No history yet</p>
                  <p className="text-xs text-gray-400 mt-1">Actions on your request will appear here.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="relative pl-6">
                    <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-5">
                      {history.map((log, i) => (
                        <div key={log.id || i} className="relative">
                          <div className={`absolute -left-4 mt-1.5 w-3 h-3 rounded-full border-2 border-white ${TIMELINE_DOT[log.action] || "bg-gray-400"}`} />
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {log.action?.replace(/_/g, " ")}
                          </p>
                          {log.performer_name && (
                            <p className="text-sm text-gray-600">
                              by {log.performer_name}
                              {log.performer_role ? ` (${log.performer_role})` : ""}
                            </p>
                          )}
                          {log.remarks && (
                            <p className="text-sm text-gray-500 italic mt-0.5">"{log.remarks}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.timestamp)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
