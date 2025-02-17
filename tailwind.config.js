/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Category button colors
    'bg-blue-100',
    'text-blue-600',
    'dark:bg-blue-900/20',
    'dark:text-blue-400',
    'bg-emerald-100',
    'text-emerald-600',
    'dark:bg-emerald-900/20',
    'dark:text-emerald-400',
    'bg-purple-100',
    'text-purple-600',
    'dark:bg-purple-900/20',
    'dark:text-purple-400',
    'bg-amber-100',
    'text-amber-600',
    'dark:bg-amber-900/20',
    'dark:text-amber-400',
    'bg-rose-100',
    'text-rose-600',
    'dark:bg-rose-900/20',
    'dark:text-rose-400',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
} 