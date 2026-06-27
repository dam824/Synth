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
        "surface-soft": "var(--surface-soft)",
        foreground: "var(--foreground)",
        "muted-fg": "var(--muted-fg)",
        faint: "var(--faint)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        primary: "var(--primary)",
        "primary-fg": "var(--primary-fg)",
        accent: "var(--accent)",
        "accent-strong": "var(--accent-strong)",
        "accent-soft": "var(--accent-soft)",
        "danger-bg": "var(--danger-bg)",
        "danger-border": "var(--danger-border)",
        "danger-fg": "var(--danger-fg)",
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
        card: "0 18px 60px -30px rgba(43,245,168,.35)",
        composer: "0 10px 38px -24px rgba(43,245,168,.28)",
        accent: "0 16px 50px -26px rgba(43,245,168,.5)",
        preview: "0 24px 80px -28px rgba(43,245,168,.22), inset 0 1px 0 rgba(255,255,255,.02)",
        glow: "0 0 24px rgba(43,245,168,.4)",
      },
    },
  },
  plugins: [],
};

export default config;
