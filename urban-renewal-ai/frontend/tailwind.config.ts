import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#060816",
        panel: "rgba(17, 24, 47, 0.72)",
        cyanGlow: "#4fd1ff",
        violetGlow: "#9f7aea"
      },
      boxShadow: {
        glow: "0 0 60px rgba(80, 112, 255, 0.22)"
      },
      backgroundImage: {
        aurora:
          "radial-gradient(circle at 18% 20%, rgba(79,209,255,.22), transparent 28%), radial-gradient(circle at 82% 8%, rgba(159,122,234,.26), transparent 30%), linear-gradient(135deg, #050713 0%, #11182f 52%, #050713 100%)"
      }
    }
  },
  plugins: []
};

export default config;
