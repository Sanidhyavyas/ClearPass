// StudentDashboard.js — Refined: clearance status, modules, history timeline
import { useCallback, useEffect, useRef, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import SemesterBadge from "../components/SemesterBadge";
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
  { key: "term-grant",  label: "Term Grant",  caption: "Certificate status"     },
  { key: "assignments", label: "Assignments", caption: "Your assignments"        },
  { key: "documents",   label: "Documents",   caption: "Upload supporting files" },
  { key: "history",     label: "History",     caption: "Application timeline"    },
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

  const [activeKey, setActiveKey] = useState("term-grant"); // CHANGED: default to TGC tab
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState(null);
  const [history, setHistory]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile]     = useState(null); // ADDED: student_code + tgc
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const prevStatusRef = useRef(null);
  // ADDED: TGC state
  const [tgcData, setTgcData]             = useState(null);
  const [tgcLoading, setTgcLoading]       = useState(false);
  const [tgcRequesting, setTgcRequesting] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState({});

  // ADDED: Assignments state
  const [assignmentSubjects, setAssignmentSubjects] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [uploadingAssignId,  setUploadingAssignId]  = useState(null);

  const loadProfile = useCallback(async () => { // ADDED
    try {
      const res = await API.get("/api/student/profile");
      setProfile(res.data.data);
    } catch { /* silent */ }
  }, []);

  // ADDED: load TGC certificate status
  const loadTGC = useCallback(async () => {
    try {
      setTgcLoading(true);
      const res = await API.get("/api/certificate/my-status");
      setTgcData(res.data);
    } catch { /* silent */ } finally {
      setTgcLoading(false);
    }
  }, []);

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
      await Promise.all([loadStatus(), loadHistory(), loadDocuments(), loadProfile(), loadTGC()]); // ADDED: loadTGC
      setLoading(false);
    };
    init();
  }, [loadStatus, loadHistory, loadDocuments, loadProfile, loadTGC]); // ADDED: loadTGC dep

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

  // ADDED: load assignments when tab active
  const loadAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const res = await API.get("/api/assignments/student/all");
      setAssignmentSubjects(res.data.subjects || []);
    } catch { /* silent */ } finally { setAssignmentsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeKey === "assignments") loadAssignments();
  }, [activeKey, loadAssignments]);

  const handleSubmitAssignment = async (assignmentId) => {
    const input = document.getElementById(`assign-file-${assignmentId}`);
    if (!input?.files?.length) return;
    const formData = new FormData();
    formData.append("file", input.files[0]);
    try {
      setUploadingAssignId(assignmentId);
      await API.post(`/api/assignments/${assignmentId}/submit`, formData);
      addToast("Submission uploaded!", "success");
      input.value = "";
      loadAssignments();
    } catch (err) {
      addToast(err.response?.data?.message || "Upload failed", "error");
    } finally { setUploadingAssignId(null); }
  };

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await API.delete(`/api/assignments/submissions/${submissionId}`);
      addToast("Submission deleted", "info");
      loadAssignments();
    } catch (err) {
      addToast(err.response?.data?.message || "Delete failed", "error");
    }
  };

  // ADDED: TGC request handler
  const handleRequestTGC = async () => {
    try {
      setTgcRequesting(true);
      await API.post("/api/certificate/request", { semester: profile?.semester ?? 6, academic_year: "2025-26" });
      addToast("Certificate request submitted!", "success");
      loadTGC();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to submit request.", "error");
    } finally {
      setTgcRequesting(false);
    }
  };

  // ADDED: download TGC PDF
  const handleDownloadTGC = async () => {
    try {
      const studentId = profile?.id || "me";
      const res = await API.get(`/api/certificate/${studentId}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a   = document.createElement("a");
      a.href     = url;
      a.download = "Term_Grant_Certificate.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      addToast(err.response?.data?.message || "Certificate not ready for download.", "error");
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
          {/* ── TERM GRANT CERTIFICATE ─────────────────────────────── */}
          {activeKey === "term-grant" && (
            <div className="space-y-5">

              {/* Student Info Card */}
              <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                      {(profile?.name || "S").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-lg leading-tight">{profile?.name || "—"}</p>
                      <p className="text-blue-200 text-sm">{profile?.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap items-center">
                    {[
                      ["AY",         "2025-26"],
                      ["Roll No.",   profile?.roll_number  || "—"],
                      ["Student ID", profile?.student_code || "—"],
                    ].map(([label, val]) => (
                      <div key={label} className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[70px]">
                        <p className="text-[10px] text-blue-200 uppercase tracking-wide font-medium">{label}</p>
                        <p className="text-sm font-bold mt-0.5">{val}</p>
                      </div>
                    ))}
                    {profile?.year && profile?.semester && (
                      <div className="bg-white/15 rounded-xl px-3 py-2 text-center">
                        <p className="text-[10px] text-blue-200 uppercase tracking-wide font-medium">Year / Sem</p>
                        <div className="mt-1">
                          <SemesterBadge year={profile.year} semester={profile.semester} size="sm" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {tgcLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}
                </div>
              ) : !tgcData?.certificate ? (
                /* No request yet */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-800">Term Grant Certificate</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5">Submit your request to start the TGC clearance process{profile?.semester ? ` for Semester ${profile.semester}` : ""}.</p>
                  <button
                    type="button"
                    onClick={handleRequestTGC}
                    disabled={tgcRequesting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors"
                  >
                    {tgcRequesting ? "Submitting…" : "Request Term Grant Certificate"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Overall Status Banner */}
                  {(() => {
                    const cert  = tgcData.certificate;
                    const total = tgcData.total_count || 0;
                    const appr  = tgcData.approved_count || 0;
                    const pct   = total > 0 ? Math.round((appr / total) * 100) : 0;
                    const statusCfg = {
                      approved: { bg: "bg-green-50 border-green-200", bar: "bg-green-500",  pill: "bg-green-100 text-green-800",  label: "All Approved ✓" },
                      rejected: { bg: "bg-red-50 border-red-200",     bar: "bg-red-500",    pill: "bg-red-100 text-red-700",      label: "Rejected" },
                      pending:  { bg: "bg-amber-50 border-amber-200", bar: "bg-blue-500",   pill: "bg-amber-100 text-amber-800",  label: "In Progress" },
                    };
                    const cfg = statusCfg[cert.overall_status] || statusCfg.pending;
                    return (
                      <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">Term Grant Certificate</p>
                            <p className="text-xs text-gray-500 mt-0.5">Semester {cert.semester} · {cert.academic_year}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${cfg.pill}`}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                          <span>{appr}/{total} subjects approved</span>
                          <span className="font-bold">{pct}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Subject-wise Clearance Matrix (tabular) */}
                  {(() => {
                    const subjects = tgcData?.subjects || [];
                    // Collect all unique checklist item names (in order of first appearance)
                    const colHeaders = [];
                    const seenCols = new Set();
                    subjects.forEach(sub => {
                      (sub.checklist || []).forEach(item => {
                        if (!seenCols.has(item.item_name)) {
                          seenCols.add(item.item_name);
                          colHeaders.push({ name: item.item_name, type: item.item_type });
                        }
                      });
                    });
                    return (
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-gray-800">Subject-wise Clearance Status</h3>
                          <span className="text-xs text-gray-400">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</span>
                        </div>
                        {subjects.length === 0 ? (
                          <p className="p-6 text-sm text-gray-400 text-center">No subjects found.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-gray-700 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[150px] border-r border-gray-100">
                                    Subject
                                  </th>
                                  {colHeaders.map(col => (
                                    <th key={col.name} className="px-3 py-3 text-center text-gray-500 font-medium min-w-[90px]">
                                      <span className="block truncate max-w-[90px]" title={col.name}>{col.name}</span>
                                      <span className="text-gray-300 text-[9px]">[{col.type}]</span>
                                    </th>
                                  ))}
                                  <th className="px-3 py-3 text-center text-gray-600 font-semibold min-w-[90px]">Teacher</th>
                                  <th className="px-3 py-3 text-center text-gray-600 font-semibold min-w-[80px]">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {subjects.map(sub => {
                                  const itemByName = {};
                                  (sub.checklist || []).forEach(item => { itemByName[item.item_name] = item; });
                                  return (
                                    <tr key={sub.subject_id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-100">
                                        <p className="font-semibold text-gray-800 leading-tight">{sub.subject_name}</p>
                                        <p className="text-gray-400 text-[10px] mt-0.5">
                                          {sub.subject_code}{sub.type ? ` · ${sub.type}` : ""}
                                        </p>
                                      </td>
                                      {colHeaders.map(col => {
                                        const item = itemByName[col.name];
                                        if (!item) return (
                                          <td key={col.name} className="px-3 py-3 text-center text-gray-200 text-sm">—</td>
                                        );
                                        const icon = item.status === "completed" ? "✅" : item.status === "waived" ? "⬜" : "❌";
                                        return (
                                          <td key={col.name} className="px-3 py-3 text-center" title={`${item.item_name}: ${item.status || "pending"}`}>
                                            <span className="text-sm leading-none">{icon}</span>
                                          </td>
                                        );
                                      })}
                                      <td className="px-3 py-3 text-center text-gray-500 font-medium text-[11px]">
                                        {sub.teacher_name
                                          ? <span title={sub.teacher_name}>{sub.teacher_name.split(" ").slice(0, 2).join(" ")}</span>
                                          : "—"}
                                      </td>
                                      <td className="px-3 py-3 text-center">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                          sub.status === "approved" ? "bg-green-100 text-green-700"
                                          : sub.status === "rejected" ? "bg-red-100 text-red-700"
                                          : "bg-amber-100 text-amber-700"
                                        }`}>
                                          {sub.status || "pending"}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Fee Status */}
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "Fee Cleared", val: tgcData.certificate?.fee_cleared, yes: "Cleared ✅", no: "Pending ❌" },
                    ].map(({ label, val, yes, no }) => (
                      <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
                        <p className={`text-sm font-bold ${val ? "text-green-700" : "text-red-600"}`}>
                          {val ? yes : no}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Download Button */}
                  {(() => {
                    const cert         = tgcData.certificate;
                    const isApproved   = cert?.overall_status === "approved";
                    const isFeeCleared = !!cert?.fee_cleared;
                    const canDownload  = isApproved && isFeeCleared;

                    let bgCls  = "bg-gray-50 border-gray-200";
                    let msg    = "";
                    if (!isApproved) {
                      msg   = `Waiting for ${(tgcData.total_count || 0) - (tgcData.approved_count || 0)} more subject(s) to be approved.`;
                    } else if (!isFeeCleared) {
                      bgCls = "bg-amber-50 border-amber-200";
                      msg   = "Clearance approved ✓ — waiting for fees verification to enable download.";
                    } else {
                      bgCls = "bg-green-50 border-green-200";
                      msg   = "All cleared! Your certificate is ready to download.";
                    }

                    return (
                      <div className={`rounded-xl border p-5 flex items-center justify-between gap-4 ${bgCls}`}>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Term Grant Certificate PDF</p>
                          <p className={`text-xs mt-0.5 ${canDownload ? "text-green-700 font-medium" : isApproved ? "text-amber-700" : "text-gray-500"}`}>
                            {msg}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!canDownload}
                          onClick={handleDownloadTGC}
                          className="shrink-0 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
                        >
                          📄 Download Certificate
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
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
          {activeKey === "assignments" && (
            <div className="space-y-4">
              {assignmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3 mb-3" />
                      <div className="space-y-2">
                        {[1, 2].map(j => <div key={j} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : assignmentSubjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-sm text-gray-400">
                  No assignments yet. They will appear here once your teacher posts them.
                </div>
              ) : (
                assignmentSubjects.map(subject => (
                  <div key={subject.subject_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 bg-slate-50 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{subject.subject_name}</p>
                      <p className="text-xs text-gray-400">{subject.subject_code}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {subject.assignments.map(asgn => {
                        const status = asgn.submission_status;
                        const statusColor =
                          status === "accepted" ? "bg-green-100 text-green-700" :
                          status === "rejected" ? "bg-red-100 text-red-700"    :
                          status === "submitted" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-500";
                        const statusLabel =
                          status === "accepted" ? "Accepted ✓" :
                          status === "rejected" ? "Rejected ✗" :
                          status === "submitted" ? "Submitted" :
                          "Not Submitted";

                        return (
                          <div key={asgn.id} className="px-5 py-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900">{asgn.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  by {asgn.teacher_name}
                                  {asgn.due_date && ` · Due ${new Date(asgn.due_date).toLocaleDateString("en-IN")}`}
                                </p>
                                {asgn.description && (
                                  <p className="text-xs text-gray-500 mt-1">{asgn.description}</p>
                                )}
                              </div>
                              <span className={`shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColor}`}>
                                {statusLabel}
                              </span>
                            </div>

                            {/* Rejection remark */}
                            {status === "rejected" && asgn.remarks && (
                              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                                <span className="font-semibold">Remark:</span> {asgn.remarks}
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 mt-1">
                              {/* Upload/re-upload input */}
                              {status !== "accepted" && (
                                <>
                                  <input
                                    id={`assign-file-${asgn.id}`}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    className="hidden"
                                    onChange={() => handleSubmitAssignment(asgn.id)}
                                  />
                                  <label
                                    htmlFor={`assign-file-${asgn.id}`}
                                    className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                      uploadingAssignId === asgn.id
                                        ? "bg-gray-200 text-gray-500 cursor-wait"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                  >
                                    {uploadingAssignId === asgn.id ? "Uploading…" :
                                     status === "rejected" ? "Re-upload" : "Upload"}
                                  </label>
                                </>
                              )}

                              {/* Delete button — only if pending review */}
                              {status === "submitted" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSubmission(asgn.submission_id)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                >
                                  Delete
                                </button>
                              )}

                              {/* Submitted file info */}
                              {asgn.file_name && (
                                <span className="text-xs text-gray-400 self-center truncate max-w-[140px]" title={asgn.file_name}>
                                  {asgn.file_name}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
