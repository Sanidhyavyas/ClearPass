/**
 * Select — accessible, theme-aware select dropdown.
 *
 * Props (in addition to native <select> props):
 *   label        {string} — visible label text
 *   id           {string} — links label ↔ select
 *   error        {string} — error message shown below the field
 *   wrapperClass {string} — extra classes on the outer wrapper div
 */
import React, { forwardRef } from "react";

const Select = forwardRef(function Select(
  { label, id, error, wrapperClass = "", className = "", children, ...rest },
  ref
) {
  const base =
    "w-full px-3.5 py-2.5 rounded-lg border text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer " +
    "bg-white dark:bg-gray-800 " +
    "text-gray-900 dark:text-white " +
    "border-gray-300 dark:border-gray-700 " +
    "disabled:opacity-50 disabled:cursor-not-allowed ";

  return (
    <div className={wrapperClass}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={`${base} pr-9 ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {children}
        </select>
        {/* Chevron icon */}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-500">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
