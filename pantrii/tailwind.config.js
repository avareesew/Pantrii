/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pantrii: {
          50: '#f3fbf6',
          100: '#e3f6ea',
          200: '#c8ecd6',
          300: '#a2debb',
          400: '#79ce9e',
          500: '#50be81',
          600: '#2f9e44',
          700: '#277f39',
          800: '#1f642e',
          900: '#184f26',
        },
        cream: '#faf7f2',
        sage: '#e9f3ec',
        charcoal: '#0f1412',
        stone: '#2a2f2c',
      },
    },
  },
  plugins: [],
}
