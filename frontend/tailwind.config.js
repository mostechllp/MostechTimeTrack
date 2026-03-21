/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#020c4c',
          light: '#0a1a6e',
        },
        text: {
          white: '#ffffff',
          blue: '#7ec8f0',
        }
      }
    },
  },
  plugins: [],
}

