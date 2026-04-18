// --- TOAST CONTEXT ---
import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);
let idCounter = 0;

const TOAST_STYLES = {
  success: { bar: "bg-green-500",  icon: "text-green-600", bg: "bg-white", border: "border-green-200", text: "text-green-800",   iconPath: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  error:   { bar: "bg-red-500",    icon: "text-red-600",   bg: "bg-white", border: "border-red-200",   text: "text-red-800",     iconPath: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" },
  warning: { bar: "bg-amber-400",  icon: "text-amber-600", bg: "bg-white", border: "border-amber-200", text: "text-amber-800",   iconPath: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  info:    { bar: "bg-blue-500",   icon: "text-blue-600",  bg: "bg-white", border: "border-blue-200",  text: "text-slate-800",   iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 4500) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]"
          role="status"
          aria-live="polite"
          aria-label="Notifications"
        >
          {toasts.map((t) => {
            const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
            return (
              <div
                key={t.id}
                className={`flex items-start gap-3 ${s.bg} border ${s.border} rounded-xl shadow-lg overflow-hidden animate-slide-in`}
              >
                <div className={`w-1 self-stretch ${s.bar} shrink-0`} aria-hidden="true" />
                <div className="flex items-start gap-2.5 flex-1 py-3 pr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mt-0.5 shrink-0 ${s.icon}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.iconPath} />
                  </svg>
                  <p className={`text-sm font-medium flex-1 ${s.text}`}>{t.message}</p>
                  <button
                    type="button"
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss notification"
                    className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

