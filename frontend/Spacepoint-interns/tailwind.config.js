/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        heliotrope: "#a880ff",
        affair: "#643f83",
        snuff: "#d6c7e1",
      },
      fontFamily: {
        sans: ["Inter Variable", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
