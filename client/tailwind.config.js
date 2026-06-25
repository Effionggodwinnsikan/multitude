export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        church: {
          blue: '#2563eb',
          ink: '#101827',
          mint: '#0f766e',
          gold: '#b45309'
        }
      }
    }
  },
  plugins: []
};
