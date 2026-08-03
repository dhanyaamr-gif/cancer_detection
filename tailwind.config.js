/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#070B16',
        surface: '#0F1629',
        sidebar: '#0A1020',
        primary: '#7C5CFF',
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        border: 'rgba(255,255,255,0.06)',
      },
      boxShadow: {
        soft: '0 10px 40px rgba(0,0,0,0.24)',
      },
      borderRadius: {
        xl2: '20px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
