/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0A0E1A",
          surface: "#121829",
          surfaceAlt: "#0E1422",
          border: "#1F2A40",
          text: "#EAF0FB",
          textDim: "#7C8AA8",
          teal: "#2DD4BF",
          indigo: "#818CF8",
          orange: "#FB923C",
          red: "#F87171",
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
