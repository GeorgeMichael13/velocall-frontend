import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}", // Added to ensure context-based styles load
  ],
  theme: {
    extend: {
      colors: {
        velo: {
          primary: "#0EA5E9",   // Sky Blue
          secondary: "#1E293B", // Slate Blue
          accent: "#2DD4BF",    // Aquamarine
          glass: "rgba(255, 255, 255, 0.05)",
          dark: "#0F172A",      // Deepest Navy background
        },
      },
      backgroundImage: {
        'neural-gradient': "radial-gradient(circle at center, var(--tw-gradient-stops))",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-accent': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(45, 212, 191, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(45, 212, 191, 0.6)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;