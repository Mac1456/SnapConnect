/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        snapYellow: '#FFFC00',
        snapBlue: '#0EADFF',
        snapPurple: '#7B68EE',
        snapPink: '#FF6B9D',
        snapGreen: '#00FF87',
      },
    },
  },
  plugins: [],
} 