// --- ACADEMIC STRUCTURE PAGE ---
import { useCallback, useEffect, useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import DashboardLayout from "../components/DashboardLayout";
import SubjectPickerModal from "../components/SubjectPickerModal";
import { useToast } from "../context/ToastContext";
import API from "../services/api";

const navItems = [
  { key: "subjects",   label: "Subjects",            caption: "Manage all subjects",      href: "/super-admin/subjects"  },
  { key: "structure",  label: "Academic Structure",   caption: "Year & semester mapping",  href: "/super-admin/structure" },
  { key: "back",       label: "Super Admin Home",     caption: "Back to main dashboard",   href: "/super-admin"           },
];

// Deep clone structure for local mutation
const cloneStructure = (s) =>
  Object.fromEntries(
    Object.entries(s).map(([y, sems]) => [
      y,
      Object.fromEntries(Object.entries(sems).map(([sem, arr]) => [sem, [...arr]])),
    ])
  );

// ── Sortable subject card ─────────────────────────────────────────────────────
function SortableCard({ subject, onRemove, removing }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subject.mapping_id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border border-slate-200 flex items-center gap-2 px-3 py-2.5 select-none group"
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
        aria-label="Drag to reorder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" /></svg>
      </button>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-blue-700">{subject.subject_code}</span>
          {subject.is_elective ? (
            <span className="text-xs text-amber-600 bg-amber-50 px-1 rounded">Elective</span>
          ) : null}
        </div>
        <p className="text-xs text-slate-600 truncate mt-0.5">{subject.name}</p>
      </div>

      {/* Credits badge */}
      <span className="shrink-0 text-xs font-semibold bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
        {subject.credits} cr
      </span>

      {/* Remove */}
      <button
        type="button"
        onClick={() => onRemove(subject.mapping_id)}
        disabled={removing === subject.mapping_id}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150 disabled:opacity-50"
        aria-label={`Remove ${subject.name} from slot`}
      >
        {removing === subject.mapping_id ? (
          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        )}
      </button>
    </div>
  );
}

// ── Semester panel ────────────────────────────────────────────────────────────
function SemesterPanel({ year, semester, subjects, onDragEnd, onRemove, onAdd, removing, dirty }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const totalCredits = subjects.reduce((s, sub) => s + Number(sub.credits), 0);
  const ids = subjects.map((s) => s.mapping_id);

  return (
    <div className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">
          Semester {semester}
          {dirty && <span className="ml-2 text-xs text-amber-500 font-normal">(unsaved changes)</span>}
        </h3>
        <span className="text-xs text-slate-400 font-medium">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 min-h-[160px]">
        {subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <p className="text-xs">No subjects yet</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onDragEnd(e, year, semester)}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {subjects.map((s) => (
                <SortableCard key={s.mapping_id} subject={s} onRemove={(id) => onRemove(id, year, semester)} removing={removing} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
        <span className="text-xs text-slate-500">
          Total: <strong className="text-slate-800">{totalCredits}</strong> credits
        </span>
        <button
          type="button"
          onClick={() => onAdd(year, semester)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors duration-150"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add subject
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function AcademicStructurePage() {
  const [structure, setStructure]   = useState(null);
  const [dirtySlots, setDirty]      = useState({});  // { "y-s": true }
  const [activeYear, setYear]       = useState(1);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [removing, setRemoving]     = useState(null);
  const [picker, setPicker]         = useState(null); // { year, semester }
  const { addToast }                = useToast();

  const loadStructure = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/admin/subjects/structure");
      setStructure(res.data.structure);
      setDirty({});
    } catch {
      addToast("Failed to load academic structure.", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadStructure(); }, [loadStructure]);

  const markDirty = (year, semester) =>
    setDirty((p) => ({ ...p, [`${year}-${semester}`]: true }));

  const handleDragEnd = (event, year, semester) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setStructure((prev) => {
      const next = cloneStructure(prev);
      const arr  = next[year][semester];
      const from = arr.findIndex((s) => s.mapping_id === active.id);
      const to   = arr.findIndex((s) => s.mapping_id === over.id);
      next[year][semester] = arrayMove(arr, from, to);
      return next;
    });
    markDirty(year, semester);
  };

  const handleRemove = async (mappingId, year, semester) => {
    try {
      setRemoving(mappingId);
      await API.delete(`/api/admin/subjects/map/${mappingId}`);
      setStructure((prev) => {
        const next = cloneStructure(prev);
        next[year][semester] = next[year][semester].filter((s) => s.mapping_id !== mappingId);
        return next;
      });
      addToast("Subject removed from slot.", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to remove subject.", "error");
    } finally {
      setRemoving(null);
    }
  };

  const handleAdd = (year, semester) => setPicker({ year, semester });

  const handlePickerAdd = async (subjectIds) => {
    const { year, semester } = picker;
    setPicker(null);
    try {
      await Promise.all(
        subjectIds.map((id) =>
          API.post("/api/admin/subjects/map", { subjectId: id, year, semester })
        )
      );
      addToast(`${subjectIds.length} subject${subjectIds.length > 1 ? "s" : ""} added to Y${year}S${semester}.`, "success");
      await loadStructure();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to add subjects.", "error");
    }
  };

  const handleSaveOrder = async () => {
    const slots = Object.keys(dirtySlots);
    if (slots.length === 0) { addToast("No unsaved changes.", "info"); return; }
    try {
      setSaving(true);
      await Promise.all(
        slots.map((key) => {
          const [year, semester] = key.split("-").map(Number);
          const orderedMappingIds = structure[year][semester].map((s) => s.mapping_id);
          return API.post("/api/admin/subjects/reorder", { year, semester, orderedMappingIds });
        })
      );
      setDirty({});
      addToast("Order saved successfully.", "success");
    } catch {
      addToast("Failed to save order.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasDirty     = Object.keys(dirtySlots).length > 0;
  const currentSlots = structure ? structure[activeYear] : null;

  // Subjects already in picker''s slot (to exclude from picker)
  const pickerExcludeIds = picker && structure
    ? structure[picker.year][picker.semester].map((s) => s.id)
    : [];

  return (
    <DashboardLayout
      title="Academic Structure"
      subtitle="Map subjects to year and semester slots."
      user={null}
      navItems={navItems}
      activeKey="structure"
      onNavigate={() => {}}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Academic Structure</h1>
            <p className="text-sm text-slate-500 mt-0.5">Drag cards to reorder subjects within a semester. Click save to persist.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadStructure}
              className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
            <button
              type="button"
              onClick={handleSaveOrder}
              disabled={!hasDirty || saving}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-150"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  Save Order
                </>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="flex gap-2">{[1,2,3,4].map((i) => <div key={i} className="h-9 w-24 bg-slate-200 rounded-lg animate-pulse" />)}</div>
            <div className="grid grid-cols-2 gap-4">
              {[1,2].map((i) => <div key={i} className="h-64 bg-slate-200 rounded-xl animate-pulse" />)}
            </div>
          </div>
        ) : (
          <>
            {/* Year tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {[1, 2, 3, 4].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${activeYear === y ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Year {y}
                </button>
              ))}
            </div>

            {/* Two semester panels */}
            {currentSlots && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((sem) => (
                  <SemesterPanel
                    key={sem}
                    year={activeYear}
                    semester={sem}
                    subjects={currentSlots[sem] || []}
                    onDragEnd={handleDragEnd}
                    onRemove={handleRemove}
                    onAdd={handleAdd}
                    removing={removing}
                    dirty={Boolean(dirtySlots[`${activeYear}-${sem}`])}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subject Picker Modal */}
      {picker && (
        <SubjectPickerModal
          year={picker.year}
          semester={picker.semester}
          excludeIds={pickerExcludeIds}
          onClose={() => setPicker(null)}
          onAdd={handlePickerAdd}
        />
      )}
    </DashboardLayout>
  );
}

export default AcademicStructurePage;
