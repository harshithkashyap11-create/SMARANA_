import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        text: "var(--text)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        "primary-text": "var(--primary-text)",
        calm: "var(--calm)",
        success: "var(--success)",
        warn: "var(--warn)",
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        card: "0 8px 24px rgb(31 41 37 / 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
