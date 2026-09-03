/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#C9A34A',
          light: '#E2C675',
          dark: '#A9822E',
        },
        accent: {
          DEFAULT: '#C9A34A',
          light: '#E2C675',
          dark: '#A9822E',
        },
        gold: {
          DEFAULT: '#C9A34A',
          light: '#E2C675',
          dark: '#A9822E',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm: '#FAF8F5',
          cream: '#F4EFE8',
        },
        ink: {
          DEFAULT: '#171717',
          secondary: '#5F5A54',
        },
        borderlight: '#E7E1D8',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};