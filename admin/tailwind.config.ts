import type { Config } from 'tailwindcss';

// Semua warna memakai CSS variable (lihat app/globals.css) supaya warna sekolah mudah diganti
// dan dark mode cukup mengganti nilai variable.
const rgb = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
  theme: {
    extend: {
      colors: {
        brand: rgb('brand'),
        bg: rgb('bg'),
        card: rgb('card'),
        ink: rgb('ink'),
        muted: rgb('muted'),
        line: rgb('line'),
      },
    },
  },
  plugins: [],
};

export default config;
