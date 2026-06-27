import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        foreground: "var(--foreground)",
        "muted-fg": "var(--muted-fg)",
        faint: "var(--faint)",
        border: "var(--border)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
      },
      fontFamily: {
        sans: ["var(--font-geist)", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 18px 48px -30px rgba(40,30,80,.22)",
        composer: "0 10px 34px -22px rgba(40,30,80,.2)",
        accent: "0 16px 40px -26px rgba(110,86,207,.4)",
        preview: "0 24px 60px -28px rgba(40,30,80,.18)",
      },
    },
  },
  plugins: [],
};

export default config;
