import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#080B10",
        panel: "#0F141C",
        line: "#232B36",
        passport: "#1D6F8B",
        mint: "#58D6A8",
        amber: "#F2B84B"
      },
      boxShadow: {
        glow: "0 0 40px rgba(88, 214, 168, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
