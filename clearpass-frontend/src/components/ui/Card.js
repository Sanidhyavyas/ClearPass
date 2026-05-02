/**
 * Card — theme-aware card container.
 *
 * Props:
 *   padding  {string}  — "sm" | "md" (default) | "lg" | "none"
 *   border   {boolean} — show border (default: true)
 *   shadow   {boolean} — show shadow (default: true)
 *   className {string}
 */
import React from "react";

const PADDING = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

function Card({ padding = "md", border = true, shadow = true, className = "", children, ...rest }) {
  return (
    <div
      className={[
        "bg-card rounded-xl theme-transition",
        border  ? "border border-subtle"   : "",
        shadow  ? "shadow-sm"              : "",
        PADDING[padding] ?? PADDING.md,
        className,
      ].filter(Boolean).join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Card;
