/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060B08', // Deep Charcoal-Mint tint
          900: '#0C1510',
          850: '#121F17',
          800: '#1B2D22',
          700: '#284232',
        },
        driver: {
          neon: '#00FF9D', // Vivid Neon Mint
          emerald: '#10B981',
          cyan: '#06B6D4',
          danger: '#FF3366', // Hot Coral Red
          amber: '#FFB800',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
