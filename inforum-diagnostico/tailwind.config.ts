// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#F5A11A",
          navy: "#082A49",
          gray: "#757989",
          blueLight: "#C5D9FF",
          slate: "#7D82A3",
          bg: "#F5F7FA",
          white: "#FFFFFF",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(8, 42, 73, 0.08)",
        header: "0 2px 0 rgba(255,255,255,0.06) inset",
      },
    },
  },
  plugins: [],
};

export default config;
