/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
      },
      colors: {
        'primary-blue': '#2459a9',
        'primary-dark': '#1a407a',
        'primary-light': '#f3f7fc',
        'btn-primary': '#0d6efd',
        'btn-danger': '#dc3545',
        'btn-warning': '#ffc107',
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-medium': 'float 4s ease-in-out infinite',
        'float-fast': 'float 3s ease-in-out infinite',
        'float-reverse': 'float-rev 5s ease-in-out infinite',
      },
      screens: {
        'print': {'raw': 'print'},
      }
    },
  },
  plugins: [],
}
