// TeacherDashboard.js — Full redesign per SaaS spec
import { useCallback, useEffect, useRef, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import RequestsTable from "../components/RequestsTable";
import RejectModal from "../components/RejectModal";
import StudentDetailDrawer from "../components/StudentDetailDrawer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, sub, value, iconPath, colorClass, pulseDot }) {
  return (
    <div className="rounded-xl shadow-sm bg-white p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          {pulseDot ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          )}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Notifications bell ────────────────────────────────────────────────────
function NotificationsBell({ count, notifications, open, onToggle, onMarkAllRead }) {
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onToggle(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onToggle(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
            {count > 0 && (
              <button type="button" onClick={onMarkAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No new notifications</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? "text-gray-400" : "text-gray-700 bg-blue-50/40"}`}>
                  <p className="font-medium">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {n.time ? new Date(n.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────────────────
function FilterBar({ search, onSearchChange, semester, onSemesterChange, year, onYearChange, status, onStatusChange, onClear }) {
  const hasFilters = search || semester || year || status;
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or roll number…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Semester */}
      <select
        value={semester}
        onChange={(e) => onSemesterChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Semesters</option>
        {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
      </select>

      {/* Year */}
      <select
        value={year}
        onChange={(e) => onYearChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Years</option>
        {[1,2,3,4].map((y) => <option key={y} value={y}>Year {y}</option>)}
      </select>

      {/* Status */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      {/* Clear */}
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
function TeacherDashboard() {
  const { user: authUser } = useAuth();
  const { addToast }       = useToast();

  const [stats, setStats]     = useState({ total: 0, pending: 0, approved: 0, rejected: 0, overdue: 0 });
  const [requests, setRequests] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]       = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSemester, setFilterSemester]   = useState("");
  const [filterYear, setFilterYear]           = useState("");
  const [filterStatus, setFilterStatus]       = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  // Modals / drawer
  const [rejectTarget, setRejectTarget]       = useState(null);
  const [drawerRequestId, setDrawerRequestId] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [notifOpen, setNotifOpen]         = useState(false);
  const prevPendingRef = useRef(null);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, filterSemester, filterYear, filterStatus]);

  const loadStats = useCallback(async () => {
    try {
      const res = await API.get("/api/teacher/stats");
      setStats(res.data.data || {});
    } catch { /* silent */ }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/teacher/requests", {
        params: {
          page,
          limit: LIMIT,
          search:   debouncedSearch || undefined,
          semester: filterSemester  || undefined,
          year:     filterYear      || undefined,
          status:   filterStatus    || undefined,
        },
      });
      const d = res.data.data || {};
      setRequests(d.requests || []);
      setTotalCount(d.total   || 0);
    } catch {
      addToast("Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterSemester, filterYear, filterStatus, addToast]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadRequests();
  }, [loadStats, loadRequests]);

  // Poll for new pending requests every 10s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await API.get("/api/teacher/requests", { params: { status: "pending", page: 1, limit: 1 } });
        const cur = res.data.data?.total || 0;
        if (prevPendingRef.current !== null && cur > prevPendingRef.current) {
          const diff = cur - prevPendingRef.current;
          addToast(`${diff} new clearance request${diff > 1 ? "s" : ""} received`, "info");
          setUnreadCount((c) => c + diff);
          setNotifications((prev) => [
            { id: Date.now(), message: `${diff} new request${diff > 1 ? "s" : ""} arrived`, time: new Date(), read: false },
            ...prev.slice(0, 4),
          ]);
          loadRequests();
          loadStats();
        }
        prevPendingRef.current = cur;
      } catch { /* silent */ }
    };

    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }, [addToast, loadRequests, loadStats]);

  // Actions
  const handleApprove = async (requestId) => {
    try {
      await API.post(`/api/teacher/approve/${requestId}`);
      addToast("Request approved successfully", "success");
      loadRequests();
      loadStats();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to approve", "error");
    }
  };

  const handleRejectConfirm = async (requestId, reason) => {
    try {
      await API.post(`/api/teacher/reject/${requestId}`, { rejection_reason: reason });
      addToast("Request rejected", "info");
      setRejectTarget(null);
      loadRequests();
      loadStats();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject", "error");
    }
  };

  const clearFilters = () => {
    setSearch(""); setFilterSemester(""); setFilterYear(""); setFilterStatus("");
    setPage(1);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <DashboardLayout
      title="Teacher"
      subtitle="Manage clearance requests"
      user={authUser}
      navItems={[]}
      activeKey=""
      onNavigate={() => {}}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── SECTION A: Page Header ──────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {greeting()}, {authUser?.name?.split(" ")[0] || "Teacher"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Here's what needs your attention today.</p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <NotificationsBell
              count={unreadCount}
              notifications={notifications}
              open={notifOpen}
              onToggle={setNotifOpen}
              onMarkAllRead={() => {
                setUnreadCount(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
              }}
            />
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {(authUser?.name || "T").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{authUser?.name}</span>
            </div>
          </div>
        </div>

        {/* ── SECTION B: Stat Cards ───────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Students"
            sub="In your department"
            value={stats.total}
            iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0"
            colorClass="bg-blue-100 text-blue-600"
          />
          <StatCard
            label="Pending"
            sub="Awaiting your review"
            value={stats.pending}
            iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            colorClass="bg-amber-100 text-amber-600"
          />
          <StatCard
            label="Approved"
            sub="This semester"
            value={stats.approved}
            iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            colorClass="bg-green-100 text-green-600"
          />
          <StatCard
            label="Rejected"
            sub="This semester"
            value={stats.rejected}
            iconPath="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            colorClass="bg-red-100 text-red-600"
          />
          {stats.overdue > 0 && (
            <StatCard
              label="Overdue"
              sub="Need immediate action"
              value={stats.overdue}
              colorClass="bg-red-100 text-red-600"
              pulseDot
            />
          )}
        </div>

        {/* ── SECTION C: Filter + Search ──────────────────────────── */}
        <FilterBar
          search={search}           onSearchChange={setSearch}
          semester={filterSemester} onSemesterChange={setFilterSemester}
          year={filterYear}         onYearChange={setFilterYear}
          status={filterStatus}     onStatusChange={setFilterStatus}
          onClear={clearFilters}
        />

        {/* ── SECTION D: Requests Table ───────────────────────────── */}
        <RequestsTable
          requests={requests}
          loading={loading}
          page={page}
          totalCount={totalCount}
          limit={LIMIT}
          onPageChange={setPage}
          onApprove={handleApprove}
          onReject={setRejectTarget}
          onView={(r) => setDrawerRequestId(r.id)}
        />
      </div>

      {/* ── SECTION E: Reject Modal ──────────────────────────────── */}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
        />
      )}

      {/* ── SECTION F: Student Detail Drawer ────────────────────── */}
      {drawerRequestId && (
        <StudentDetailDrawer
          requestId={drawerRequestId}
          onClose={() => setDrawerRequestId(null)}
          onApprove={handleApprove}
          onReject={(r) => { setDrawerRequestId(null); setRejectTarget(r); }}
        />
      )}
    </DashboardLayout>
  );
}

export default TeacherDashboard;
