// --- SUPER ADMIN DASHBOARD ---
import { useEffect, useState } from "react";

import ConfirmModal from "../components/ConfirmModal";
import DashboardLayout from "../components/DashboardLayout";
import { SkeletonCard } from "../components/LoadingSkeleton";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [
  { key: "overview",     label: "Overview",          caption: "Platform-wide metrics"             },
  { key: "create",       label: "Create User",       caption: "Add a new account"                 },
  { key: "manage",       label: "Manage Users",      caption: "Edit or remove accounts"           },
  { key: "modules",      label: "Module Assignments",caption: "Assign staff to clearance modules" },
  { key: "tgc-subjects", label: "TGC Subjects",      caption: "Manage Term Grant subjects"        },
  { key: "tgc-overview", label: "TGC Overview",      caption: "Analytics & student status"        },
  { key: "clearance",    label: "Clearance Approvals",caption: "Review and approve student clearances" },
];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#252550] bg-[#111120] text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150";

const ROLES = ["student", "teacher", "admin", "super_admin"];

function StatCard({ label, value, color = "default", icon }) {
  const colorMap = {
    default: { text: "text-white",   icon: "bg-[#1a1a2e] text-slate-400"   },
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
      <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-slate-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p className="text-sm font-semibold text-slate-400">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "student", department: "", clearanceStatus: "incomplete" };

// Defined at module scope to prevent unmount/remount on every re-render (focus loss bug)
function Field({ label, id, children, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-300 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SuperAdminDashboard() {
  const [activeKey, setActiveKey] = useState("overview");
  const [superAdmin, setSuperAdmin] = useState(null);
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // {id, form: {...}}
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [savingModule, setSavingModule] = useState(null);
  const [moduleSelections, setModuleSelections] = useState({});
  const { addToast } = useToast();

  // ADDED: TGC state
  const [tgcSubjects,      setTgcSubjects]      = useState([]);
  const [tgcAnalytics,     setTgcAnalytics]     = useState(null);
  const [tgcStudents,      setTgcStudents]       = useState([]);
  const [tgcLoading,       setTgcLoading]        = useState(false);
  const [tgcSubjLoading,   setTgcSubjLoading]    = useState(false);
  const [tgcSearchQuery,   setTgcSearchQuery]    = useState("");
  const [tgcSubjForm,      setTgcSubjForm]       = useState({ name: "", code: "", subject_type: "TH", tgc_semester: 6, tgc_year: "TY", academic_year: "2025-26" });
  const [savingSubj,       setSavingSubj]        = useState(false);
  const [assignTeacherMap, setAssignTeacherMap]  = useState({}); // subjectId -> teacherId string
  const [savingAssign,     setSavingAssign]      = useState(null); // subjectId being saved
  // Clearance approval state
  const [clearanceRequests,   setClearanceRequests]   = useState([]);
  const [clearanceLoading,    setClearanceLoading]    = useState(false);
  const [clearanceRemarksMap, setClearanceRemarksMap] = useState({});
  const [processingClearance, setProcessingClearance] = useState(null);
  // Quick clearance approve from users list
  const [approvingUserId, setApprovingUserId] = useState(null);
  const TGC_ITEM_TYPES = [
    { value: "TH",   label: "Theory (TH)" },
    { value: "PR",   label: "Practical (PR)" },
    { value: "MP",   label: "Mini Project (MP)" },
    { value: "MDM",  label: "MDM" },
    { value: "PBL",  label: "PBL" },
    { value: "SCIL", label: "SCIL" },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [meRes, overviewRes, usersRes] = await Promise.allSettled([
        API.get("/super-admin/me"),
        API.get("/super-admin/overview"),
        API.get("/super-admin/users"),
      ]);
      if (meRes.status === "fulfilled")       setSuperAdmin(meRes.value.data.user || meRes.value.data);
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value.data.overview || overviewRes.value.data);
      if (usersRes.status === "fulfilled")    setUsers(usersRes.value.data.users || []);
      const err = [meRes, overviewRes, usersRes].find((r) => r.status === "rejected");
      if (err) addToast(err.reason?.response?.data?.message || "Some data failed to load.", "warning");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load dashboard.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    if (activeKey !== "modules") return;
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([API.get("/api/modules/assignments"), API.get("/api/modules/staff")]);
        const a = aRes.data.data || [];
        setAssignments(a);
        setStaff(sRes.data.data || []);
        const sel = {};
        a.forEach((m) => { sel[m.module_name] = m.assigned_user_id || ""; });
        setModuleSelections(sel);
      } catch { addToast("Could not load module assignments.", "warning"); }
    };
    load();
    // eslint-disable-next-line
  }, [activeKey]);

  const handleSaveModule = async (moduleName) => {
    try {
      setSavingModule(moduleName);
      const assigned_user_id = moduleSelections[moduleName] || null;
      await API.put(`/api/modules/assignments/${moduleName}`, { assigned_user_id });
      addToast(`${moduleName} assignment saved.`, "success");
      setAssignments((prev) =>
        prev.map((m) => m.module_name === moduleName ? { ...m, assigned_user_id } : m)
      );
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed.", "error");
    } finally { setSavingModule(null); }
  };

  // ADDED: TGC subject management
  useEffect(() => {
    if (activeKey !== "tgc-subjects") return;
    const load = async () => {
      try {
        setTgcSubjLoading(true);
        const [subRes, staffRes] = await Promise.all([API.get("/api/subjects"), API.get("/api/modules/staff")]);
        setTgcSubjects(subRes.data.subjects || []);
        setStaff(prev => staffRes.data.data || prev);
      } catch { addToast("Could not load TGC subjects.", "warning"); }
      finally { setTgcSubjLoading(false); }
    };
    load();
  }, [activeKey, addToast]);

  // ADDED: TGC overview/analytics
  useEffect(() => {
    if (activeKey !== "tgc-overview") return;
    const load = async () => {
      try {
        setTgcLoading(true);
        const [analRes, stuRes] = await Promise.allSettled([
          API.get("/api/analytics/term-grant"),
          API.get("/api/certificate/all-students"),
        ]);
        if (analRes.status === "fulfilled") setTgcAnalytics(analRes.value.data);
        if (stuRes.status  === "fulfilled") setTgcStudents(stuRes.value.data.students || []);
      } catch { addToast("Could not load TGC analytics.", "warning"); }
      finally { setTgcLoading(false); }
    };
    load();
  }, [activeKey, addToast]);

  // Clearance approvals
  useEffect(() => {
    if (activeKey !== "clearance") return;
    const load = async () => {
      try {
        setClearanceLoading(true);
        const res = await API.get("/api/super-admin/clearance-requests");
        setClearanceRequests(res.data.requests || []);
      } catch { addToast("Could not load clearance requests.", "warning"); }
      finally { setClearanceLoading(false); }
    };
    load();
  }, [activeKey, addToast]);

  const handleClearanceApproval = async (requestId, status) => {    const remarks = clearanceRemarksMap[requestId] || "";
    if (status === "rejected" && !remarks.trim()) {
      addToast("Please provide a rejection reason.", "warning"); return;
    }
    try {
      setProcessingClearance(requestId);
      await API.patch(`/api/super-admin/clearance/${requestId}/approve`, { status, remarks });
      addToast(status === "approved" ? "Clearance approved." : "Clearance rejected.", status === "approved" ? "success" : "info");
      const res = await API.get("/api/super-admin/clearance-requests");
      setClearanceRequests(res.data.requests || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Action failed.", "error");
    } finally { setProcessingClearance(null); }
  };

  const handleApproveStudentClearance = async (userId, userName) => {
    if (!window.confirm(`Approve full clearance for ${userName}?`)) return;
    try {
      setApprovingUserId(userId);
      await API.patch(`/api/super-admin/users/${userId}/approve-clearance`);
      addToast(`Clearance approved for ${userName}.`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to approve clearance.", "error");
    } finally { setApprovingUserId(null); }
  };

  const handleCreateTGCSubject = async (e) => {
    e.preventDefault();
    if (!tgcSubjForm.name.trim() || !tgcSubjForm.code.trim()) {
      addToast("Name and code are required.", "error"); return;
    }
    try {
      setSavingSubj(true);
      await API.post("/api/subjects/create", { ...tgcSubjForm, is_tgc: true });
      addToast("Subject created.", "success");
      setTgcSubjForm({ name: "", code: "", subject_type: "TH", tgc_semester: 6, tgc_year: "TY", academic_year: "2025-26" });
      const res = await API.get("/api/subjects");
      setTgcSubjects(res.data.subjects || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create subject.", "error");
    } finally { setSavingSubj(false); }
  };

  const handleDeleteTGCSubject = async (id) => {
    if (!window.confirm("Delete this subject? This cannot be undone.")) return;
    try {
      await API.delete(`/api/subjects/${id}`);
      setTgcSubjects(prev => prev.filter(s => s.id !== id));
      addToast("Subject deleted.", "info");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete.", "error");
    }
  };

  const handleAssignTeacher = async (subjectId) => {
    const teacherId = assignTeacherMap[subjectId];
    if (!teacherId) { addToast("Select a teacher first.", "error"); return; }
    try {
      setSavingAssign(subjectId);
      await API.post(`/api/subjects/${subjectId}/assign-teacher`, { teacher_id: teacherId });
      addToast("Teacher assigned.", "success");
      const res = await API.get("/api/subjects");
      setTgcSubjects(res.data.subjects || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to assign.", "error");
    } finally { setSavingAssign(null); }
  };

  const validateForm = (f) => {
    const e = {};
    if (!f.name.trim())  e.name  = "Name is required.";
    if (!f.email.trim()) e.email = "Email is required.";
    if (!f.password && !editingUser) e.password = "Password is required.";
    if (!f.role)         e.role  = "Role is required.";
    return e;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = validateForm(form);
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      setSubmitting(true);
      await API.post("/super-admin/users", form);
      addToast("User created successfully.", "success");
      setForm(EMPTY_FORM);
      setFormErrors({});
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create user.", "error");
    } finally { setSubmitting(false); }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const errs = validateForm(editingUser.form);
    delete errs.password; // password optional on edit
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    try {
      setSubmitting(true);
      const payload = { ...editingUser.form };
      if (!payload.password) delete payload.password;
      await API.put(`/super-admin/users/${editingUser.id}`, payload);
      addToast("User updated successfully.", "success");
      setEditingUser(null);
      setFormErrors({});
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update user.", "error");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await API.delete(`/super-admin/users/${deleteTarget.id}`);
      addToast("User deleted.", "success");
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete user.", "error");
    } finally { setDeleting(false); }
  };

  const startEdit = (u) => {
    setEditingUser({ id: u.id, form: { name: u.name || "", email: u.email || "", password: "", role: u.role || "student", department: u.department || "", clearanceStatus: u.clearance_status || u.clearanceStatus || "incomplete" } });
    setFormErrors({});
    setActiveKey("manage");
  };

  const filteredUsers = users.filter((u) => {
    const q = search.trim().toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) && (roleFilter === "all" || u.role === roleFilter);
  });

  const stats = overview || {};
  const THead = ({ cols }) => (
    <thead>
      <tr className="border-b border-[#1e1e35] bg-[#1a1a2e]/40">
        {cols.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{c}</th>)}
      </tr>
    </thead>
  );

  const headerActions = (
    <button type="button" onClick={loadData} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-ink2 hover:bg-raised hover:text-ink transition-all duration-150 text-sm" aria-label="Refresh dashboard">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      Refresh
    </button>
  );

  const editF = editingUser?.form;
  const setEditF = (key, val) => setEditingUser((eu) => ({ ...eu, form: { ...eu.form, [key]: val } }));

  const formCard = (title, onSubmit, f, setF, btnLabel, cancelFn) => (
    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6 max-w-lg w-full">
      <h2 className="text-lg font-bold text-white mb-5">{title}</h2>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Full Name" id={`${title}-name`} error={formErrors.name}>
          <input id={`${title}-name`} type="text" value={f.name} onChange={(e) => setF("name", e.target.value)} placeholder="Jane Doe" className={inputClass} />
        </Field>
        <Field label="Email Address" id={`${title}-email`} error={formErrors.email}>
          <input id={`${title}-email`} type="email" value={f.email} onChange={(e) => setF("email", e.target.value)} placeholder="jane@example.com" className={inputClass} />
        </Field>
        <Field label={cancelFn ? "New Password (leave blank to keep)" : "Password"} id={`${title}-pwd`} error={formErrors.password}>
          <input id={`${title}-pwd`} type="password" value={f.password} onChange={(e) => setF("password", e.target.value)} placeholder="••••••••" className={inputClass} autoComplete="new-password" />
        </Field>
        <Field label="Role" id={`${title}-role`} error={formErrors.role}>
          <select id={`${title}-role`} value={f.role} onChange={(e) => setF("role", e.target.value)} className={inputClass}>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Department" id={`${title}-dept`}>
          <input id={`${title}-dept`} type="text" value={f.department} onChange={(e) => setF("department", e.target.value)} placeholder="e.g. Computer Science" className={inputClass} />
        </Field>
        <Field label="Clearance Status" id={`${title}-cs`}>
          <select id={`${title}-cs`} value={f.clearanceStatus} onChange={(e) => setF("clearanceStatus", e.target.value)} className={inputClass}>
            <option value="incomplete">Incomplete</option>
            <option value="complete">Complete</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all duration-150">
            {submitting ? "Saving…" : btnLabel}
          </button>
          {cancelFn && (
            <button type="button" onClick={cancelFn} className="flex-1 py-2.5 border border-[#252550] hover:bg-[#1a1a2e] text-slate-300 text-sm font-semibold rounded-lg transition-all duration-150">Cancel</button>
          )}
        </div>
      </form>
    </div>
  );

  const roleColor = { student: "bg-blue-500/20 text-blue-300 ring-blue-500/30", teacher: "bg-amber-500/20 text-amber-300 ring-amber-500/30", admin: "bg-green-500/20 text-green-300 ring-green-500/30", super_admin: "bg-violet-500/20 text-violet-300 ring-violet-500/30" };

  return (
    <>
      <DashboardLayout
        title="Super Admin"
        subtitle="Full platform control."
        user={superAdmin}
        navItems={navItems}
        activeKey={activeKey}
        onNavigate={(k) => { setActiveKey(k); setEditingUser(null); setFormErrors({}); }}
        headerActions={headerActions}
      >
        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4,5].map((i) => <SkeletonCard key={i} />)}</div>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {activeKey === "overview" && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
                  <p className="text-sm font-medium text-violet-200 mb-0.5">Welcome back</p>
                  <h1 className="text-2xl font-bold">{superAdmin?.name || "Super Admin"}</h1>
                  <p className="text-violet-100 text-sm mt-1">You have complete access to the ClearPass platform.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <StatCard label="Total Users"   value={stats.totalUsers   || users.length} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  <StatCard label="Students"      value={stats.totalStudents || users.filter((u) => u.role === "student").length} color="blue"   icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  <StatCard label="Teachers"      value={stats.totalTeachers || users.filter((u) => u.role === "teacher").length} color="amber"  icon="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <StatCard label="Admins"        value={stats.totalAdmins   || users.filter((u) => u.role === "admin").length}   color="green"  icon="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  <StatCard label="Super Admins"  value={stats.totalSuperAdmins || users.filter((u) => u.role === "super_admin").length} color="purple" icon="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </div>
                <div className="bg-[#111120] border border-[#1e1e35] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Platform Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {[["Total Requests", stats.totalRequests ?? "—"], ["Pending Requests", stats.pendingRequests ?? "—"], ["Approved", stats.approvedRequests ?? "—"]].map(([k, v]) => (
                      <div key={k} className="border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400">{k}</p>
                        <p className="text-lg font-bold text-slate-200 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CREATE USER */}
            {activeKey === "create" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Create New User</h2>
                {formCard(
                  "Create User",
                  handleCreate,
                  form,
                  (key, val) => setForm((prev) => ({ ...prev, [key]: val })),
                  "Create User",
                  null
                )}
              </div>
            )}

            {/* MANAGE USERS */}
            {activeKey === "manage" && !editingUser && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className={`${inputClass} pl-9`} aria-label="Search users" />
                  </div>
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-purple-500 sm:w-44" aria-label="Filter by role">
                    <option value="all">All roles</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <EmptyState title="No users found" desc="Try adjusting your search or role filter." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Users management table">
                        <THead cols={["Name", "Email", "Role", "Department", ""]} />
                        <tbody className="divide-y divide-[#1e1e35]">
                          {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-400 shrink-0">
                                    {(u.name || "U").charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-slate-200">{u.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-400">{u.email}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${roleColor[u.role] || "bg-[#0f0f1b] text-slate-400 ring-slate-200"}`}>{u.role?.replace("_", " ")}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-400">{u.department || "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-end">
                                  <button type="button" onClick={() => startEdit(u)} className="px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/15 border border-blue-500/30 rounded-md transition-all duration-150">Edit</button>
                                  <button type="button" onClick={() => setDeleteTarget(u)} className="px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/15 border border-red-500/30 rounded-md transition-all duration-150">Delete</button>
                                  {u.role === "student" && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveStudentClearance(u.id, u.name)}
                                      disabled={approvingUserId === u.id}
                                      className="px-3 py-1 text-xs font-semibold text-green-600 hover:bg-green-500/15 border border-green-500/30 rounded-md transition-all duration-150 disabled:opacity-50"
                                    >
                                      {approvingUserId === u.id ? "…" : "Approve Clearance"}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDIT USER */}
            {activeKey === "manage" && editingUser && (
              <div className="space-y-4">
                <button type="button" onClick={() => { setEditingUser(null); setFormErrors({}); }} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back to Users
                </button>
                <h2 className="text-xl font-bold text-white">Edit User</h2>
                {formCard(
                  "Edit User",
                  (e) => { e.preventDefault(); handleSaveEdit(); },
                  editF,
                  setEditF,
                  "Save Changes",
                  () => { setEditingUser(null); setFormErrors({}); }
                )}
              </div>
            )}

            {/* MODULE ASSIGNMENTS */}
            {activeKey === "modules" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
                  <h1 className="text-2xl font-bold">Module Assignments</h1>
                  <p className="text-violet-100 text-sm mt-1">Assign staff members to handle each clearance module.</p>
                </div>

                {assignments.length === 0 ? (
                  <EmptyState title="No modules found" desc="Module data could not be loaded." />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {assignments.map((mod) => {
                      const MODULE_LABELS = { library: "Library", accounts: "Accounts", hostel: "Hostel", department: "Department" };
                      const label = MODULE_LABELS[mod.module_name] || mod.module_name.charAt(0).toUpperCase() + mod.module_name.slice(1);
                      const currentSelection = moduleSelections[mod.module_name] ?? "";
                      const currentStaff = staff.find((s) => String(s.id) === String(currentSelection));
                      return (
                        <div key={mod.module_name} className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{label}</p>
                            {currentStaff ? (
                              <p className="text-xs text-slate-400 mt-0.5">Currently: {currentStaff.name} ({currentStaff.email})</p>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5">No one assigned</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={currentSelection}
                              onChange={(e) => setModuleSelections((m) => ({ ...m, [mod.module_name]: e.target.value }))}
                              className="flex-1 px-3 py-2 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-purple-500"
                              aria-label={`Assign staff to ${label}`}
                            >
                              <option value="">— Unassigned —</option>
                              {staff.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveModule(mod.module_name)}
                              disabled={savingModule === mod.module_name}
                              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shrink-0"
                            >
                              {savingModule === mod.module_name ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ADDED: TGC SUBJECT MANAGEMENT ───────────────────────── */}
            {activeKey === "tgc-subjects" && (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                  <h1 className="text-2xl font-bold">TGC Subject Management</h1>
                  <p className="text-blue-100 text-sm mt-1">Manage TY Semester 6 subjects and assign teachers.</p>
                </div>

                {/* Create Subject Form */}
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
                  <h3 className="text-sm font-bold text-slate-200 mb-4">Add New TGC Subject</h3>
                  <form onSubmit={handleCreateTGCSubject} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-40">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Subject Name *</label>
                      <input
                        type="text"
                        value={tgcSubjForm.name}
                        onChange={e => setTgcSubjForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. IoT Technology"
                        className={inputClass}
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Code *</label>
                      <input
                        type="text"
                        value={tgcSubjForm.code}
                        onChange={e => setTgcSubjForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                        placeholder="IOT-TH"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                      <select
                        value={tgcSubjForm.subject_type}
                        onChange={e => setTgcSubjForm(f => ({ ...f, subject_type: e.target.value }))}
                        className={inputClass}
                      >
                        {TGC_ITEM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Semester</label>
                      <input
                        type="number"
                        min={1} max={8}
                        value={tgcSubjForm.tgc_semester}
                        onChange={e => setTgcSubjForm(f => ({ ...f, tgc_semester: parseInt(e.target.value) || 6 }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Acad. Year</label>
                      <input
                        type="text"
                        value={tgcSubjForm.academic_year}
                        onChange={e => setTgcSubjForm(f => ({ ...f, academic_year: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingSubj}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {savingSubj ? "Adding…" : "+ Add Subject"}
                    </button>
                  </form>
                </div>

                {/* Subjects List */}
                <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                  {tgcSubjLoading ? (
                    <div className="p-6 space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 bg-[#1a1a2e] rounded-lg animate-pulse"/>)}</div>
                  ) : tgcSubjects.length === 0 ? (
                    <EmptyState title="No TGC subjects" desc="Add subjects using the form above." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#0f0f1b] text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          <tr>
                            <th className="px-5 py-3 text-left">Subject</th>
                            <th className="px-4 py-3 text-left">Code</th>
                            <th className="px-4 py-3 text-left">Type</th>
                            <th className="px-4 py-3 text-left">Teachers Assigned</th>
                            <th className="px-4 py-3 text-left">Assign Teacher</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tgcSubjects.map(sub => (
                            <tr key={sub.id} className="hover:bg-[#1a1a2e]/50 transition-colors">
                              <td className="px-5 py-3 font-medium text-white">{sub.name || sub.subject_name}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-xs">{sub.code || sub.subject_code}</td>
                              <td className="px-4 py-3">
                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium">
                                  {sub.subject_type || sub.type || "—"}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {(sub.teachers || []).length === 0 ? (
                                  <span className="text-xs text-slate-400">None</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Assigned</span>
                                    {(sub.teachers || []).map(t => (
                                      <span key={t.teacher_id || t.id} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{t.teacher_name || t.name}</span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 items-center">
                                  <select
                                    value={assignTeacherMap[sub.id] || ""}
                                    onChange={e => setAssignTeacherMap(m => ({ ...m, [sub.id]: e.target.value }))}
                                    className="px-2 py-1.5 text-xs border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[140px]"
                                  >
                                    <option value="">Select teacher…</option>
                                    {staff.filter(s => s.role === "teacher").map(t => (
                                      <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={savingAssign === sub.id || !assignTeacherMap[sub.id]}
                                    onClick={() => handleAssignTeacher(sub.id)}
                                    className="px-2.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg transition-colors"
                                  >
                                    {savingAssign === sub.id ? "…" : "Assign"}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTGCSubject(sub.id)}
                                  className="px-2 py-1.5 text-xs text-red-500 hover:bg-red-500/15 rounded-lg transition-colors"
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
              </div>
            )}

            {/* ADDED: TGC OVERVIEW / ANALYTICS ─────────────────────── */}
            {activeKey === "tgc-overview" && (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
                  <h1 className="text-2xl font-bold">TGC Overview — Sem 6 (2025-26)</h1>
                  <p className="text-emerald-100 text-sm mt-1">Term Grant Certificate analytics and student status.</p>
                </div>

                {tgcLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-[#1a1a2e] rounded-xl animate-pulse" />)}</div>
                ) : (
                  <>
                    {/* Analytics Cards */}
                    {tgcAnalytics && (
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Total Students", value: tgcAnalytics.total_students ?? "—", color: "blue",  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
                          { label: "Fully Approved",  value: tgcAnalytics.fully_approved  ?? "—", color: "green", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
                          { label: "Pending",         value: tgcAnalytics.pending         ?? "—", color: "amber", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
                          { label: "Rejected",        value: tgcAnalytics.rejected        ?? "—", color: "red",   icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
                        ].map(c => <StatCard key={c.label} {...c} />)}
                      </div>
                    )}

                    {/* Subject-wise breakdown */}
                    {tgcAnalytics?.subject_wise?.length > 0 && (
                      <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#1e1e35]">
                          <h3 className="text-sm font-bold text-slate-200">Subject-wise Approval Rates</h3>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {tgcAnalytics.subject_wise.map(s => {
                            const pct = s.total > 0 ? Math.round((s.approved / s.total) * 100) : 0;
                            return (
                              <div key={s.subject_id} className="px-5 py-3 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-200 truncate">{s.subject_name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1.5 bg-[#1a1a2e] rounded-full overflow-hidden max-w-[200px]">
                                      <div className="h-full bg-green-500/150 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-slate-400 shrink-0">{s.approved}/{s.total} ({pct}%)</span>
                                  </div>
                                </div>
                                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full shrink-0">
                                  {s.subject_type || "—"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Students Table */}
                    <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
                      <div className="px-5 py-4 border-b border-[#1e1e35] flex items-center justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-200">All Students — TGC Status</h3>
                        <div className="relative">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={tgcSearchQuery}
                            onChange={e => setTgcSearchQuery(e.target.value)}
                            placeholder="Search…"
                            className="pl-8 pr-3 py-1.5 text-xs border border-[#1e1e35] rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
                          />
                        </div>
                      </div>
                      {tgcStudents.length === 0 ? (
                        <EmptyState title="No student data" desc="No TGC certificate requests yet." />
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#0f0f1b] text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              <tr>
                                <th className="px-5 py-3 text-left">Student</th>
                                <th className="px-4 py-3 text-center">Semester</th>
                                <th className="px-4 py-3 text-center">Approved</th>
                                <th className="px-4 py-3 text-center">Certificate Status</th>
                                <th className="px-4 py-3 text-center">Fee</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {tgcStudents
                                .filter(s => !tgcSearchQuery || (s.name || s.student_name || "").toLowerCase().includes(tgcSearchQuery.toLowerCase()) || (s.email || "").toLowerCase().includes(tgcSearchQuery.toLowerCase()))
                                .map(s => {
                                  const status = s.overall_status || s.certificate_status || "pending";
                                  const statusCls = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                                  return (
                                    <tr key={s.student_id || s.id} className="hover:bg-[#1a1a2e]/50">
                                      <td className="px-5 py-3">
                                        <p className="font-semibold text-white">{s.name || s.student_name}</p>
                                        <p className="text-xs text-slate-400">{s.email} · {s.roll_number}</p>
                                      </td>
                                      <td className="px-4 py-3 text-center text-slate-400">{s.semester || 6}</td>
                                      <td className="px-4 py-3 text-center font-semibold text-slate-300">
                                        {s.approved_count ?? "—"}/{s.total_subjects ?? "—"}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>{status}</span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className={s.fee_cleared ? "text-green-600 font-semibold" : "text-red-500"}>
                                          {s.fee_cleared ? "✓" : "✗"}
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
                  </>
                )}
              </div>
            )}
            {/* CLEARANCE APPROVALS ─────────────────────────────────── */}
            {activeKey === "clearance" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-6 text-white">
                  <h1 className="text-2xl font-bold">Clearance Approvals</h1>
                  <p className="text-violet-100 text-sm mt-1">Review and approve or reject student clearance requests.</p>
                </div>
                {clearanceLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-[#1a1a2e] rounded-xl animate-pulse" />)}</div>
                ) : clearanceRequests.length === 0 ? (
                  <div className="bg-[#111120] rounded-xl border border-[#1e1e35]">
                    <EmptyState title="No clearance requests" desc="No students have submitted clearance requests yet." />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clearanceRequests.map((r) => {
                      const overall = r.status || "pending";
                      const overallPill = overall === "approved" ? "bg-green-100 text-green-700" : overall === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                      const feePill = r.fee_status === "approved" ? "bg-green-100 text-green-700" : r.fee_status === "rejected" ? "bg-red-100 text-red-700" : "bg-[#1a1a2e] text-slate-400";
                      const stagePill = r.current_stage === "completed" ? "bg-green-100 text-green-700" : r.current_stage === "admin" ? "bg-blue-100 text-blue-700" : "bg-[#1a1a2e] text-slate-400";
                      return (
                        <div key={r.id} className="bg-[#111120] rounded-xl border border-[#1e1e35] p-5">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <p className="font-semibold text-white">{r.student_name}</p>
                              <p className="text-xs text-slate-400">{r.student_email} · {r.department || "—"} · {r.roll_number || "—"}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Sem {r.semester || "—"} · Year {r.year || "—"} · Teacher: {r.assigned_teacher_name || "—"}</p>
                              <p className="text-xs text-slate-400">Submitted: {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overallPill}`}>{overall}</span>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${feePill}`}>Fee: {r.fee_status || "pending"}</span>
                              {r.current_stage && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stagePill}`}>Stage: {r.current_stage}</span>}
                            </div>
                          </div>
                          {r.rejection_reason && (
                            <p className="text-xs text-red-600 bg-red-500/15 px-3 py-1.5 rounded-lg mt-2">Reason: {r.rejection_reason}</p>
                          )}
                          {overall !== "approved" && (
                            <div className="mt-4 space-y-2">
                              <textarea
                                value={clearanceRemarksMap[r.id] || ""}
                                onChange={(e) => setClearanceRemarksMap((m) => ({ ...m, [r.id]: e.target.value }))}
                                placeholder="Remarks / rejection reason (required for rejection)…"
                                rows={2}
                                className="w-full px-3 py-2 text-sm border border-[#1e1e35] rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleClearanceApproval(r.id, "approved")}
                                  disabled={processingClearance === r.id}
                                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                                >
                                  {processingClearance === r.id ? "Processing…" : "✓ Approve Clearance"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleClearanceApproval(r.id, "rejected")}
                                  disabled={processingClearance === r.id}
                                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors"
                                >
                                  ✕ Reject
                                </button>
                              </div>
                            </div>
                          )}
                          {overall === "approved" && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-xs text-green-600 font-medium">Clearance fully approved</span>
                              {r.approved_at && <span className="text-xs text-slate-400">{new Date(r.approved_at).toLocaleDateString()}</span>}
                              <button
                                type="button"
                                onClick={() => handleClearanceApproval(r.id, "rejected")}
                                disabled={processingClearance === r.id}
                                className="ml-auto px-3 py-1 bg-red-500/15 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                              >
                                Revoke
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </DashboardLayout>

      {deleteTarget && (
        <ConfirmModal
          isOpen
          title="Delete User"
          message={`Are you sure you want to permanently delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

export default SuperAdminDashboard;
