/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0F1720",
          900: "#151F2B",
          800: "#1E2A38",
          700: "#2A3947",
          600: "#3D5164",
        },
        signal: {
          DEFAULT: "#3DDC97",
          dim: "#2AB47D",
          soft: "#DFF7EC",
        },
        amber: {
          DEFAULT: "#F2A93B",
          soft: "#FBE8C8",
        },
        rose: {
          DEFAULT: "#E5646B",
          soft: "#FBDEDF",
        },
        paper: "#F6F5F1",
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 32, 0.06), 0 8px 24px -12px rgba(15, 23, 32, 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
