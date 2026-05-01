/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#000000",
        "secondary": "#9d4edd",
        "background": "#ffffff",
        "surface": "#f8f9fa",
        "outline": "rgba(0, 0, 0, 0.1)",
        "surface-container-highest": "rgba(0, 0, 0, 0.05)",
        "on-surface": "#000000",
        "on-primary": "#ffffff",
        "secondary-container": "rgba(157, 78, 221, 0.1)",
        "on-secondary-container": "#9d4edd",
      },
      fontFamily: {
        "headline": ["Outfit", "sans-serif"],
        "body": ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
