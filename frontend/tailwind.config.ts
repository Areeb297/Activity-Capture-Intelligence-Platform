import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary:   "#2563EB",
          secondary: "#3B82F6",
          cta:       "#F97316",
          bg:        "#F8FAFC",
          text:      "#1E293B",
        },
      },
      fontFamily: {
        heading: ["Fira Code", "monospace"],
        body:    ["Fira Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
