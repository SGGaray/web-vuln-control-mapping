import type { Config } from "tailwindcss";

/**
 * Monochrome by design. The whole palette is grayscale, so contrast and
 * type weight do the work that color usually does. Tokens are exposed as
 * CSS variables in globals.css and mapped here so utilities stay readable.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "var(--base)", // page background, near black
        surface: "var(--surface)", // panels and cards
        raised: "var(--raised)", // hover / active surfaces
        line: "var(--line)", // borders and dividers
        muted: "var(--muted)", // secondary text
        fg: "var(--fg)", // primary text
        bright: "var(--bright)", // near white, used sparingly as the "accent"
      },
      fontFamily: {
        mono: ["var(--font-mono)"],
        sans: ["var(--font-sans)"],
      },
      borderRadius: {
        // Tight radii keep the console feel. Nothing rounded or soft.
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};

export default config;
