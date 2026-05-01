// --- ADMIN DASHBOARD ---
import { useEffect, useState } from "react";

import { ModuleAvgChart, ModuleBarChart, SemesterBreakdownChart, StatusBarChart, UserPieChart } from "../components/ChartCard";
import DashboardLayout from "../components/DashboardLayout";
import { SkeletonCard, SkeletonTableRows } from "../components/LoadingSkeleton";
import StatusBadge from "../components/StatusBadge";
import SemesterSwitcher from "../components/SemesterSwitcher";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [
  { key: "overview",   label: "Overview",        caption: "System-wide request and user stats"       },
  { key: "analytics", label: "Analytics",       caption: "Module stats and approval time charts"    },
  { key: "fees",      label: "Fees Approval",   caption: "Approve or reject student fee payments"   },
  { key: "finalize",  label: "Finalize Queue",  caption: "Requests awaiting final admin approval"   },
  { key: "users",     label: "Users",           caption: "Browse all registered accounts"           },
  { key: "requests",  label: "All Requests",    caption: "Filter and monitor every request"         },
  { key: "assign",    label: "Assign Teachers", caption: "Route requests to available teachers"     },
  { key: "audit",     label: "Audit Log",       caption: "Track all approval and assignment actions" },
];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#252550] bg-[#1a1a2e] text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-150";

function StatCard({ label, value, color = "default", icon }) {
  const colorMap = {
    default: { text: "text-white",       icon: "bg-slate-800 text-slate-300"      },
    blue:    { text: "text-blue-300",    icon: "bg-blue-500/20 text-blue-400"     },
    amber:   { text: "text-amber-300",   icon: "bg-amber-500/20 text-amber-400"   },
    green:   { text: "text-green-300",   icon: "bg-green-500/20 text-green-400"   },
    red:     { text: "text-red-300",     icon: "bg-red-500/20 text-red-400"       },
    purple:  { text: "text-violet-300",  icon: "bg-violet-500/20 text-violet-400" },
  };
  const s = colorMap[color] || colorMap.default;
  return (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.icon} mb-3`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <p className={`text-3xl font-bold ${s.text}`}>{value}</p>
      <p className="text-sm text-slate-400 mt-1">{label}</p>
    </div>
  );
}

function EmptyState({ title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-sm font-semibold text-slate-400">{title}</p>
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
  const [analyticsYear, setAnalyticsYear]         = useState(null);
  const [analyticsSemester, setAnalyticsSemester] = useState(null);
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
  // Fees approval state
  const [feesRequests, setFeesRequests] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feeRemarksMap, setFeeRemarksMap] = useState({});
  const [processingFee, setProcessingFee] = useState(null);
  const [feeSearch, setFeeSearch] = useState("");
  const [feeStatusFilter, setFeeStatusFilter] = useState("all");
  // Direct approve state (All Requests tab)
  const [directRemarksMap, setDirectRemarksMap] = useState({});
  const [processingDirect, setProcessingDirect] = useState(null);
  // ADDED: 3-tab user management state
  const [userTab, setUserTab] = useState("students");
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [adminsList, setAdminsList] = useState([]);
  const [usersTabLoading, setUsersTabLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  // ADDED: create user form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: "" });
  const [creating, setCreating] = useState(false);
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

  const loadAnalytics = async (year, semester) => {
    try {
      setAnalyticsLoading(true);
      const params = {};
      if (year)     params.year     = year;
      if (semester) params.semester = semester;
      const res = await API.get("/api/analytics/overview", { params });
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

  const loadFees = async () => {
    try {
      setFeesLoading(true);
      const res = await API.get("/all-requests");
      setFeesRequests(res.data.requests || []);
    } catch { addToast("Could not load fee requests.", "warning"); }
    finally { setFeesLoading(false); }
  };

  const handleFeeApproval = async (requestId, status, overrideRemarks) => {
    const remarks = overrideRemarks !== undefined ? overrideRemarks : (feeRemarksMap[requestId] || "");
    if (status === "rejected" && !remarks.trim()) {
      addToast("Please provide a reason for rejection.", "warning"); return;
    }
    try {
      setProcessingFee(requestId);
      await API.patch(`/api/clearance/${requestId}/fee`, { status, remarks });
      addToast(`Fee payment ${status} successfully.`, status === "approved" ? "success" : "info");
      await loadFees();
    } catch (err) {
      addToast(err.response?.data?.message || "Fee update failed.", "error");
    } finally { setProcessingFee(null); }
  };

  const handleDirectApprove = async (requestId, status) => {
    const remarks = directRemarksMap[requestId] || "";
    if (status === "rejected" && !remarks.trim()) {
      addToast("Please provide a rejection reason.", "warning"); return;
    }
    try {
      setProcessingDirect(requestId);
      await API.patch(`/api/clearance/${requestId}/finalize`, { status, remarks });
      addToast(status === "approved" ? "Student fully approved." : "Request rejected.", status === "approved" ? "success" : "info");
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Approval failed.", "error");
    } finally { setProcessingDirect(null); }
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
  useEffect(() => { if (activeKey === "analytics" && !analytics) loadAnalytics(analyticsYear, analyticsSemester); }, [activeKey]);
  // Re-load analytics when scope changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "analytics") loadAnalytics(analyticsYear, analyticsSemester); }, [analyticsYear, analyticsSemester]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "finalize") loadPendingFinal(); }, [activeKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "fees") loadFees(); }, [activeKey]);
  // ADDED: load user tab data when users section is opened or tab changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (activeKey === "users") loadUsersByTab(userTab); }, [activeKey, userTab]);

  // ADDED: load users for a specific tab
  const loadUsersByTab = async (tab) => {
    try {
      setUsersTabLoading(true);
      setUserSearch("");
      const res = await API.get(`/api/auth/admin/users/${tab}`);
      if (tab === "students") setStudentsList(res.data.students || []);
      else if (tab === "teachers") setTeachersList(res.data.teachers || []);
      else if (tab === "admins") setAdminsList(res.data.admins || []);
    } catch { addToast(`Failed to load ${tab}.`, "warning"); }
    finally { setUsersTabLoading(false); }
  };

  // ADDED: submit create user form
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await API.post("/api/auth/admin/create-user", createForm);
      addToast(res.data.message, "success");
      setCreateForm({ name: "", email: "", password: "", role: "" });
      setShowCreateUser(false);
      loadUsersByTab(userTab);
      loadData(); // refresh overview stats
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create user.", "error");
    } finally { setCreating(false); }
  };

  const handleBackfillTGC = async () => {
    try {
      const res = await API.post("/api/subjects/backfill-tgc");
      addToast(res.data.message, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "TGC backfill failed.", "error");
    }
  };

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
      <tr className="border-b border-[#1e1e35] bg-[#1a1a2e]/40">
        {cols.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{c}</th>)}
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
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">Analytics</h1>
                    <p className="text-indigo-100 text-sm mt-1">Module-wise clearance metrics and approval time.</p>
                  </div>
                  {/* Semester scope filter */}
                  <div className="bg-white/15 rounded-xl px-3 py-2">
                    <p className="text-xs text-indigo-200 mb-1.5 font-medium uppercase tracking-wide">Filter by semester</p>
                    <SemesterSwitcher
                      year={analyticsYear}
                      semester={analyticsSemester}
                      onChange={(y, s) => { setAnalyticsYear(y); setAnalyticsSemester(s); }}
                    />
                  </div>
                </div>
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
                  {/* Semester breakdown chart */}
                  {(analytics.semester_breakdown || []).length > 0 && (
                    <SemesterBreakdownChart semesterBreakdown={analytics.semester_breakdown} />
                  )}
                  {/* Recent audit log entries */}
                  {(analytics.recent_audit || []).length > 0 && (
                    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                      <div className="px-5 py-3 border-b border-[#1e1e35]">
                        <h3 className="text-sm font-semibold text-slate-300">Recent System Activity</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <THead cols={["Action", "Performed By", "Details", "Date"]} />
                          <tbody className="divide-y divide-[#1e1e35]">
                            {(analytics.recent_audit || []).map((log, i) => (
                              <tr key={log.id ?? i} className="hover:bg-[#1a1a2e]/60">
                                <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded bg-[#1a1a2e] text-slate-300">{log.action}</span></td>
                                <td className="px-4 py-3 text-slate-400">{log.user_name_display || log.user_name || "—"}</td>
                                <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{log.details || "—"}</td>
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

          {/* FEES APPROVAL */}
          {activeKey === "fees" && (() => {
            const pendingFeeCount  = feesRequests.filter((r) => (r.fee_status || "pending") === "pending").length;
            const approvedFeeCount = feesRequests.filter((r) => r.fee_status === "approved").length;
            const rejectedFeeCount = feesRequests.filter((r) => r.fee_status === "rejected").length;
            const filteredFees = feesRequests.filter((r) => {
              const q = feeSearch.trim().toLowerCase();
              const matchSearch = !q
                || (r.student_name || "").toLowerCase().includes(q)
                || (r.student_email || "").toLowerCase().includes(q)
                || (r.roll_number || "").toLowerCase().includes(q)
                || (r.department || "").toLowerCase().includes(q);
              const feeStatus = r.fee_status || "pending";
              const matchStatus = feeStatusFilter === "all" || feeStatus === feeStatusFilter;
              return matchSearch && matchStatus;
            });
            return (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="text-2xl font-bold">Fees Approval</h1>
                      <p className="text-emerald-100 text-sm mt-1">Review and approve or reject student fee payments.</p>
                    </div>
                    <button type="button" onClick={loadFees} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors">
                      ↻ Refresh
                    </button>
                  </div>
                  {/* Summary pills */}
                  <div className="flex gap-3 mt-4 flex-wrap">
                    <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">{feesRequests.length} Total</span>
                    <span className="px-3 py-1 rounded-full bg-amber-400/30 text-white text-xs font-semibold">{pendingFeeCount} Pending</span>
                    <span className="px-3 py-1 rounded-full bg-green-400/30 text-white text-xs font-semibold">{approvedFeeCount} Approved</span>
                    <span className="px-3 py-1 rounded-full bg-red-400/30 text-white text-xs font-semibold">{rejectedFeeCount} Rejected</span>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                      type="text"
                      value={feeSearch}
                      onChange={(e) => setFeeSearch(e.target.value)}
                      placeholder="Search by name, roll no., department…"
                      className={`${inputClass} pl-9`}
                      aria-label="Search fee requests"
                    />
                  </div>
                  <select
                    value={feeStatusFilter}
                    onChange={(e) => setFeeStatusFilter(e.target.value)}
                    className="px-3 py-2.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-44"
                    aria-label="Filter by fee status"
                  >
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Table */}
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {feesLoading ? (
                    <div className="p-10 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
                  ) : filteredFees.length === 0 ? (
                    <EmptyState
                      title={feesRequests.length === 0 ? "No clearance requests" : "No results"}
                      desc={feesRequests.length === 0 ? "Students need to submit a clearance request first." : "Try adjusting your search or filter."}
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Fee approval table">
                        <THead cols={["Student", "Roll No.", "Dept", "Sem / Year", "Submitted", "Fee Status", "Actions"]} />
                        <tbody className="divide-y divide-[#1e1e35]">
                          {filteredFees.map((r) => {
                            const feeStatus = r.fee_status || "pending";
                            const feePill =
                              feeStatus === "approved" ? "bg-green-100 text-green-700"
                              : feeStatus === "rejected" ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700";
                            const isProcessing = processingFee === r.id;
                            return (
                              <tr key={r.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                                {/* Student */}
                                <td className="px-4 py-3">
                                  <p className="font-medium text-slate-200">{r.student_name || "—"}</p>
                                  <p className="text-xs text-slate-400">{r.student_email || ""}</p>
                                </td>
                                {/* Roll No. */}
                                <td className="px-4 py-3">
                                  <span className="font-mono text-xs bg-[#1a1a2e] text-slate-400 px-2 py-0.5 rounded">{r.roll_number || "—"}</span>
                                </td>
                                {/* Department */}
                                <td className="px-4 py-3 text-slate-400">{r.department || "—"}</td>
                                {/* Sem / Year */}
                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.semester || "—"} / {r.year || "—"}</td>
                                {/* Submitted */}
                                <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}</td>
                                {/* Fee Status */}
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${feePill}`}>{feeStatus}</span>
                                  {feeStatus === "rejected" && r.fee_remarks && (
                                    <p className="text-xs text-red-500 mt-1 max-w-[140px] truncate" title={r.fee_remarks}>{r.fee_remarks}</p>
                                  )}
                                  {feeStatus === "approved" && r.fee_approved_by_name && (
                                    <p className="text-xs text-slate-400 mt-1">by {r.fee_approved_by_name}</p>
                                  )}
                                </td>
                                {/* Actions */}
                                <td className="px-4 py-3">
                                  {feeStatus !== "approved" && (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleFeeApproval(r.id, "approved")}
                                          disabled={isProcessing}
                                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                                          title="Approve fee"
                                        >
                                          {isProcessing ? "…" : "✓ Approve"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleFeeApproval(r.id, "rejected")}
                                          disabled={isProcessing}
                                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                                          title="Reject fee"
                                        >
                                          ✕ Reject
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={feeRemarksMap[r.id] || ""}
                                        onChange={(e) => setFeeRemarksMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                        placeholder="Rejection reason (required to reject)…"
                                        className="px-2 py-1 text-xs border border-[#1e1e35] rounded w-52 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                      />
                                    </div>
                                  )}
                                  {feeStatus === "approved" && (
                                    <button
                                      type="button"
                                      onClick={() => handleFeeApproval(r.id, "rejected", "Revoked by admin")}
                                      disabled={isProcessing}
                                      className="px-3 py-1.5 bg-red-500/15 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                    >
                                      {isProcessing ? "…" : "Revoke"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* FINALIZE QUEUE */}
          {activeKey === "finalize" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold">Final Approval Queue</h1>
                <p className="text-purple-100 text-sm mt-1">{pendingFinal.length} request{pendingFinal.length !== 1 ? "s" : ""} awaiting your final decision.</p>
              </div>
              {pendingFinal.length === 0 ? (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35]">
                  <EmptyState title="Queue is empty" desc="All requests have been finalized." />
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingFinal.map((r) => (
                    <div key={r.id} className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-200">{r.student_name}</p>
                          <p className="text-xs text-slate-400">{r.student_email} · {r.department || "—"} · {r.roll_number || "—"}</p>
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
                          className="w-full px-3 py-2 text-sm border border-[#1e1e35] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* USERS TABLE — ADDED: 3 tabs + create user form */}
          {activeKey === "users" && (
            <div className="space-y-4">
              {/* Tab bar + Create User button */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-1 bg-[#1a1a2e] rounded-lg p-1">
                  {[
                    { key: "students", label: "Students" },
                    { key: "teachers", label: "Teachers" },
                    { key: "admins",   label: "Admins"   },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setUserTab(t.key)}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        userTab === t.key
                          ? "bg-[#111120] text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateUser((v) => !v)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {showCreateUser ? "Cancel" : "+ Create User"}
                </button>
                <button
                  type="button"
                  onClick={handleBackfillTGC}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  title="Create TGC records for any existing students who are missing them"
                >
                  Sync TGC for Existing Students
                </button>
              </div>

              {/* ADDED: Create User inline form */}
              {showCreateUser && (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
                  <h3 className="text-sm font-semibold text-slate-200 mb-4">Create New User</h3>
                  <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      required
                      type="text"
                      placeholder="Full name"
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      required
                      type="email"
                      placeholder="Email address"
                      value={createForm.email}
                      onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                      className={inputClass}
                    />
                    <input
                      required
                      type="password"
                      placeholder="Password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                      className={inputClass}
                    />
                    {/* ADDED: role dropdown — no clearance_status field */}
                    <select
                      required
                      value={createForm.role}
                      onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Select Role</option>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {creating ? "Creating…" : "Create User"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Per-tab search */}
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={`Search ${userTab}…`}
                  className={`${inputClass} pl-9`}
                  aria-label={`Search ${userTab}`}
                />
              </div>

              {/* ADDED: Tab 1 — Students */}
              {userTab === "students" && (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {usersTabLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                  ) : studentsList.filter((s) => {
                    const q = userSearch.trim().toLowerCase();
                    return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.student_code?.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <EmptyState title="No students found" desc="Create a student account using the form above." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Students table">
                        <THead cols={["Name", "Student Code", "TGC", "Email"]} />
                        <tbody className="divide-y divide-[#1e1e35]">
                          {studentsList.filter((s) => {
                            const q = userSearch.trim().toLowerCase();
                            return !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.student_code?.toLowerCase().includes(q);
                          }).map((s) => (
                            <tr key={s.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700 shrink-0">
                                    {(s.name || "S").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-200">{s.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3"><span className="font-mono text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">{s.student_code || "—"}</span></td>
                              <td className="px-4 py-3 text-slate-300 font-medium">{s.tgc ?? 0}</td>
                              <td className="px-4 py-3 text-slate-400">{s.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ADDED: Tab 2 — Teachers */}
              {userTab === "teachers" && (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {usersTabLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                  ) : teachersList.filter((t) => {
                    const q = userSearch.trim().toLowerCase();
                    return !q || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <EmptyState title="No teachers found" desc="Create a teacher account using the form above." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Teachers table">
                        <THead cols={["Name", "Email", "Department"]} />
                        <tbody className="divide-y divide-[#1e1e35]">
                          {teachersList.filter((t) => {
                            const q = userSearch.trim().toLowerCase();
                            return !q || t.name?.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
                          }).map((t) => (
                            <tr key={t.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700 shrink-0">
                                    {(t.name || "T").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-200">{t.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400">{t.email}</td>
                              <td className="px-4 py-3 text-slate-400">{t.department || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ADDED: Tab 3 — Admins */}
              {userTab === "admins" && (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {usersTabLoading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
                  ) : adminsList.filter((a) => {
                    const q = userSearch.trim().toLowerCase();
                    return !q || a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
                  }).length === 0 ? (
                    <EmptyState title="No admins found" desc="Create an admin account using the form above." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Admins table">
                        <THead cols={["Name", "Email", "Role"]} />
                        <tbody className="divide-y divide-[#1e1e35]">
                          {adminsList.filter((a) => {
                            const q = userSearch.trim().toLowerCase();
                            return !q || a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
                          }).map((a) => {
                            const roleColor = { admin: "bg-green-500/20 text-green-300 ring-green-500/30", super_admin: "bg-violet-500/20 text-violet-300 ring-violet-500/30" };
                            return (
                              <tr key={a.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
                                      {(a.name || "A").charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-200">{a.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-slate-400">{a.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${roleColor[a.role] || "bg-[#0f0f1b] text-slate-400 ring-slate-200"}`}>{a.role}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44" aria-label="Filter by status">
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                {filteredRequests.length === 0 ? (
                  <EmptyState title="No requests found" desc="Try adjusting your search or filter." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Requests table">
                      <THead cols={["Student", "Status", "Stage", "Fee Status", "Assigned Teacher", "Date", "Actions"]} />
                      <tbody className="divide-y divide-[#1e1e35]">
                        {filteredRequests.map((r) => {
                          const STAGE_LABELS = { teacher: "With Teacher", hod: "With HOD", admin: "With Admin", completed: "Completed" };
                          const stageLabel = STAGE_LABELS[r.current_stage] || r.current_stage || "—";
                          const stageClass =
                            r.current_stage === "completed" ? "bg-green-100 text-green-700" :
                            r.current_stage === "admin"     ? "bg-purple-100 text-purple-700" :
                            r.current_stage === "hod"       ? "bg-orange-100 text-orange-700" :
                                                               "bg-blue-100 text-blue-700";
                          return (
                          <tr key={r.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-200">{r.student_name}</p>
                              <p className="text-xs text-slate-400">{r.student_email}</p>
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stageClass}`}>{stageLabel}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                r.fee_status === "approved" ? "bg-green-100 text-green-700"
                                : r.fee_status === "rejected" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                              }`}>
                                Fee: {r.fee_status || "pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{r.assigned_teacher_name || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                            {r.status === "pending" && (
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Remarks…"
                                    value={directRemarksMap[r.id] || ""}
                                    onChange={(e) => setDirectRemarksMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                    className="px-2 py-1 text-xs border border-[#1e1e35] rounded w-36 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDirectApprove(r.id, "approved")}
                                      disabled={processingDirect === r.id}
                                      className="px-2.5 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition-colors"
                                    >
                                      {processingDirect === r.id ? "…" : "Approve"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDirectApprove(r.id, "rejected")}
                                      disabled={processingDirect === r.id}
                                      className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              </td>
                            )}
                            {r.status !== "pending" && <td className="px-4 py-3 text-slate-400 text-xs">—</td>}
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
                <h2 className="text-xl font-bold text-white">Assign Teachers</h2>
                <p className="text-sm text-slate-400 mt-0.5">{unassignedRequests.length} unassigned request{unassignedRequests.length !== 1 ? "s" : ""} waiting.</p>
              </div>
              {unassignedRequests.length === 0 ? (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35]">
                  <EmptyState title="All requests are assigned" desc="Every request has been assigned to a teacher." />
                </div>
              ) : (
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Assign teachers table">
                      <THead cols={["Student", "Submitted", "Assign Teacher", ""]} />
                      <tbody className="divide-y divide-[#1e1e35]">
                        {unassignedRequests.map((r) => (
                          <tr key={r.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-200">{r.student_name}</p>
                              <p className="text-xs text-slate-400">{r.student_email}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              <select
                                value={assignmentMap[r.id] || ""}
                                onChange={(e) => setAssignmentMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                className="px-2.5 py-1.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
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
                <h2 className="text-xl font-bold text-white">Audit Log</h2>
                <p className="text-sm text-slate-400 mt-0.5">Complete history of all system actions.</p>
              </div>
              <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                {auditLoading ? (
                  <table className="w-full text-sm"><THead cols={["Action", "User", "Details", "Date"]} /><tbody><SkeletonTableRows rows={6} cols={4} /></tbody></table>
                ) : auditLogs.length === 0 ? (
                  <EmptyState title="No audit records" desc="Actions will appear here as they occur." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Audit log table">
                      <THead cols={["Action", "Performed By", "Details", "Date"]} />
                      <tbody className="divide-y divide-[#1e1e35]">
                        {auditLogs.map((log, i) => (
                          <tr key={log.id ?? i} className="hover:bg-[#1a1a2e]/60 transition-colors">
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1a1a2e] text-slate-300 text-xs font-medium">{log.action || "—"}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">{log.performed_by || log.user_name || "—"}</td>
                            <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{log.details || "—"}</td>
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