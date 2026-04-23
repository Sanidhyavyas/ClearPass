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
  { key: "overview",   label: "Overview",   caption: "Your clearance status" },
  { key: "documents",  label: "Documents",  caption: "Upload supporting files" },
  { key: "history",    label: "History",    caption: "Application timeline"   },
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
  const [status, setStatus]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
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

  const loadDocuments = useCallback(async () => {
    try {
      const res = await API.get("/api/upload/documents");
      setDocuments(res.data.documents || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadStatus(), loadHistory(), loadDocuments()]);
      setLoading(false);
    };
    init();
  }, [loadStatus, loadHistory, loadDocuments]);

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

  const formatBytes = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    const data = new FormData();
    selectedFiles.forEach((f) => data.append("files", f));
    try {
      setUploading(true);
      await API.post("/api/upload/documents", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      addToast(`${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} uploaded.`, "success");
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocuments();
    } catch (err) {
      addToast(err.response?.data?.message || "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;
    try {
      await API.delete(`/api/upload/documents/${docId}`);
      addToast("Document deleted.", "info");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete.", "error");
    }
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

                {/* Approval stage stepper */}
                {status?.request && (() => {
                  const STAGES = [
                    { key: "teacher", label: "Teacher" },
                    { key: "admin",   label: "Admin"   },
                    { key: "completed", label: "Completed" },
                  ];
                  const reqStage   = status.request.current_stage || "teacher";
                  const reqStatus  = status.request.status;
                  const activeIdx  = STAGES.findIndex((s) => s.key === reqStage);
                  const isRejected = reqStatus === "rejected";

                  return (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Approval pipeline</p>
                      <ol className="flex items-center gap-0">
                        {STAGES.map((stage, idx) => {
                          const isDone    = !isRejected && idx < activeIdx;
                          const isCurrent = idx === activeIdx;
                          const isLast    = idx === STAGES.length - 1;

                          const circleClass = isDone
                            ? "bg-green-500 text-white border-green-500"
                            : isCurrent && isRejected
                            ? "bg-red-500 text-white border-red-500"
                            : isCurrent
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-400 border-gray-200";

                          const labelClass = isDone
                            ? "text-green-700 font-semibold"
                            : isCurrent && isRejected
                            ? "text-red-600 font-semibold"
                            : isCurrent
                            ? "text-blue-700 font-semibold"
                            : "text-gray-400";

                          return (
                            <li key={stage.key} className={`flex items-center ${!isLast ? "flex-1" : ""}`}>
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold ${circleClass}`}>
                                  {isDone ? "✓" : idx + 1}
                                </div>
                                <span className={`text-xs mt-1 whitespace-nowrap ${labelClass}`}>{stage.label}</span>
                              </div>
                              {!isLast && (
                                <div className={`flex-1 h-0.5 mx-1 mb-4 ${isDone ? "bg-green-400" : "bg-gray-200"}`} />
                              )}
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  );
                })()}
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

          {/* ── DOCUMENTS ──────────────────────────────────────────── */}
          {activeKey === "documents" && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Documents</h2>
                <p className="text-sm text-gray-500 mt-0.5">Upload your ID card, fee receipt, and other supporting files (JPEG, PNG, PDF — max 5 MB each).</p>
              </div>

              {/* Upload area */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).slice(0, 5);
                    setSelectedFiles(files);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-500">
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
                      : "Drag & drop or click to select files"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Up to 5 files, 5 MB each</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                  />
                </div>

                {selectedFiles.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {selectedFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between text-gray-700">
                        <span className="truncate">{f.name}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{formatBytes(f.size)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  disabled={!selectedFiles.length || uploading}
                  onClick={handleUpload}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {uploading ? "Uploading…" : "Upload Files"}
                </button>
              </div>

              {/* Uploaded files list */}
              {documents.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 py-12 text-center shadow-sm">
                  <p className="text-sm text-gray-400">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-gray-50">
                      <tr>
                        {["File Name", "Size", "Uploaded", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-gray-50/60">
                          <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[180px]">{doc.file_name}</td>
                          <td className="px-4 py-3 text-gray-500">{formatBytes(doc.file_size)}</td>
                          <td className="px-4 py-3 text-gray-400">{formatDate(doc.uploaded_at)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id, doc.file_name)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
