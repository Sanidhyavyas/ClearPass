// --- ADD / EDIT SUBJECT MODAL ---
import { useEffect, useState } from "react";

import { useToast } from "../context/ToastContext";
import API from "../services/api";

const DEPARTMENTS = [
  "Computer Science",
  "Information Technology",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Literature",
  "History",
  "Economics",
  "Engineering",
  "Business Administration",
  "Other",
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-150";
const errorClass = "mt-1 text-xs text-red-500";

const EMPTY = {
  subjectCode:  "",
  name:         "",
  credits:      "3",
  department:   "",
  description:  "",
  isElective:   false,
  isActive:     true,
};

function Toggle({ id, label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-sm text-slate-700">{label}</label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${checked ? "bg-blue-600" : "bg-slate-200"}`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export default function AddEditSubjectModal({ subject, onClose, onSaved }) {
  const [form, setForm]         = useState(EMPTY);
  const [errors, setErrors]     = useState({});
  const [submitting, setSubmit] = useState(false);
  const { addToast }            = useToast();
  const isEdit                  = Boolean(subject);

  useEffect(() => {
    if (subject) {
      setForm({
        subjectCode: subject.subject_code || "",
        name:        subject.name         || "",
        credits:     String(subject.credits ?? "3"),
        department:  subject.department   || "",
        description: subject.description  || "",
        isElective:  Boolean(subject.is_elective),
        isActive:    subject.is_active !== 0,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [subject]);

  const set = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.subjectCode.trim()) e.subjectCode = "Subject code is required.";
    if (!form.name.trim())        e.name = "Subject name is required.";
    const c = parseInt(form.credits);
    if (isNaN(c) || c < 1 || c > 6) e.credits = "Credits must be 1–6.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    try {
      setSubmit(true);
      const payload = {
        subjectCode: form.subjectCode.trim().toUpperCase(),
        name:        form.name.trim(),
        credits:     parseInt(form.credits),
        department:  form.department || null,
        description: form.description.trim() || null,
        isElective:  form.isElective,
        isActive:    form.isActive,
      };

      if (isEdit) {
        await API.put(`/api/admin/subjects/${subject.id}`, payload);
        addToast("Subject updated.", "success");
      } else {
        await API.post("/api/admin/subjects", payload);
        addToast("Subject created.", "success");
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save subject.";
      if (err.response?.status === 409) {
        setErrors((e) => ({ ...e, subjectCode: msg }));
      } else {
        addToast(msg, "error");
      }
    } finally {
      setSubmit(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit subject" : "Add subject"}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Edit Subject" : "Add Subject"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4" noValidate>
          {/* Code + Credits row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sc-code" className="block text-xs font-semibold text-slate-700 mb-1">
                Subject Code <span className="text-red-500">*</span>
              </label>
              <input
                id="sc-code"
                type="text"
                value={form.subjectCode}
                onChange={(e) => set("subjectCode", e.target.value.toUpperCase())}
                placeholder="e.g. CS101"
                className={`${inputClass} uppercase ${errors.subjectCode ? "border-red-400 focus:ring-red-400" : ""}`}
                maxLength={20}
              />
              {errors.subjectCode && <p className={errorClass}>{errors.subjectCode}</p>}
            </div>
            <div>
              <label htmlFor="sc-credits" className="block text-xs font-semibold text-slate-700 mb-1">
                Credits <span className="text-red-500">*</span>
              </label>
              <input
                id="sc-credits"
                type="number"
                min={1}
                max={6}
                value={form.credits}
                onChange={(e) => set("credits", e.target.value)}
                className={`${inputClass} ${errors.credits ? "border-red-400 focus:ring-red-400" : ""}`}
              />
              {errors.credits && <p className={errorClass}>{errors.credits}</p>}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="sc-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="sc-name"
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Introduction to Computer Science"
              className={`${inputClass} ${errors.name ? "border-red-400 focus:ring-red-400" : ""}`}
            />
            {errors.name && <p className={errorClass}>{errors.name}</p>}
          </div>

          {/* Department */}
          <div>
            <label htmlFor="sc-dept" className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
            <select
              id="sc-dept"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className={inputClass}
            >
              <option value="">— Select department —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="sc-desc" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              id="sc-desc"
              rows={3}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description of this subject…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            <Toggle id="sc-elective" label="Elective subject"    checked={form.isElective} onChange={(v) => set("isElective", v)} />
            <Toggle id="sc-active"   label="Active (visible)"    checked={form.isActive}   onChange={(v) => set("isActive",   v)} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all duration-150"
          >
            {submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Subject"}
          </button>
        </div>
      </div>
    </div>
  );
}
