// --- SUPER ADMIN DASHBOARD ---
import { useEffect, useState } from "react";

import ConfirmModal from "../components/ConfirmModal";
import DashboardLayout from "../components/DashboardLayout";
import { SkeletonCard } from "../components/LoadingSkeleton";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [
  { key: "overview", label: "Overview",          caption: "Platform-wide metrics"           },
  { key: "create",   label: "Create User",       caption: "Add a new account"               },
  { key: "manage",   label: "Manage Users",      caption: "Edit or remove accounts"         },
  { key: "modules",  label: "Module Assignments",caption: "Assign staff to clearance modules" },
];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-150";

const ROLES = ["student", "teacher", "admin", "super_admin"];

function StatCard({ label, value, color = "default", icon }) {
  const colorMap = {
    default: { text: "text-slate-900",   icon: "bg-slate-100 text-slate-600"   },
    blue:    { text: "text-blue-700",    icon: "bg-blue-50 text-blue-600"      },
    amber:   { text: "text-amber-700",   icon: "bg-amber-50 text-amber-600"    },
    green:   { text: "text-green-700",   icon: "bg-green-50 text-green-600"    },
    red:     { text: "text-red-700",     icon: "bg-red-50 text-red-600"        },
    purple:  { text: "text-purple-700",  icon: "bg-purple-50 text-purple-600"  },
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

const EMPTY_FORM = { name: "", email: "", password: "", role: "student", department: "", clearanceStatus: "incomplete" };

// Defined at module scope to prevent unmount/remount on every re-render (focus loss bug)
function Field({ label, id, children, error }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
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
      <tr className="border-b border-slate-100 bg-slate-50/60">
        {cols.map((c) => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{c}</th>)}
      </tr>
    </thead>
  );

  const headerActions = (
    <button type="button" onClick={loadData} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-150 text-sm" aria-label="Refresh dashboard">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      Refresh
    </button>
  );

  const editF = editingUser?.form;
  const setEditF = (key, val) => setEditingUser((eu) => ({ ...eu, form: { ...eu.form, [key]: val } }));

  const formCard = (title, onSubmit, f, setF, btnLabel, cancelFn) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg w-full">
      <h2 className="text-lg font-bold text-slate-900 mb-5">{title}</h2>
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
            <button type="button" onClick={cancelFn} className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-all duration-150">Cancel</button>
          )}
        </div>
      </form>
    </div>
  );

  const roleColor = { student: "bg-blue-50 text-blue-700 ring-blue-200", teacher: "bg-amber-50 text-amber-700 ring-amber-200", admin: "bg-green-50 text-green-700 ring-green-200", super_admin: "bg-purple-50 text-purple-700 ring-purple-200" };

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
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Platform Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                    {[["Total Requests", stats.totalRequests ?? "—"], ["Pending Requests", stats.pendingRequests ?? "—"], ["Approved", stats.approvedRequests ?? "—"]].map(([k, v]) => (
                      <div key={k} className="border border-slate-100 rounded-lg p-3">
                        <p className="text-xs text-slate-400">{k}</p>
                        <p className="text-lg font-bold text-slate-800 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CREATE USER */}
            {activeKey === "create" && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Create New User</h2>
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
                  <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 sm:w-44" aria-label="Filter by role">
                    <option value="all">All roles</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1).replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  {filteredUsers.length === 0 ? (
                    <EmptyState title="No users found" desc="Try adjusting your search or role filter." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" aria-label="Users management table">
                        <THead cols={["Name", "Email", "Role", "Department", ""]} />
                        <tbody className="divide-y divide-slate-100">
                          {filteredUsers.map((u) => (
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 capitalize ${roleColor[u.role] || "bg-slate-50 text-slate-600 ring-slate-200"}`}>{u.role?.replace("_", " ")}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">{u.department || "—"}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2 justify-end">
                                  <button type="button" onClick={() => startEdit(u)} className="px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-md transition-all duration-150">Edit</button>
                                  <button type="button" onClick={() => setDeleteTarget(u)} className="px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-all duration-150">Delete</button>
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
                <button type="button" onClick={() => { setEditingUser(null); setFormErrors({}); }} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  Back to Users
                </button>
                <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
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
                        <div key={mod.module_name} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{label}</p>
                            {currentStaff ? (
                              <p className="text-xs text-slate-500 mt-0.5">Currently: {currentStaff.name} ({currentStaff.email})</p>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5">No one assigned</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={currentSelection}
                              onChange={(e) => setModuleSelections((m) => ({ ...m, [mod.module_name]: e.target.value }))}
                              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
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
