/**
 * Button — accessible, theme-aware button with variant support.
 *
 * Variants:
 *   primary   — solid blue (default)
 *   secondary — bordered, muted
 *   danger    — solid red
 *   ghost     — transparent with hover fill
 *   success   — solid green
 *
 * Sizes:  sm | md (default) | lg
 *
 * Extra props:
 *   loading  {boolean} — shows spinner and disables the button
 *   leftIcon / rightIcon {ReactNode}
 *   fullWidth {boolean}
 */
import React from "react";

const VARIANTS = {
  primary:
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent " +
    "focus-visible:ring-blue-500",
  secondary:
    "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 " +
    "text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 " +
    "focus-visible:ring-gray-400",
  danger:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent " +
    "focus-visible:ring-red-500",
  ghost:
    "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 " +
    "text-gray-600 dark:text-gray-400 border-transparent " +
    "focus-visible:ring-gray-400",
  success:
    "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-transparent " +
    "focus-visible:ring-green-500",
  violet:
    "bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white border-transparent " +
    "focus-visible:ring-violet-500",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-lg",
  lg: "px-5 py-3 text-base rounded-xl",
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  children,
  disabled,
  ...rest
}) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium border transition-all duration-150 " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-60 disabled:cursor-not-allowed select-none";

  const variantCls = VARIANTS[variant] || VARIANTS.primary;
  const sizeCls    = SIZES[size]        || SIZES.md;
  const widthCls   = fullWidth ? "w-full" : "";

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${variantCls} ${sizeCls} ${widthCls} ${className}`}
      {...rest}
    >
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

export default Button;
