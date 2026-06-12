import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#1A6FDB",
          dark: "#15579F",
          light: "#E8F0FE",
        },
        accent: {
          DEFAULT: "#FF2D8B",
          dark: "#D81F73",
          light: "#FFE3F0",
        },
        salmon: "#F5A878",
        appbg: "#F0F4FF",
        ink: "#1A1A2E",
      },
    },
  },
  plugins: [],
};
export default config;
