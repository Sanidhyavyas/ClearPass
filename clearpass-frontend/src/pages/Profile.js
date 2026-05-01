// --- PROFILE PAGE ---
import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const ROLE_NAV = {
  student:     [{ key: "profile", label: "Profile", caption: "View and edit your account" }],
  teacher:     [{ key: "profile", label: "Profile", caption: "View and edit your account" }],
  admin:       [{ key: "profile", label: "Profile", caption: "View and edit your account" }],
  super_admin: [{ key: "profile", label: "Profile", caption: "View and edit your account" }],
};

const ROLE_BANNER = {
  student:     "from-blue-600 to-blue-700",
  teacher:     "from-amber-500 to-orange-500",
  admin:       "from-green-600 to-emerald-600",
  super_admin: "from-violet-600 to-purple-600",
};

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#252550] bg-[#111120] text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150 disabled:bg-[#0f0f1b] disabled:text-slate-400";

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", department: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await API.get("/dashboard");
      const u = res.data?.user;
      if (u) {
        setUser(u);
        setForm({ name: u.name || "", email: u.email || "", department: u.department || "" });
      }
    } catch { addToast("Failed to load profile.", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadProfile(); /* eslint-disable-next-line */ }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { addToast("Name cannot be empty.", "warning"); return; }
    try {
      setSaving(true);
      await API.put("/profile", { name: form.name, department: form.department });
      setUser((prev) => ({ ...prev, name: form.name, department: form.department }));
      addToast("Profile updated successfully.", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save changes.", "error");
    } finally { setSaving(false); }
  };

  const role     = user?.role || "student";
  const banner   = ROLE_BANNER[role] || ROLE_BANNER.student;
  const navItems = ROLE_NAV[role]    || ROLE_NAV.student;
  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const roleLabel = (role || "").charAt(0).toUpperCase() + (role || "").slice(1).replace("_", " ");

  return (
    <DashboardLayout
      title="Profile"
      subtitle="Manage your account information."
      user={user}
      navItems={navItems}
      activeKey="profile"
      onNavigate={() => {}}
    >
      {loading ? (
        <div className="max-w-xl space-y-4">
          {[1,2,3].map((i) => <div key={i} className="h-12 bg-slate-200 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6 max-w-xl">
          {/* Avatar card */}
          <div className={`bg-gradient-to-r ${banner} rounded-2xl p-6 flex items-center gap-4 text-white`}>
            <div className="w-16 h-16 rounded-full bg-[#111120]/20 flex items-center justify-center text-2xl font-bold border-2 border-white/30 shrink-0" aria-label="User initials">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user?.name}</h1>
              <p className="text-sm opacity-80">{user?.email}</p>
              <span className="mt-1 inline-block text-xs font-medium bg-[#111120]/20 px-2 py-0.5 rounded-full">{roleLabel}</span>
            </div>
          </div>

          {/* Edit form */}
          <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Edit Profile</h2>
            <form onSubmit={handleSave} className="space-y-4" noValidate>
              <div>
                <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input id="profile-name" type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" className={inputClass} />
              </div>
              <div>
                <label htmlFor="profile-email" className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input id="profile-email" type="email" value={form.email} disabled className={inputClass} aria-label="Email cannot be changed" />
                <p className="mt-1 text-xs text-slate-400">Email address cannot be changed.</p>
              </div>
              <div>
                <label htmlFor="profile-dept" className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <input id="profile-dept" type="text" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} placeholder="e.g. Computer Science" className={inputClass} />
              </div>
              <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all duration-150">
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Read-only info */}
          <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Account Details</h2>
            <dl className="space-y-3 text-sm">
              {[["Role", roleLabel], ["Student ID / ID", user?.student_id || user?.id || "—"], ["Clearance Status", user?.clearance_status || "—"], ["Account Created", user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-[#1e1e35] last:border-b-0">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-800 capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ProfilePage;
