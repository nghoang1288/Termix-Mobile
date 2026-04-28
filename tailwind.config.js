/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "dark-bg": "#1b1f25",
        "dark-bg-darker": "#171b21",
        "dark-bg-darkest": "#07090d",
        "dark-bg-input": "#151922",
        "dark-bg-button": "#242a33",
        "dark-bg-active": "#334155",
        "dark-bg-header": "#1a1f27",
        "dark-border": "#343b46",
        "dark-border-active": "#38bdf8",
        "dark-border-hover": "#45505d",
        "dark-hover": "#2d3440",
        "dark-active": "#334155",
        "dark-pressed": "#11151b",
        "dark-hover-alt": "#313946",
        "dark-border-light": "#596575",
        "dark-bg-light": "#20252d",
        "dark-border-medium": "#3d4652",
        "dark-bg-very-light": "#151922",
        "dark-bg-panel": "#20252d",
        "dark-border-panel": "#2b323c",
        "dark-bg-panel-hover": "#2d3440",
      },
      borderRadius: {
        button: "6px",
        card: "12px",
        small: "4px",
      },
    },
  },
  plugins: [],
};
