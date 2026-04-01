/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // Updated for Tailwind v4 compatibility
    autoprefixer: {},
  },
};

export default config;