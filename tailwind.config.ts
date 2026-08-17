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
        gold: {
          50: "#fff9db",
          100: "#fff1a8",
          300: "#ffd84d",
          400: "#ffc400",
          500: "#e5ae00",
          700: "#946f00"
        },
        ink: "#111111",
        asphalt: "#2d2d2d",
        fog: "#f4f4f1",
        line: "#deded8"
      }
    },
  },
  plugins: [],
};

export default config;
