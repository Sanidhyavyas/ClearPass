/**
 * Input — accessible, theme-aware text input.
 *
 * Props (in addition to native <input> props):
 *   label        {string}   — visible label text
 *   id           {string}   — links label ↔ input
 *   error        {string}   — error message shown below the field
 *   helpText     {string}   — helper text shown below the field (when no error)
 *   leftIcon     {ReactNode} — icon placed inside the left edge
 *   rightElement {ReactNode} — arbitrary element placed inside the right edge
 *   wrapperClass {string}   — extra classes on the outer wrapper div
 */
import React, { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    label,
    id,
    error,
    helpText,
    leftIcon,
    rightElement,
    wrapperClass = "",
    className = "",
    ...rest
  },
  ref
) {
  const base =
    "w-full rounded-lg border text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent " +
    "bg-white dark:bg-gray-800 " +
    "text-gray-900 dark:text-white " +
    "border-gray-300 dark:border-gray-700 " +
    "placeholder-gray-400 dark:placeholder-gray-500 " +
    "disabled:opacity-50 disabled:cursor-not-allowed ";

  const padding = leftIcon ? "pl-9 pr-3.5 py-2.5" : rightElement ? "pl-3.5 pr-10 py-2.5" : "px-3.5 py-2.5";

  return (
    <div className={`${wrapperClass}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 dark:text-gray-500">
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={id}
          className={`${base} ${padding} ${error ? "border-red-500 focus:ring-red-500" : ""} ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : helpText ? `${id}-help` : undefined}
          {...rest}
        />

        {rightElement && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {rightElement}
          </span>
        )}
      </div>

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p id={`${id}-help`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {helpText}
        </p>
      )}
    </div>
  );
});

export default Input;
