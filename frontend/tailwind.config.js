
module.exports = {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        pulseFast: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.75' },
        },
      },
      animation: {
        pulseFast: 'pulseFast 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
