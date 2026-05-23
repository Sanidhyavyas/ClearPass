// --- SETTINGS PAGE ---
import { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [{ key: "settings", label: "Settings", caption: "Account and security preferences" }];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#252550] bg-[#111120] text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150";

function SettingsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    document.title = "Settings – ClearPass";
    return () => { document.title = "ClearPass"; };
  }, []);

  // Notification toggles
  const [notifications, setNotifications] = useState({ emailUpdates: true, requestApproval: true, requestRejection: true, weeklyDigest: false });

  // Password form
  const [pwForm, setPwForm]   = useState({ current: "", newPw: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  // Per-field password visibility — each field can be toggled independently
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const toggleField = (field) => setShowPw((prev) => ({ ...prev, [field]: !prev[field] }));

  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { key: "account",       label: "Account"       },
    { key: "notifications", label: "Notifications" },
    { key: "security",      label: "Security"      },
  ];

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.current)         errs.current = "Current password is required.";
    if (pwForm.newPw.length < 8) errs.newPw   = "New password must be at least 8 characters.";
    if (!/[A-Z]/.test(pwForm.newPw)) errs.newPw = errs.newPw || "New password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(pwForm.newPw)) errs.newPw = errs.newPw || "New password must contain at least one number.";
    if (pwForm.newPw !== pwForm.confirm) errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    try {
      setPwSaving(true);
      await API.put("/change-password", { currentPassword: pwForm.current, newPassword: pwForm.newPw });
      addToast("Password changed successfully.", "success");
      setPwForm({ current: "", newPw: "", confirm: "" });
      setPwErrors({});
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to change password.", "error");
    } finally { setPwSaving(false); }
  };

  const Toggle = ({ id, label, desc, checked, onChange }) => (
    <div className="flex items-start justify-between py-4 border-b border-[#1e1e35] last:border-b-0">
      <div className="pr-4">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${checked ? "bg-blue-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#111120] shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </div>
  );

  const PwField = ({ id, fieldKey, label, value, onChange, error, placeholder }) => (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={showPw[fieldKey] ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder || "••••••••"}
          className={`${inputClass} pr-10`}
          autoComplete="new-password"
        />
        <button
          type="button"
          aria-label={showPw[fieldKey] ? `Hide ${label}` : `Show ${label}`}
          onClick={() => toggleField(fieldKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
        >
          {showPw[fieldKey]
            ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          }
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage your preferences."
      user={user}
      navItems={navItems}
      activeKey="settings"
      onNavigate={() => {}}
    >
      <div className="max-w-xl space-y-5">
        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-150 ${activeTab === t.key ? "bg-[#111120] text-white shadow-sm" : "text-slate-500 hover:text-slate-300"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ACCOUNT */}
        {activeTab === "account" && (
          <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6 space-y-4">
            <h2 className="text-base font-semibold text-white">Account Information</h2>
            <dl className="space-y-0 text-sm divide-y divide-slate-100">
              {[["Display Name", user?.name || "—"], ["Email", user?.email || "—"], ["Role", (user?.role || "").charAt(0).toUpperCase() + (user?.role || "").slice(1).replace("_", " ") || "—"], ["Department", user?.department || "—"]].map(([k, v]) => (
                <div key={k} className="flex justify-between py-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-slate-400">To edit your name or department, visit the Profile page.</p>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6">
            <h2 className="text-base font-semibold text-white mb-1">Notification Preferences</h2>
            <p className="text-xs text-slate-400 mb-4">Choose which events trigger email notifications.</p>
            <Toggle id="toggle-updates"    label="Email Updates"      desc="Receive general product and system updates."     checked={notifications.emailUpdates}    onChange={(v) => setNotifications((p) => ({ ...p, emailUpdates: v }))} />
            <Toggle id="toggle-approval"   label="Request Approved"   desc="Get notified when a clearance is approved."      checked={notifications.requestApproval} onChange={(v) => setNotifications((p) => ({ ...p, requestApproval: v }))} />
            <Toggle id="toggle-rejection"  label="Request Rejected"   desc="Get notified when a clearance is rejected."      checked={notifications.requestRejection} onChange={(v) => setNotifications((p) => ({ ...p, requestRejection: v }))} />
            <Toggle id="toggle-digest"     label="Weekly Digest"      desc="A Sunday summary of your account activity."      checked={notifications.weeklyDigest}    onChange={(v) => setNotifications((p) => ({ ...p, weeklyDigest: v }))} />
            <button
              type="button"
              onClick={() => addToast("Notification preferences saved.", "success")}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all duration-150"
            >
              Save Preferences
            </button>
          </div>
        )}

        {/* SECURITY */}
        {activeTab === "security" && (
          <div className="bg-[#111120] rounded-xl border border-[#1e1e35] p-6">
            <h2 className="text-base font-semibold text-white mb-4">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4" noValidate>
              <PwField id="pw-current" fieldKey="current" label="Current Password"    value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} error={pwErrors.current} placeholder="Your current password" />
              <PwField id="pw-new"     fieldKey="newPw"   label="New Password"         value={pwForm.newPw}   onChange={(e) => setPwForm((p) => ({ ...p, newPw:   e.target.value }))} error={pwErrors.newPw} />
              <PwField id="pw-confirm" fieldKey="confirm" label="Confirm New Password" value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} error={pwErrors.confirm} />
              <button type="submit" disabled={pwSaving} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all duration-150">
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#1e1e35]">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Security Tips</h3>
              <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                <li>Use a unique password not shared with other sites.</li>
                <li>Include uppercase letters, numbers, and symbols.</li>
                <li>Change your password periodically.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;
