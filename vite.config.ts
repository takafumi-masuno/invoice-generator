import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages のプロジェクトページ（https://takafumi-masuno.github.io/invoice-generator/）で配信するため
  base: "/invoice-generator/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
