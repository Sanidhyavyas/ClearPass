/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // ── Semantic surface tokens (auto-switch via CSS variables) ──────
        page:    "var(--c-page)",    // main page background
        panel:   "var(--c-panel)",   // sidebar / top-bar background
        card:    "var(--c-card)",    // card background
        raised:  "var(--c-raised)",  // inputs, hover fills, elevated areas
        subtle:  "var(--c-border)",  // subtle border / divider colour
        strong:  "var(--c-border-strong)", // default border colour
        ink:     "var(--c-ink)",     // primary text
        ink2:    "var(--c-ink2)",    // secondary text
        ink3:    "var(--c-ink3)",    // muted / placeholder text
      },
      animation: {
        "slide-in": "slideIn 0.25s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
