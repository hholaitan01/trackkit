/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "#38bdf8",
        surface: "#0c1222",
        base: "#060a14",
      },
    },
  },
  plugins: [],
};
