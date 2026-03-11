/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#0A0A0F",
        surface: "#12121A",
        "surface-light": "#1A1A25",
        accent: "#7C3AED",
        "accent-light": "#8B5CF6",
        secondary: "#0D9488",
        "secondary-light": "#14B8A6",
        danger: "#EF4444",
        warning: "#F59E0B",
        success: "#10B981",
        muted: "#6B7280",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "glow-green": "glow-green 2s ease-in-out infinite alternate",
        "glow-amber": "glow-amber 2s ease-in-out infinite alternate",
        "glow-red": "glow-red 1.5s ease-in-out infinite alternate",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "glow-green": {
          "0%": { boxShadow: "0 0 5px rgba(16, 185, 129, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(16, 185, 129, 0.6)" },
        },
        "glow-amber": {
          "0%": { boxShadow: "0 0 5px rgba(245, 158, 11, 0.3)" },
          "100%": { boxShadow: "0 0 15px rgba(245, 158, 11, 0.5)" },
        },
        "glow-red": {
          "0%": { boxShadow: "0 0 5px rgba(239, 68, 68, 0.4)" },
          "100%": { boxShadow: "0 0 25px rgba(239, 68, 68, 0.7)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
