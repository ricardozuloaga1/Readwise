import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      fontFamily: {
        'dancing-script': ['Dancing Script', 'cursive'],
        'wsj-headline': ['Playfair Display', 'serif'],
        'wsj-body': ['Source Serif Pro', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
