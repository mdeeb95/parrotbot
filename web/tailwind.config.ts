import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0b14",
        "bg-elevated": "#14162a",
        border: "#252840",
        text: "#e8eaff",
        "text-muted": "#8b8fa8",
        accent: "#ff7a59",
        "accent-hover": "#ff8d72",
        twitch: "#9146ff",
        "twitch-hover": "#a163ff",
        green: "#a5e3b5",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      maxWidth: {
        container: "1100px",
      },
      boxShadow: {
        "chat-glow": "0 20px 50px -20px rgba(255, 122, 89, 0.15)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
