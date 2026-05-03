// --- DASHBOARD LAYOUT ---
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import NotificationBell from "./NotificationBell";

function DashboardLayout({
  title,
  subtitle,
  user,
  navItems,
  activeKey,
  onNavigate,
  headerActions,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    setSidebarOpen(false);
  }, [activeKey]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen flex bg-page theme-transition">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <Navbar
        title={title}
        subtitle={subtitle}
        user={user}
        navItems={navItems}
        activeKey={activeKey}
        onNavigate={(key) => { onNavigate(key); setSidebarOpen(false); }}
        actions={headerActions}
        isOpen={sidebarOpen}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-panel border-b border-subtle sticky top-0 z-20 theme-transition">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-lg text-ink2 hover:bg-raised transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-ink">ClearPass</span>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>

        {/* Desktop top header — persistent */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-panel border-b border-subtle sticky top-0 z-20 theme-transition">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-raised border border-strong w-72 theme-transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-ink3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search anything..."
              className="bg-transparent text-sm text-ink2 placeholder-ink3 outline-none flex-1 min-w-0"
              aria-label="Search"
            />
            <kbd className="shrink-0 text-xs text-ink3 bg-raised border border-subtle px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <NotificationBell />

            {/* User role badge */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-raised border border-strong cursor-default theme-transition">
                <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {initials}
                </div>
                <span className="text-sm text-ink2 capitalize">{user.role?.replace("_", " ") || "User"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;


