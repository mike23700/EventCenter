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
      // Échelle par défaut de Tailwind, mais chaque taille multipliée par
      // --w-text-scale (1 = inchangé par défaut). Cette variable n'est
      // définie que dans le site public d'un mariage (voir
      // WeddingThemeShell : .font-display/.tpl-display et .tpl-body),
      // via l'ajustement "Taille du titre"/"Taille du texte" de l'onglet
      // Apparence — donc aucun effet ailleurs (admin, /login…).
      fontSize: {
        xs: ['calc(0.75rem * var(--w-text-scale, 1))', { lineHeight: '1rem' }],
        sm: ['calc(0.875rem * var(--w-text-scale, 1))', { lineHeight: '1.25rem' }],
        base: ['calc(1rem * var(--w-text-scale, 1))', { lineHeight: '1.5rem' }],
        lg: ['calc(1.125rem * var(--w-text-scale, 1))', { lineHeight: '1.75rem' }],
        xl: ['calc(1.25rem * var(--w-text-scale, 1))', { lineHeight: '1.75rem' }],
        '2xl': ['calc(1.5rem * var(--w-text-scale, 1))', { lineHeight: '2rem' }],
        '3xl': ['calc(1.875rem * var(--w-text-scale, 1))', { lineHeight: '2.25rem' }],
        '4xl': ['calc(2.25rem * var(--w-text-scale, 1))', { lineHeight: '2.5rem' }],
        '5xl': ['calc(3rem * var(--w-text-scale, 1))', { lineHeight: '1' }],
        '6xl': ['calc(3.75rem * var(--w-text-scale, 1))', { lineHeight: '1' }],
        '7xl': ['calc(4.5rem * var(--w-text-scale, 1))', { lineHeight: '1' }],
        '8xl': ['calc(6rem * var(--w-text-scale, 1))', { lineHeight: '1' }],
        '9xl': ['calc(8rem * var(--w-text-scale, 1))', { lineHeight: '1' }],
      },
    },
  },
  plugins: [],
};