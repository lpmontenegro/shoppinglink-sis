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
        // Placeholder brand palette — swap for Shopping Link's real colors.
        brand: {
          blue: '#0DC7F5',
          black: '#222222',
          'blue-60': '#6EDDF9',
          'blue-30': '#B6EEFC',
          'blue-10': '#E7F9FE',
          gray: '#D9D9D9',
          'gray-lt': '#F4F4F4',
          'gray-dk': '#6D6D6D',
        },
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
