// --- ADMIN DASHBOARD ---
import { useEffect, useState } from "react";

import { ModuleAvgChart, ModuleBarChart, StatusBarChart, UserPieChart } from "../components/ChartCard";
import DashboardLayout from "../components/DashboardLayout";
import { SkeletonCard, SkeletonTableRows } from "../components/LoadingSkeleton";
import StatusBadge from "../components/StatusBadge";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [
  { key: "overview",   label: "Overview",        caption: "System-wide request and user stats"       },
  { key: "analytics", label: "Analytics",       caption: "Module stats and approval time charts"    },
  { key: "finalize",  label: "Finalize Queue",  caption: "Requests awaiting final admin approval"   },
  { key: "users",     label: "Users",           caption: "Browse all registered accounts"           },
  { key: "requests",  label: "All Requests",    caption: "Filter and monitor every request"         },
  { key: "assign",    label: "Assign Teachers", caption: "Route requests to available teachers"     },
  { key: "audit",     label: "Audit Log",       caption: "Track all approval and assignment actions" },
];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150";

function StatCard({ label, value, color = "default", icon }) {
  const colorMap = {
    default: { text: "text-slate-900", icon: "bg-slate-100 text-slate-600" },
    blue:    { text: "text-blue-700",  icon: "bg-blue-50 text-blue-600"    },
    amber:   { text: "text-amber-700", icon: "bg-amber-50 text-amber-600"  },
    green:   { text: "text-green-700", icon: "bg-green-50 text-green-600"  },
    red:     { text: "text-red-700",   icon: "bg-red-50 text-red-600"      },
    purple:  { text: "text-purple-700",icon: "bg-purple-50 text-purple-600"},
  };
  const s = colorMap[color] || colorMap.default;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.icon} mb-3`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <p className={`text-3xl font-bold ${s.text}`}>{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

function AdminDashboard() {
  const [activeKey, setActiveKey] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [pendingFinal, setPendingFinal] = useState([]);
  const [finalizing, setFinalizing] = useState(null);
  const [finalRemarks, setFinalRemarks] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [assignmentMap, setAssignmentMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, usersRes, requestsRes, teachersRes] = await Promise.allSettled([
        API.get("/dashboard"),
        API.get("/users"),
        API.get("/all-requests"),
        API.get("/teachers"),
      ]);
      const dashData = dashRes.status === "fulfilled" ? dashRes.value.data : null;
      const usersData = usersRes.status === "fulfilled" ? usersRes.value.data.users || [] : [];
      const requestsData = requestsRes.status === "fulfilled" ? requestsRes.value.data.requests || [] : [];
      const teachersData = teachersRes.status === "fulfilled" ? teachersRes.value.data.teachers || [] : [];
      setDashboard(dashData);
      setUsers(usersData);
      setRequests(requestsData);
      setTeachers(teachersData);
      setAssignmentMap(requestsData.reduce((acc, r) => { acc[r.id] = r.assigned_teacher_id || ""; return acc; }, {}));
      const errors = [dashRes, usersRes, requestsRes, teachersRes].filter((r) => r.status === "rejected").map((r) => r.reason?.response?.data?.message || r.reason?.message).filter(Boolean);
      if (errors.length > 0) addToast(errors[0], "error");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load admin dashboard.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await API.get("/api/audit-logs");
      setAuditLogs(res.data.logs || []);
    } catch { addToast("Could not load audit logs.", "warning"); }
    finally { setAuditLoading(false); }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await API.get("/api/analytics/overview");
      setAnalytics(res.data);
    } catch { addToast("Could not load analytics.", "warning"); }
    finally { setAnalyticsLoading(false); }
  };

  const loadPendingFinal = async () => {
    try {
      const res = await API.get("/api/clearance/pending-final");
      setPendingFinal(res.data.data || []);
    } catch { addToast("Could not load finalize queue.", "warning"); }
  };

  const handleFinalize = async (requestId, status) => {
    const remarks = finalRemarks[requestId] || "";
    if (status === "rejected" && !remarks.trim()) {
      addToast("Please provide a rejection reason.", "warning"); return;
    }
    try {
      setFinalizing(requestId);
      await API.patch(`/api/clearance/${requestId}/finalize`, { status, remarks });
      addToast(status === "approved" ? "Certificate issued and email sent." : "Request rejected.", status === "approved" ? "success" : "info");
      await loadPendingFinal();
    } catch (err) {
      addToast(err.response?.data?.message || "Finalize failed.", "error");
    } finally { setFinalizing(null); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "audit" && auditLogs.length === 0) loadAuditLogs(); }, [activeKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "analytics" && !analytics) loadAnalytics(); }, [activeKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "finalize") loadPendingFinal(); }, [activeKey]);

  const handleAssignTeacher = async (requestId) => {
    const teacherId = assignmentMap[requestId];
    if (!teacherId) { addToast("Please choose a teacher before assigning.", "warning"); return; }
    try {
      setAssigningId(requestId);
      await API.put(`/assign-teacher/${requestId}`, { assignedTeacherId: teacherId });
      addToast("Teacher assigned successfully.", "success");
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to assign teacher.", "error");
    } finally { setAssigningId(null); }
  };

  const filteredRequests = requests.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || r.student_name.toLowerCase().includes(q) || r.student_email.toLowerCase().includes(q) || (r.assigned_teacher_name || "").toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || r.status === statusFilter);
  });

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchSearch && (roleFilter === "all" || u.role === roleFilter);
  });

  const unassignedRequests = filteredRequests.filter((r) => !r.assigned_teacher_id);
  const stats = dashboard?.stats || {};
  const user = dashboard?.user;
  const totalStudents  = Number(stats.totalStudents  ?? users.filter((u) => u.role === "student").length);
  const totalTeachers  = Number(stats.totalTeachers  ?? users.filter((u) => u.role === "teacher").length);
  const totalAdmins    = Number(stats.totalAdmins    ?? users.filter((u) => u.role === "admin").length);
  const totalUsers     = Number(stats.totalUsers     ?? users.length);
  const totalRequests  = Number(stats.totalRequests  ?? requests.length);
  const pendingReqs    = Number(stats.pendingRequests  ?? requests.filter((r) => r.status === "pending").length);
  const approvedReqs   = Number(stats.approvedRequests ?? requests.filter((r) => r.status === "approved").length);
  const rejectedReqs   = Number(stats.rejectedRequests ?? requests.filter((r) => r.status === "rejected").length);

  const headerActions = (
    <button type="button" onClick={loadData} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 text-sm" aria-label="Refresh dashboard data">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      Refresh System
    </button>
  );

  const THead = ({ cols }) => (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50/60">
        {cols.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{c}</th>)}
      </tr>
    </thead>
  );

  return (
    <DashboardLayout
      title="Admin"
      subtitle="Oversee the whole clearance workflow."
      user={user}
      navItems={navItems}
      activeKey={activeKey}
      onNavigate={setActiveKey}
      headerActions={headerActions}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}</div>
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeKey === "overview" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">System Overview</h1>
                <p className="text-green-100 text-sm mt-1">{totalRequests} total requests · {pendingReqs} pending · {totalUsers} users</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users"   value={totalUsers}    icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                <StatCard label="Students"      value={totalStudents} color="blue"   icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                <StatCard label="Teachers"      value={totalTeachers} color="amber"  icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                <StatCard label="Admins"        value={totalAdmins}   color="purple" icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                <StatCard label="Total Requests" value={totalRequests} icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                <StatCard label="Pending"       value={pendingReqs}  color="amber" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Approved"      value={approvedReqs} color="green" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                <StatCard label="Rejected"      value={rejectedReqs} color="red"   icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StatusBarChart pending={pendingReqs} approved={approvedReqs} rejected={rejectedReqs} />
                <UserPieChart students={totalStudents} teachers={totalTeachers} admins={totalAdmins} />
              </div>
            </div>
          )}

          {/* ANALYTICS */}
          {activeKey === "analytics" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-indigo-100 text-sm mt-1">Module-wise clearance metrics and approval time.</p>
              </div>
              {analyticsLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1,2,3,4].map((i) => <SkeletonCard key={i} />)}</div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Students"  value={analytics.total_students}  color="blue"  icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    <StatCard label="Total Requests"  value={analytics.total_requests}  icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    <StatCard label="Approved"        value={analytics.approved_count}  color="green" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <StatCard label="Pending / Rejected" value={`${analytics.pending_count} / ${analytics.rejected_count}`} color="amber" icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ModuleBarChart moduleStats={analytics.module_stats || []} />
                    <ModuleAvgChart moduleStats={analytics.module_stats || []} />
                  </div>
                  {/* Recent audit log entries */}
                  {(analytics.recent_audit || []).length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-semibold text-slate-700">Recent System Activity</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <THead cols={["Action", "Performed By", "Details", "Date"]} />
                          <tbody className="divide-y divide-slate-100">
                            {(analytics.recent_audit || []).map((log, i) => (
                              <tr key={log.id ?? i} className="hover:bg-slate-50/60">
                                <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">{log.action}</span></td>
                                <td className="px-4 py-3 text-slate-600">{log.user_name_display || log.user_name || "—"}</td>
                                <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.details || "—"}</td>
                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState title="No analytics data" desc="Submit and process some requests to see stats." />
              )}
            </div>
          )}

          {/* FINALIZE QUEUE */}
          {activeKey === "finalize" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Final Approval Queue</h1>
                <p className="text-purple-100 text-sm mt-1">{pendingFinal.length} request{pendingFinal.length !== 1 ? "s" : ""} awaiting your final decision.</p>
              </div>
              {pendingFinal.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState title="Queue is empty" desc="All requests have been finalized." />
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingFinal.map((r) => (
                    <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-800">{r.student_name}</p>
                          <p className="text-xs text-slate-500">{r.student_email} · {r.department || "—"} · {r.roll_number || "—"}</p>
                          <p className="text-xs text-slate-400 mt-1">Submitted {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}</p>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-purple-100 text-purple-700 shrink-0">Ready to Finalize</span>
                      </div>
                      <div className="mt-4">
                        <textarea
                          value={finalRemarks[r.id] || ""}
                          onChange={(e) => setFinalRemarks((m) => ({ ...m, [r.id]: e.target.value }))}
                          placeholder="Remarks / rejection reason (required for rejection)…"
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          type="button"
                          onClick={() => handleFinalize(r.id, "approved")}
                          disabled={finalizing === r.id}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {finalizing === r.id ? "Processing…" : "✓ Approve & Issue Certificate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFinalize(r.id, "rejected")}
                          disabled={finalizing === r.id}
                          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USERS TABLE */}
          {activeKey === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className={`${inputClass} pl-9`} aria-label="Search users" />
                </div>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44" aria-label="Filter by role">
                  <option value="all">All roles</option>
                  <option value="student">Students</option>
                  <option value="teacher">Teachers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {filteredUsers.length === 0 ? (
                  <EmptyState title="No users found" desc="Try adjusting your search or filter." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Users table">
                      <THead cols={["Name", "Email", "Role", "Department"]} />
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((u) => {
                          const roleColor = { student: "bg-blue-50 text-blue-700 ring-blue-200", teacher: "bg-amber-50 text-amber-700 ring-amber-200", admin: "bg-green-50 text-green-700 ring-green-200" };
                          return (
                            <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 shrink-0">
                                    {(u.name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-800">{u.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${roleColor[u.role] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>{u.role}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{u.department || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ALL REQUESTS */}
          {activeKey === "requests" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests…" className={`${inputClass} pl-9`} aria-label="Search requests" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44" aria-label="Filter by status">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {filteredRequests.length === 0 ? (
                  <EmptyState title="No requests found" desc="Try adjusting your search or filter." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Requests table">
                      <THead cols={["Student", "Status", "Stage", "Assigned Teacher", "Date"]} />
                      <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map((r) => {
                          const STAGE_LABELS = { teacher: "With Teacher", hod: "With HOD", admin: "With Admin", completed: "Completed" };
                          const stageLabel = STAGE_LABELS[r.current_stage] || r.current_stage || "—";
                          const stageClass =
                            r.current_stage === "completed" ? "bg-green-100 text-green-700" :
                            r.current_stage === "admin"     ? "bg-purple-100 text-purple-700" :
                            r.current_stage === "hod"       ? "bg-orange-100 text-orange-700" :
                                                               "bg-blue-100 text-blue-700";
                          return (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{r.student_name}</p>
                              <p className="text-xs text-slate-400">{r.student_email}</p>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageClass}`}>{stageLabel}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{r.assigned_teacher_name || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ASSIGN TEACHERS */}
          {activeKey === "assign" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Assign Teachers</h2>
                <p className="text-sm text-slate-500 mt-0.5">{unassignedRequests.length} unassigned request{unassignedRequests.length !== 1 ? "s" : ""} waiting.</p>
              </div>
              {unassignedRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState title="All requests are assigned" desc="Every request has been assigned to a teacher." />
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Assign teachers table">
                      <THead cols={["Student", "Submitted", "Assign Teacher", ""]} />
                      <tbody className="divide-y divide-slate-100">
                        {unassignedRequests.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{r.student_name}</p>
                              <p className="text-xs text-slate-400">{r.student_email}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <select
                                value={assignmentMap[r.id] || ""}
                                onChange={(e) => setAssignmentMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                                aria-label={`Assign teacher for ${r.student_name}`}
                              >
                                <option value="">Select teacher…</option>
                                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() => handleAssignTeacher(r.id)}
                                disabled={assigningId === r.id || !assignmentMap[r.id]}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-all duration-150"
                              >
                                {assigningId === r.id ? "Assigning…" : "Assign"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUDIT LOG */}
          {activeKey === "audit" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Audit Log</h2>
                <p className="text-sm text-slate-500 mt-0.5">Complete history of all system actions.</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {auditLoading ? (
                  <table className="w-full text-sm"><THead cols={["Action", "User", "Details", "Date"]} /><tbody><SkeletonTableRows rows={6} cols={4} /></tbody></table>
                ) : auditLogs.length === 0 ? (
                  <EmptyState title="No audit records" desc="Actions will appear here as they occur." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Audit log table">
                      <THead cols={["Action", "Performed By", "Details", "Date"]} />
                      <tbody className="divide-y divide-slate-100">
                        {auditLogs.map((log, i) => (
                          <tr key={log.id ?? i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">{log.action || "—"}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{log.performed_by || log.user_name || "—"}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{log.details || "—"}</td>
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

export default AdminDashboard;