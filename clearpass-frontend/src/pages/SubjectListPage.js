// --- SUBJECT LIST PAGE ---
import { useCallback, useEffect, useState } from "react";

import AddEditSubjectModal from "../components/AddEditSubjectModal";
import DashboardLayout from "../components/DashboardLayout";
import { SkeletonTableRows } from "../components/LoadingSkeleton";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const DEPARTMENTS = [
  "Computer Science", "Information Technology", "Mathematics", "Physics",
  "Chemistry", "Biology", "Literature", "History", "Economics",
  "Engineering", "Business Administration", "Other",
];

const navItems = [
  { key: "subjects",   label: "Subjects",            caption: "Manage all subjects",              href: "/super-admin/subjects"  },
  { key: "structure",  label: "Academic Structure",   caption: "Year & semester mapping",          href: "/super-admin/structure" },
  { key: "back",       label: "Super Admin Home",     caption: "Back to main dashboard",           href: "/super-admin"           },
];

const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-[#252550] bg-[#111120] text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150";

function EmptyState({ filtered }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
      <p className="text-sm font-semibold text-slate-600">
        {filtered ? "No subjects match your filters." : "No subjects yet."}
      </p>
      <p className="text-xs text-slate-400 mt-1">
        {filtered ? "Try adjusting the search or filters." : "Add your first subject to get started."}
      </p>
    </div>
  );
}

function MappingPill({ label }) {
  return (
    <span className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded">
      {label}
    </span>
  );
}

function SubjectListPage() {
  const [subjects, setSubjects]     = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch]         = useState("");
  const [dept, setDept]             = useState("");
  const [activeFilter, setActive]   = useState("");
  const [loading, setLoading]       = useState(true);
  const [modalSubject, setModal]    = useState(undefined); // undefined=closed, null=new, obj=edit
  const [toggling, setToggling]     = useState(null);
  const { addToast }                = useToast();

  const loadSubjects = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search)       params.search     = search;
      if (dept)         params.department = dept;
      if (activeFilter) params.active     = activeFilter;
      const res = await API.get("/api/admin/subjects", { params });
      setSubjects(res.data.subjects || []);
      setPagination(res.data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch {
      addToast("Failed to load subjects.", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dept, activeFilter]);

  useEffect(() => { loadSubjects(1); }, [loadSubjects]);

  const handleToggleActive = async (subject) => {
    try {
      setToggling(subject.id);
      await API.put(`/api/admin/subjects/${subject.id}`, {
        isActive: !subject.is_active,
      });
      addToast(`Subject ${subject.is_active ? "deactivated" : "activated"}.`, "success");
      loadSubjects(pagination.page);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update status.", "error");
    } finally {
      setToggling(null);
    }
  };

  const isFiltered = Boolean(search || dept || activeFilter);

  return (
    <DashboardLayout
      title="Subject Management"
      subtitle="Create and organise academic subjects."
      user={null}
      navItems={navItems}
      activeKey="subjects"
      onNavigate={() => {}}
    >
      <div className="space-y-5">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Manage Subjects</h1>
            <p className="text-sm text-slate-500 mt-0.5">{pagination.total} subject{pagination.total !== 1 ? "s" : ""} in total</p>
          </div>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Subject
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or name…"
              className={`${inputClass} pl-9`}
              aria-label="Search subjects"
            />
          </div>
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-52"
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActive(e.target.value)}
            className="px-3 py-2.5 text-sm border border-[#252550] rounded-lg bg-[#111120] focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-36"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-[#111120] rounded-xl border border-[#1e1e35] overflow-hidden">
          {loading ? (
            <table className="w-full text-sm" aria-label="Loading subjects">
              <thead>
                <tr className="border-b border-[#1e1e35] bg-[#0f0f1b]/60">
                  {["Code", "Name", "Credits", "Department", "Mapped to", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SkeletonTableRows rows={5} cols={7} />
              </tbody>
            </table>
          ) : subjects.length === 0 ? (
            <EmptyState filtered={isFiltered} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Subjects table">
                <thead>
                  <tr className="border-b border-[#1e1e35] bg-[#0f0f1b]/60">
                    {["Code", "Name", "Credits", "Department", "Mapped to", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((s) => (
                    <tr key={s.id} className="hover:bg-[#1a1a2e]/60 transition-colors">
                      {/* Code */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">{s.subject_code}</span>
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{s.name}</p>
                        {s.is_elective ? <span className="text-xs text-amber-600">Elective</span> : null}
                      </td>
                      {/* Credits */}
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold text-slate-300 bg-slate-100 rounded-full px-2.5 py-0.5">{s.credits}</span>
                      </td>
                      {/* Department */}
                      <td className="px-4 py-3 text-slate-500 text-sm">{s.department || <span className="text-slate-300">—</span>}</td>
                      {/* Mapped to */}
                      <td className="px-4 py-3">
                        {s.mappings && s.mappings.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.mappings.map((m) => <MappingPill key={m} label={m} />)}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">Not mapped</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-green-50 text-green-700 ring-1 ring-green-200" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-500" : "bg-slate-400"}`} />
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setModal(s)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            aria-label={`Edit ${s.name}`}
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {/* Toggle active */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(s)}
                            disabled={toggling === s.id}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${s.is_active ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                            aria-label={s.is_active ? `Deactivate ${s.name}` : `Activate ${s.name}`}
                            title={s.is_active ? "Deactivate" : "Activate"}
                          >
                            {toggling === s.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={s.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} /></svg>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Page {pagination.page} of {pagination.totalPages} · {pagination.total} subjects</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => loadSubjects(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg border border-[#252550] text-slate-300 disabled:opacity-40 hover:bg-[#1a1a2e] transition-colors text-xs font-medium"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => loadSubjects(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-[#252550] text-slate-300 disabled:opacity-40 hover:bg-[#1a1a2e] transition-colors text-xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalSubject !== undefined && (
        <AddEditSubjectModal
          subject={modalSubject}
          onClose={() => setModal(undefined)}
          onSaved={() => { setModal(undefined); loadSubjects(pagination.page); }}
        />
      )}
    </DashboardLayout>
  );
}

export default SubjectListPage;
