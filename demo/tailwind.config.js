const colors = require('tailwindcss/colors')

module.exports = {
  purge: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        warmGray: colors.warmGray,
      }
    },
  },
  variants: {
    extend: {},
  },
  daisyui: {
  },
  plugins: [
    require('daisyui'),
  ],
}
