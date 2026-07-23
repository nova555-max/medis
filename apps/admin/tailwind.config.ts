import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4fb",
          100: "#d9e6f5",
          200: "#b8d0eb",
          300: "#88b1db",
          400: "#568fc5",
          500: "#3772ad",
          600: "#2a5a8f",
          700: "#234a75",
          800: "#1f3f62",
          900: "#1d3653",
          950: "#132238",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
          elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          muted: "rgb(var(--ink-muted) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-kurdistan24)", "Tahoma", "sans-serif"],
        display: ["var(--font-kurdistan24)", "Tahoma", "sans-serif"],
      },
      boxShadow: {
        soft: "0 14px 40px -22px rgb(19 34 56 / 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
