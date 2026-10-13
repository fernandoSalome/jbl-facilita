import type { Config } from "tailwindcss";

// Paleta igual à proposta publicada: branco, azul-marinho e dourado nos detalhes.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#122A45", 700: "#1B3757", 50: "#EEF2F6" },
        gold: { DEFAULT: "#C1943D", deep: "#A2782F", ink: "#8F6B28", soft: "#F7F2E7", line: "#ECE1C4" },
        ink: "#2B3A4A",
        muted: "#697683",
        line: "#DDE3E9",
        alt: "#F8F9FB",
        surface: "#F5F7FA",
      },
      fontFamily: {
        display: ["Georgia", '"Times New Roman"', "Times", "serif"],
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
