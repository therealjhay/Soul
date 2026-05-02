/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Disable default border-radius — spec calls for zero rounded corners
    borderRadius: {
      DEFAULT: "0",
      none: "0",
      sm: "0",
      md: "0",
      lg: "0",
      xl: "0",
      "2xl": "0",
      "3xl": "0",
      full: "0",
    },
    fontFamily: {
      display: ["var(--font-display)", "Bebas Neue", "Impact", "condensed grotesque", "sans-serif"],
      mono: ["DM Mono", "IBM Plex Mono", "Courier New", "monospace"],
      body: ["DM Mono", "IBM Plex Mono", "monospace"],
    },
    extend: {
      colors: {
        "bg-base": "#0D0D0D",
        "bg-surface": "#141414",
        "bg-elevated": "#1C1C1C",
        border: "#2A2A2A",
        "border-active": "#A8FF3E",
        "text-primary": "#F2EFE9",
        "text-secondary": "#888888",
        "text-muted": "#444444",
        accent: "#A8FF3E",
        "accent-dim": "#6AAA1E",
        destructive: "#FF3E3E",
        warning: "#FFB800",
      },
      fontSize: {
        hero: "clamp(72px, 10vw, 160px)",
        display: "clamp(32px, 5vw, 64px)",
        label: "11px",
        body: "14px",
        data: "13px",
      },
      letterSpacing: {
        label: "0.15em",
      },
      transitionTimingFunction: {
        "soul-in": "cubic-bezier(0.16, 1, 0.3, 1)",
        "soul-out": "cubic-bezier(0.7, 0, 0.84, 0)",
      },
      transitionDuration: {
        short: "120ms",
        base: "240ms",
        slow: "480ms",
      },
      gridTemplateRows: {
        "0fr": "0fr",
        "1fr": "1fr",
      },
    },
  },
  plugins: [],
};
