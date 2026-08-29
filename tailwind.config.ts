import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F7F9",
        surface: "#FFFFFF",
        ink: "#171923",
        muted: "#8A8F98",
        border: "#E7E8EC",
        brand: {
          DEFAULT: "#FF6A39",
          light: "#FFF1EA",
          dark: "#E4531F",
        },
        good: {
          DEFAULT: "#1EA672",
          light: "#E8F8F1",
        },
        warn: {
          DEFAULT: "#F5A524",
          light: "#FEF4E4",
        },
        bad: {
          DEFAULT: "#E5484D",
          light: "#FDECEC",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,25,35,0.04), 0 8px 24px rgba(23,25,35,0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
