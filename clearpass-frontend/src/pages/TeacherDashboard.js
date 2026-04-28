// TeacherDashboard.js — Full redesign per SaaS spec
import { useCallback, useEffect, useRef, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import RequestsTable from "../components/RequestsTable";
import RejectModal from "../components/RejectModal";
import StudentDetailDrawer from "../components/StudentDetailDrawer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

// ADDED: TGC nav tabs
const TGC_NAV = [
  { key: "requests",    label: "Clearance Requests", caption: "Review student clearance"  },
  { key: "subjects",    label: "My TGC Subjects",    caption: "Assigned subjects"         },
  { key: "checklist",  label: "Checklist Builder",  caption: "Manage checklist items"    },
  { key: "approvals",  label: "Student Approvals",  caption: "Approve subject clearance" },
  { key: "assignments",label: "Assignments",         caption: "Create & review assignments"},
];

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

  // Always use server-verified user so stale localStorage can't show wrong name
  const [currentUser, setCurrentUser] = useState(authUser);
  useEffect(() => {
    API.get("/api/auth/me")
      .then(res => { if (res.data?.user) setCurrentUser(res.data.user); })
      .catch(() => {/* keep authUser fallback */});
  }, []);

  // ADDED: active tab state
  const [activeTab, setActiveTab] = useState("requests");

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

  // ADDED: TGC state
  const [mySubjects,       setMySubjects]       = useState([]);
  const [subjectsLoading,  setSubjectsLoading]  = useState(false);
  const [selectedSubject,  setSelectedSubject]  = useState(null);  // subject for checklist/approvals
  const [checklistItems,   setChecklistItems]   = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [newItemForm,      setNewItemForm]       = useState({ item_name: "", item_type: "Assignment", is_required: true });
  const [savingItem,       setSavingItem]        = useState(false);
  const [editingItem,      setEditingItem]       = useState(null); // {id, item_name, item_type, is_required}
  const [studentsData,     setStudentsData]      = useState(null);
  const [studentsLoading,  setStudentsLoading]   = useState(false);
  const [approvingStudent, setApprovingStudent]  = useState(null); // {studentId, subjectId, studentName}
  const [approvalForm,     setApprovalForm]      = useState({ status: "approved", remarks: "", mini_project_status: "" });
  const [expandedStudents, setExpandedStudents]  = useState({});

  // ADDED: Assignment state
  const [myAssignments,       setMyAssignments]       = useState([]);
  const [assignmentsLoading,  setAssignmentsLoading]  = useState(false);
  const [creatingAssignment,  setCreatingAssignment]  = useState(false);
  const [newAssignmentForm,   setNewAssignmentForm]    = useState({ subject_id: "", title: "", description: "", due_date: "", checklist_item_id: "" });
  const [selectedAssignment,  setSelectedAssignment]  = useState(null);
  const [submissions,         setSubmissions]         = useState([]);
  const [submissionsLoading,  setSubmissionsLoading]  = useState(false);
  const [reviewForm,          setReviewForm]          = useState({});

  const ITEM_TYPES = ["Assignment","TA1","TA2","JA1","JA2","Open Assessment","Repeat TA","Remedial Task","Attendance","Exam","Custom"];

  // Quick-add state
  const [showQuickAdd,  setShowQuickAdd]  = useState(false);
  const [bulkAdding,    setBulkAdding]    = useState(false);
  const [quickCategory, setQuickCategory] = useState("Assignment");
  const [quickCount,    setQuickCount]    = useState(5);

  const QUICK_PRESETS = [
    { label: "Assignments",  type: "Assignment",       numbered: true  },
    { label: "TA Tests",     type: "TA1",              numbered: true, types: ["TA1","TA2"] },
    { label: "JA Tests",     type: "JA1",              numbered: true, types: ["JA1","JA2"] },
    { label: "Practicals",   type: "Exam",             numbered: true  },
    { label: "Attendance",   type: "Attendance",       numbered: false },
    { label: "Open Assess.", type: "Open Assessment",  numbered: false },
  ];

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

  // ADDED: TGC callbacks
  const loadMySubjects = useCallback(async () => {
    try {
      setSubjectsLoading(true);
      const res = await API.get("/api/certificate/my-subjects");
      setMySubjects(res.data.subjects || []);
    } catch { /* silent */ } finally { setSubjectsLoading(false); }
  }, []);

  // ADDED: Assignment callbacks
  const loadMyAssignments = useCallback(async () => {
    try {
      setAssignmentsLoading(true);
      const res = await API.get("/api/assignments/my-assignments");
      setMyAssignments(res.data.assignments || []);
    } catch { /* silent */ } finally { setAssignmentsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === "subjects" || activeTab === "checklist" || activeTab === "approvals" || activeTab === "assignments") {
      loadMySubjects();
    }
    if (activeTab === "assignments") {
      loadMyAssignments();
    }
  }, [activeTab, loadMySubjects, loadMyAssignments]);

  const loadChecklist = useCallback(async (subjectId) => {
    if (!subjectId) return;
    try {
      setChecklistLoading(true);
      const res = await API.get(`/api/checklist/subject/${subjectId}`);
      setChecklistItems(res.data.items || []);
    } catch { /* silent */ } finally { setChecklistLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedSubject && activeTab === "checklist") loadChecklist(selectedSubject.id);
  }, [selectedSubject, activeTab, loadChecklist]);

  // Load checklist items when the new-assignment form's subject changes
  useEffect(() => {
    if (newAssignmentForm.subject_id) loadChecklist(Number(newAssignmentForm.subject_id));
  }, [newAssignmentForm.subject_id, loadChecklist]);

  const loadSubmissions = useCallback(async (assignmentId) => {
    try {
      setSubmissionsLoading(true);
      const res = await API.get(`/api/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.students || []);
    } catch { addToast("Failed to load submissions", "error"); } finally { setSubmissionsLoading(false); }
  }, [addToast]);

  const handleCreateAssignment = async () => {
    const { subject_id, title, description, due_date, checklist_item_id } = newAssignmentForm;
    try {
      setCreatingAssignment(true);
      await API.post("/api/assignments", {
        subject_id:        Number(subject_id),
        title,
        description:       description || undefined,
        due_date:          due_date    || undefined,
        checklist_item_id: checklist_item_id ? Number(checklist_item_id) : undefined,
      });
      addToast("Assignment created and students notified", "success");
      setNewAssignmentForm({ subject_id: "", title: "", description: "", due_date: "", checklist_item_id: "" });
      loadMyAssignments();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to create assignment", "error");
    } finally { setCreatingAssignment(false); }
  };

  const handleReviewSubmission = async (submissionId, status, remarks) => {
    try {
      await API.patch(`/api/assignments/submissions/${submissionId}/review`, { status, remarks });
      addToast(`Submission ${status}`, status === "accepted" ? "success" : "info");
      if (selectedAssignment) loadSubmissions(selectedAssignment.id);
      loadMyAssignments();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to review", "error");
    }
  };

  const handleAddChecklistItem = async () => {
    if (!newItemForm.item_name.trim() || !selectedSubject) return;
    try {
      setSavingItem(true);
      await API.post("/api/checklist/create", { subject_id: selectedSubject.id, ...newItemForm });
      setNewItemForm({ item_name: "", item_type: "Assignment", is_required: true });
      loadChecklist(selectedSubject.id);
      addToast("Checklist item added.", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to add item.", "error");
    } finally { setSavingItem(false); }
  };

  // Bulk-create items from Quick Add
  const handleBulkAdd = async (preset) => {
    if (!selectedSubject) return;
    setBulkAdding(true);
    try {
      let items = [];
      if (preset.numbered) {
        if (preset.types) {
          // Fixed types like TA1, TA2 / JA1, JA2
          items = preset.types.map((t, i) => ({
            item_name: `${t}`,
            item_type: t,
            is_required: true,
          }));
        } else {
          for (let i = 1; i <= quickCount; i++) {
            items.push({ item_name: `${preset.label.replace(/s$/, "")} ${i}`, item_type: preset.type, is_required: true });
          }
        }
      } else {
        items = [{ item_name: preset.label, item_type: preset.type, is_required: true }];
      }
      for (const item of items) {
        await API.post("/api/checklist/create", { subject_id: selectedSubject.id, ...item });
      }
      loadChecklist(selectedSubject.id);
      addToast(`Added ${items.length} item${items.length > 1 ? "s" : ""}.`, "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to bulk-add items.", "error");
    } finally { setBulkAdding(false); }
  };

  const handleDeleteChecklistItem = async (itemId) => {
    if (!window.confirm("Delete this checklist item?")) return;
    try {
      await API.delete(`/api/checklist/${itemId}`);
      loadChecklist(selectedSubject.id);
      addToast("Item deleted.", "info");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete.", "error");
    }
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      await API.put(`/api/checklist/${editingItem.id}`, {
        item_name:   editingItem.item_name,
        item_type:   editingItem.item_type,
        is_required: editingItem.is_required,
      });
      setEditingItem(null);
      loadChecklist(selectedSubject.id);
      addToast("Item updated.", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update.", "error");
    }
  };

  const loadStudentsForSubject = useCallback(async (subjectId) => {
    if (!subjectId) return;
    try {
      setStudentsLoading(true);
      const res = await API.get(`/api/checklist/students/${subjectId}`);
      setStudentsData(res.data);
    } catch { /* silent */ } finally { setStudentsLoading(false); }
  }, []);

  useEffect(() => {
    if (selectedSubject && activeTab === "approvals") loadStudentsForSubject(selectedSubject.id);
  }, [selectedSubject, activeTab, loadStudentsForSubject]);

  const handleToggleProgress = async (studentId, itemId, subjectId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await API.post("/api/checklist/progress/upsert", {
        student_id: studentId, checklist_item_id: itemId, subject_id: subjectId, status: newStatus,
      });
      loadStudentsForSubject(subjectId);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update progress.", "error");
    }
  };

  const handleSubjectApproval = async () => {
    if (!approvingStudent) return;
    try {
      await API.post(
        `/api/subjects/${approvingStudent.subjectId}/approve/${approvingStudent.studentId}`,
        approvalForm
      );
      addToast(`Student subject ${approvalForm.status}.`, "success");
      setApprovingStudent(null);
      loadStudentsForSubject(approvingStudent.subjectId);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save approval.", "error");
    }
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
      user={currentUser}
      navItems={[]}
      activeKey=""
      onNavigate={() => {}}
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── SECTION A: Page Header ──────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {greeting()}, {currentUser?.name?.split(" ")[0] || "Teacher"}
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
                {(currentUser?.name || "T").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{currentUser?.name}</span>
            </div>
          </div>
        </div>

        {/* ADDED: Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
          {TGC_NAV.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── SECTION B: Stat Cards (always visible) ─────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            label="Total Students"
            sub="In your department"
            value={stats.total_students}
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

        {/* ── TAB: Clearance Requests ─────────────────────────────── */}
        {activeTab === "requests" && (
          <>
            <FilterBar
              search={search}           onSearchChange={setSearch}
              semester={filterSemester} onSemesterChange={setFilterSemester}
              year={filterYear}         onYearChange={setFilterYear}
              status={filterStatus}     onStatusChange={setFilterStatus}
              onClear={clearFilters}
            />
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
          </>
        )}

        {/* ── TAB: My TGC Subjects ────────────────────────────────── */}
        {activeTab === "subjects" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-800">My Assigned TGC Subjects — Semester 6 (2025-26)</h3>
            </div>
            {subjectsLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : mySubjects.length === 0 ? (
              <div className="p-10 text-center text-sm text-gray-400">No TGC subjects assigned yet.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mySubjects.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{sub.name || sub.subject_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub.code || sub.subject_code} · {sub.subject_type || sub.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => { setSelectedSubject(sub); setActiveTab("checklist"); }}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        Checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedSubject(sub); setActiveTab("approvals"); }}
                        className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      >
                        Students
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Checklist Builder ──────────────────────────────── */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            {/* Subject Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Subject</label>
              <div className="flex gap-2 flex-wrap">
                {mySubjects.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      selectedSubject?.id === sub.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {sub.name || sub.subject_name}
                  </button>
                ))}
                {mySubjects.length === 0 && <p className="text-xs text-gray-400">No subjects assigned.</p>}
              </div>
            </div>

            {selectedSubject && (
              <>
                {/* ── Quick Add Panel ─────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowQuickAdd(q => !q)}
                    className="w-full px-5 py-3 flex items-center justify-between text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Quick Add — Common Assessments
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-400 transition-transform ${showQuickAdd ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showQuickAdd && (
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-gray-50">
                      <p className="text-xs text-gray-400">Create multiple items in one click. Numbered items (e.g. Assignment 1…5) use the count below.</p>

                      {/* Count selector for numbered items */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Count for numbered items:</label>
                        <input
                          type="number"
                          min={1} max={10}
                          value={quickCount}
                          onChange={e => setQuickCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-16 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                        />
                      </div>

                      {/* Preset buttons */}
                      <div className="flex flex-wrap gap-2">
                        {QUICK_PRESETS.map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            disabled={bulkAdding}
                            onClick={() => handleBulkAdd(preset)}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            {preset.numbered && !preset.types ? `${quickCount} ${preset.label}` : preset.label}
                          </button>
                        ))}
                      </div>

                      {bulkAdding && (
                        <div className="flex items-center gap-2 text-xs text-blue-600">
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Adding items…
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Item Form */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">
                    Checklist for: <span className="text-blue-700">{selectedSubject.name || selectedSubject.subject_name}</span>
                  </h3>
                  <div className="flex gap-3 flex-wrap items-end">
                    <div className="flex-1 min-w-48">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={newItemForm.item_name}
                        onChange={e => setNewItemForm(f => ({ ...f, item_name: e.target.value }))}
                        placeholder="e.g. TA1 submission"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                      <select
                        value={newItemForm.item_type}
                        onChange={e => setNewItemForm(f => ({ ...f, item_type: e.target.value }))}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                      <input
                        type="checkbox"
                        id="is_required"
                        checked={newItemForm.is_required}
                        onChange={e => setNewItemForm(f => ({ ...f, is_required: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor="is_required" className="text-xs font-medium text-gray-600">Required</label>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      disabled={savingItem || !newItemForm.item_name.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {savingItem ? "Adding…" : "+ Add Item"}
                    </button>
                  </div>
                </div>

                {/* Existing Items */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      {checklistItems.length} item{checklistItems.length !== 1 ? "s" : ""}
                    </h4>
                    {checklistLoading && <span className="text-xs text-gray-400">Loading…</span>}
                  </div>
                  {checklistItems.length === 0 && !checklistLoading ? (
                    <p className="p-6 text-sm text-center text-gray-400">No checklist items yet. Add one above.</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {checklistItems.map(item => (
                        <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                          {editingItem?.id === item.id ? (
                            <div className="flex gap-2 flex-1 flex-wrap items-center">
                              <input
                                type="text"
                                value={editingItem.item_name}
                                onChange={e => setEditingItem(ei => ({ ...ei, item_name: e.target.value }))}
                                className="flex-1 min-w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none"
                              />
                              <select
                                value={editingItem.item_type}
                                onChange={e => setEditingItem(ei => ({ ...ei, item_type: e.target.value }))}
                                className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                              >
                                {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <button type="button" onClick={handleSaveEditItem} className="px-2 py-1 text-xs bg-green-600 text-white rounded-lg font-medium">Save</button>
                              <button type="button" onClick={() => setEditingItem(null)} className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg font-medium">Cancel</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${item.is_required ? "bg-red-400" : "bg-gray-300"}`} title={item.is_required ? "Required" : "Optional"} />
                                <span className="text-sm text-gray-800 truncate">{item.item_name}</span>
                                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full shrink-0">{item.item_type}</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button type="button" onClick={() => setEditingItem({ id: item.id, item_name: item.item_name, item_type: item.item_type, is_required: item.is_required })} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg">Edit</button>
                                <button type="button" onClick={() => handleDeleteChecklistItem(item.id)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg">Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Student Approvals ──────────────────────────────── */}
        {activeTab === "approvals" && (
          <div className="space-y-4">
            {/* Subject Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Subject</label>
              <div className="flex gap-2 flex-wrap">
                {mySubjects.map(sub => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => { setSelectedSubject(sub); setExpandedStudents({}); }}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      selectedSubject?.id === sub.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {sub.name || sub.subject_name}
                  </button>
                ))}
                {mySubjects.length === 0 && <p className="text-xs text-gray-400">No subjects assigned.</p>}
              </div>
            </div>

            {selectedSubject && (
              <>
                {/* ── Subject Detail Card ─────────────────────────── */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-base font-bold text-gray-900">{selectedSubject.name || selectedSubject.subject_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedSubject.subject_code}
                        {selectedSubject.type     ? ` · ${selectedSubject.type}`     : ""}
                        {selectedSubject.semester ? ` · Sem ${selectedSubject.semester}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        ["Semester", selectedSubject.semester     ?? "—"],
                        ["Type",     selectedSubject.type         || "—"],
                        ["Items",    selectedSubject.checklist_count ?? "—"],
                      ].map(([label, val]) => (
                        <div key={label} className="bg-white/80 rounded-xl px-3 py-2 text-center min-w-[64px]">
                          <p className="text-[10px] text-blue-500 uppercase tracking-wide font-medium">{label}</p>
                          <p className="text-sm font-bold text-gray-800 mt-0.5">{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Checklist item tags */}
                  {studentsData?.items && studentsData.items.length > 0 && (
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      {studentsData.items.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-1 bg-white/80 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full border border-blue-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                          {item.item_name}
                          {item.is_required && <span className="text-blue-400">*</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Students List ────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-800">
                      Students — {selectedSubject.name || selectedSubject.subject_name}
                    </h3>
                    <div className="flex items-center gap-3">
                      {studentsLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
                      {studentsData?.students?.length > 0 && (
                        <span className="text-xs text-gray-400">{studentsData.students.length} student{studentsData.students.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>

                  {!studentsData || (studentsData.students || []).length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-sm text-gray-400">No students have requested certificates yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {(studentsData.students || []).map(stu => {
                        const completed      = (stu.checklist || []).filter(c => c.status === "completed").length;
                        const total          = (stu.checklist || []).length;
                        const pct            = total > 0 ? Math.round((completed / total) * 100) : 0;
                        const approvalStatus = stu.subject_approval_status;
                        const isExpanded     = expandedStudents[stu.student_id];
                        return (
                          <div key={stu.student_id}>
                            {/* ── Summary row ── */}
                            <div className="px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                              {/* Expand chevron */}
                              <button
                                type="button"
                                onClick={() => setExpandedStudents(prev => ({ ...prev, [stu.student_id]: !prev[stu.student_id] }))}
                                className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-50 flex items-center justify-center transition-colors"
                                title="Expand checklist"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>

                              {/* Student info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm leading-tight">{stu.student_name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {[stu.roll_number, stu.enrollment_no, stu.division].filter(Boolean).join(" · ")}
                                  {stu.email && <span className="ml-1">· {stu.email}</span>}
                                </p>
                              </div>

                              {/* Progress bar */}
                              <div className="shrink-0 w-28 hidden sm:block">
                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                  <span>{completed}/{total} done</span>
                                  <span className="font-semibold text-gray-700">{pct}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Status badge */}
                              <span className={`shrink-0 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                approvalStatus === "approved" ? "bg-green-100 text-green-700"
                                : approvalStatus === "rejected" ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                              }`}>
                                {approvalStatus || "pending"}
                              </span>

                              {/* Review button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setApprovingStudent({ studentId: stu.student_id, subjectId: selectedSubject.id, studentName: stu.student_name });
                                  setApprovalForm({ status: approvalStatus || "approved", remarks: stu.approval_remarks || "", mini_project_status: stu.mini_project_status || "" });
                                }}
                                className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                              >
                                Review
                              </button>
                            </div>

                            {/* ── Expanded: full checklist ── */}
                            {isExpanded && (
                              <div className="bg-gray-50 border-t border-gray-100 px-5 pt-3 pb-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                                  Checklist — {stu.student_name}
                                </p>
                                {(stu.checklist || []).length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No checklist items for this subject.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {(stu.checklist || []).map(ci => (
                                      <div key={ci.checklist_item_id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-100 shadow-sm">
                                        <button
                                          type="button"
                                          title={`Toggle: ${ci.item_name}`}
                                          onClick={() => handleToggleProgress(stu.student_id, ci.checklist_item_id, selectedSubject.id, ci.status)}
                                          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors ${
                                            ci.status === "completed" ? "bg-green-500 text-white"
                                            : ci.status === "waived"  ? "bg-gray-300 text-gray-500"
                                            : "bg-gray-200 text-gray-400 hover:bg-blue-100"
                                          }`}
                                        >
                                          {ci.status === "completed" ? "✓" : ci.status === "waived" ? "−" : "○"}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-medium text-gray-700 truncate">{ci.item_name}</p>
                                          <p className="text-[10px] text-gray-400">{ci.item_type}{ci.is_required ? " · required" : ""}</p>
                                        </div>
                                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                          ci.status === "completed" ? "bg-green-50 text-green-700"
                                          : ci.status === "waived"  ? "bg-gray-100 text-gray-500"
                                          : "bg-amber-50 text-amber-700"
                                        }`}>
                                          {ci.status || "pending"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {stu.approval_remarks && (
                                  <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg mt-2 border border-indigo-100">
                                    Remark: {stu.approval_remarks}
                                  </p>
                                )}
                                {stu.mini_project_status && (
                                  <p className="text-xs text-purple-600 mt-1.5">Mini Project: {stu.mini_project_status}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TAB: Assignments ─────────────────────────────────────── */}
        {activeTab === "assignments" && (
          <div className="space-y-4">

            {/* Create Assignment form */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Create New Assignment</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                  <select
                    value={newAssignmentForm.subject_id}
                    onChange={e => setNewAssignmentForm(f => ({ ...f, subject_id: e.target.value, checklist_item_id: "" }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select subject…</option>
                    {mySubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.subject_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    value={newAssignmentForm.title}
                    onChange={e => setNewAssignmentForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Assignment title"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description (optional)</label>
                  <textarea
                    value={newAssignmentForm.description}
                    onChange={e => setNewAssignmentForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Instructions or details…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date (optional)</label>
                    <input
                      type="datetime-local"
                      value={newAssignmentForm.due_date}
                      onChange={e => setNewAssignmentForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Link Checklist Item (optional)</label>
                    <select
                      value={newAssignmentForm.checklist_item_id}
                      onChange={e => setNewAssignmentForm(f => ({ ...f, checklist_item_id: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={!newAssignmentForm.subject_id}
                    >
                      <option value="">None</option>
                      {checklistItems.map(i => (
                        <option key={i.id} value={i.id}>{i.item_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!newAssignmentForm.subject_id || !newAssignmentForm.title.trim() || creatingAssignment}
                  onClick={handleCreateAssignment}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {creatingAssignment ? "Creating…" : "Create Assignment"}
                </button>
              </div>
            </div>

            {/* My Assignments list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">My Assignments</h2>
                <button
                  type="button"
                  onClick={loadMyAssignments}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Refresh
                </button>
              </div>
              {assignmentsLoading ? (
                <div className="p-5 space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : myAssignments.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-400">No assignments created yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {myAssignments.map(asgn => (
                    <div
                      key={asgn.id}
                      className={`px-5 py-3.5 cursor-pointer transition-colors ${selectedAssignment?.id === asgn.id ? "bg-blue-50" : "hover:bg-slate-50/50"}`}
                      onClick={() => {
                        setSelectedAssignment(asgn);
                        loadSubmissions(asgn.id);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{asgn.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {asgn.subject_name}
                            {asgn.due_date && ` · Due ${new Date(asgn.due_date).toLocaleDateString("en-IN")}`}
                          </p>
                        </div>
                        <div className="flex gap-2 text-xs shrink-0 ml-3">
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                            {asgn.pending_review} pending
                          </span>
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            {asgn.accepted} accepted
                          </span>
                          {Number(asgn.rejected) > 0 && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                              {asgn.rejected} rejected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submissions panel */}
            {selectedAssignment && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selectedAssignment.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{selectedAssignment.subject_name} · Submissions</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedAssignment(null); setSubmissions([]); }}
                    className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                    aria-label="Close"
                  >×</button>
                </div>
                {submissionsLoading ? (
                  <div className="p-5 space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No students enrolled for this subject.</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {submissions.map(stu => (
                      <div key={stu.student_id} className="px-5 py-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{stu.student_name}</p>
                            <p className="text-xs text-gray-400">{stu.email}{stu.roll_number ? ` · ${stu.roll_number}` : ""}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0 ml-2 ${
                            !stu.submission_id ? "bg-gray-100 text-gray-500"
                            : stu.submission_status === "accepted" ? "bg-green-100 text-green-700"
                            : stu.submission_status === "rejected" ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                          }`}>
                            {!stu.submission_id ? "Not submitted" : stu.submission_status}
                          </span>
                        </div>

                        {/* Review controls — only when submitted */}
                        {stu.submission_id && stu.submission_status === "submitted" && (
                          <div className="flex gap-2 flex-wrap mt-1">
                            <input
                              type="text"
                              placeholder="Optional remarks…"
                              value={reviewForm[stu.submission_id]?.remarks || ""}
                              onChange={e =>
                                setReviewForm(f => ({
                                  ...f,
                                  [stu.submission_id]: { ...f[stu.submission_id], remarks: e.target.value },
                                }))
                              }
                              className="flex-1 min-w-[120px] px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(stu.submission_id, "accepted", reviewForm[stu.submission_id]?.remarks)}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewSubmission(stu.submission_id, "rejected", reviewForm[stu.submission_id]?.remarks)}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Remarks when already reviewed */}
                        {stu.submission_id && stu.submission_status !== "submitted" && stu.remarks && (
                          <p className="text-xs text-gray-500 italic">Remark: {stu.remarks}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

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

      {/* ADDED: Subject Approval Modal */}
      {approvingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              Subject Approval{approvingStudent?.studentName ? ` — ${approvingStudent.studentName}` : " Decision"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Decision</label>
                <div className="flex gap-2">
                  {["approved","rejected","pending"].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setApprovalForm(f => ({ ...f, status: s }))}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        approvalForm.status === s
                          ? s === "approved" ? "bg-green-600 text-white"
                            : s === "rejected" ? "bg-red-600 text-white"
                            : "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remarks (optional)</label>
                <textarea
                  value={approvalForm.remarks}
                  onChange={e => setApprovalForm(f => ({ ...f, remarks: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add remarks…"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mini Project Status</label>
                <select
                  value={approvalForm.mini_project_status}
                  onChange={e => setApprovalForm(f => ({ ...f, mini_project_status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">N/A</option>
                  <option value="submitted">Submitted</option>
                  <option value="not_submitted">Not Submitted</option>
                  <option value="exempted">Exempted</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setApprovingStudent(null)}
                className="flex-1 py-2.5 text-sm font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubjectApproval}
                className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                Save Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default TeacherDashboard;
