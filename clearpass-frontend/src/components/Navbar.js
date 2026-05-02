// --- SIDEBAR / NAVBAR ---
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { clearAuth } from "../utils/auth";

const NAV_ICONS = {
  overview:   "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  submit:     "M12 4v16m8-8H4",
  history:    "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  review:     "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  users:      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  requests:   "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  assign:     "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  audit:      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  create:     "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  manage:     "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  subjects:   "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  structure:  "M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z",
  back:       "M11 17l-5-5m0 0l5-5m-5 5h12",
  profile:    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  settings:   "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
};

function NavIcon({ path }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

function Navbar({ title, subtitle, user, navItems, activeKey, onNavigate, actions, isOpen }) {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const handleNavClick = (item) => {
    if (item.href) {
      navigate(item.href);
    } else {
      onNavigate(item.key);
    }
  };

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-64 flex flex-col",
        "bg-panel text-ink transition-transform duration-300 theme-transition",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex",
        "sidebar-scrollbar overflow-y-auto border-r border-subtle",
      ].join(" ")}
      aria-label="Sidebar navigation"
    >
      {/* Brand */}
      <div className="px-6 pt-6 pb-4 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-ink tracking-wide">ClearPass</p>
            <p className="text-[10px] text-ink3 leading-tight">Smart Clearance. Simplified.</p>
          </div>
        </div>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-b border-subtle">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-raised theme-transition">
          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">{user?.name || "Loading\u2026"}</p>
            <p className="text-xs text-ink3 truncate capitalize">{user?.role?.replace("_", " ") || ""}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const isActive = activeKey === item.key;
          const iconPath = NAV_ICONS[item.key] || NAV_ICONS.overview;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group relative",
                isActive
                  ? "bg-violet-500/15 text-violet-700 dark:text-white border-l-2 border-violet-500 rounded-l-none pl-[10px]"
                  : "text-ink2 hover:bg-raised hover:text-ink",
              ].join(" ")}
            >
              <span className={isActive ? "text-violet-500" : "text-ink3 group-hover:text-ink2"}>
                <NavIcon path={iconPath} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                {item.caption && (
                  <p className={`text-xs truncate ${isActive ? "text-violet-500/70" : "text-ink3 group-hover:text-ink3"}`}>
                    {item.caption}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-subtle space-y-1">
        {/* Dark / Light toggle */}
        <button
          type="button"
          onClick={toggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-ink2 hover:bg-raised hover:text-ink transition-all duration-150 text-sm"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.71.71M6.34 17.66l-.71.71M17.66 17.66l-.71-.71M6.34 6.34l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {dark ? "Light mode" : "Dark mode"}
        </button>
        {actions && (
          <div className="w-full">{actions}</div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 text-sm"
          aria-label="Log out"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out
        </button>
      </div>
    </aside>
  );
}

export default Navbar;


