import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isTauri = Boolean(process.env.TAURI_PLATFORM);

export default defineConfig({
  base: isTauri ? "./" : "/",
  plugins: [react()],
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  server: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    clearMocks: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "playwright.config.ts"],
  },
});
