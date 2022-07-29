// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require('tailwindcss/colors')

module.exports = {
  content: ['**/index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        warmGray: colors.stone,
      },
    },
  },
  variants: {
    extend: {},
  },
  daisyui: {},
  plugins: [require('daisyui')],
}
