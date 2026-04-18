// --- SUBJECT PICKER MODAL ---
import { useEffect, useMemo, useState } from "react";

import API from "../services/api";

export default function SubjectPickerModal({ year, semester, excludeIds = [], onClose, onAdd }) {
  const [allSubjects, setAllSubjects] = useState([]);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState(new Set());
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const res = await API.get("/api/admin/subjects", {
          params: { active: "true", limit: 200 },
        });
        setAllSubjects(res.data.subjects || []);
      } catch {
        setAllSubjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const available = useMemo(() => {
    const excludeSet = new Set(excludeIds.map(Number));
    const q = search.trim().toLowerCase();
    return allSubjects.filter((s) => {
      if (excludeSet.has(s.id)) return false;
      if (!q)                   return true;
      return (
        s.subject_code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.department || "").toLowerCase().includes(q)
      );
    });
  }, [allSubjects, excludeIds, search]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCredits = useMemo(() => {
    return allSubjects
      .filter((s) => selected.has(s.id))
      .reduce((sum, s) => sum + Number(s.credits), 0);
  }, [allSubjects, selected]);

  const handleAdd = () => {
    if (selected.size === 0) return;
    onAdd(Array.from(selected));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Add subjects to Year ${year}, Semester ${semester}`}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Add Subjects</h2>
            <p className="text-xs text-slate-400 mt-0.5">Year {year} · Semester {semester}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code, name or department…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search subjects"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-5 py-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : available.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm text-slate-500">{search ? "No subjects match your search." : "All subjects are already assigned to this slot."}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100" role="listbox" aria-multiselectable="true">
              {available.map((s) => {
                const isChecked = selected.has(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isChecked}
                      onClick={() => toggleSelect(s.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors ${isChecked ? "bg-blue-50/60" : ""}`}
                    >
                      {/* Checkbox */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>
                        {isChecked && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{s.subject_code}</span>
                          {s.is_elective ? <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Elective</span> : null}
                        </div>
                        <p className="text-sm text-slate-800 mt-0.5 truncate">{s.name}</p>
                        {s.department && <p className="text-xs text-slate-400 truncate">{s.department}</p>}
                      </div>

                      {/* Credits badge */}
                      <span className="shrink-0 text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{s.credits} cr</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            {selected.size > 0 ? (
              <span><strong className="text-slate-800">{selected.size}</strong> selected · <strong className="text-blue-700">{selectedCredits}</strong> credits</span>
            ) : (
              "Select subjects to add"
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-150"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
