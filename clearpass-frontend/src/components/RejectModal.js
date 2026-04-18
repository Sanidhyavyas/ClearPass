// RejectModal.js — Confirmation modal for rejecting a clearance request
import { useEffect, useRef, useState } from "react";

const MIN_CHARS = 20;

/**
 * Props:
 *   request   — { id, student_name, roll_number }
 *   onClose   — () => void
 *   onConfirm — (requestId, reason) => void
 */
export default function RejectModal({ request, onClose, onConfirm }) {
  const [reason, setReason]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef               = useRef(null);

  // Focus textarea on open
  useEffect(() => { textareaRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isValid   = reason.trim().length >= MIN_CHARS;
  const remaining = MIN_CHARS - reason.trim().length;

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    await onConfirm(request.id, reason.trim());
    setSubmitting(false);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 id="reject-modal-title" className="text-base font-semibold text-gray-900">
              Reject clearance request
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {request.student_name}
              {request.roll_number && <span className="text-gray-400"> · {request.roll_number}</span>}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Amber info banner */}
          <div className="flex gap-2.5 items-start p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-800 font-medium">
              This rejection reason will be visible to the student.
            </p>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="rejection-reason" className="text-sm font-medium text-gray-700">
                Rejection reason <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${isValid ? "text-green-600" : "text-gray-400"}`}>
                {reason.trim().length}/{MIN_CHARS}+ chars
              </span>
            </div>
            <textarea
              id="rejection-reason"
              ref={textareaRef}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this request is being rejected…"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all"
            />
            {!isValid && reason.trim().length > 0 && (
              <p className="text-xs text-red-500 mt-1">
                {remaining} more character{remaining !== 1 ? "s" : ""} required
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || submitting}
            onClick={handleConfirm}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}
