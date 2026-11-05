import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages のプロジェクトページ（https://takafumi-masuno.github.io/invoice-generator/）で配信するため
  base: "/invoice-generator/",
  plugins: [react()],
  build: {
    // PDF 生成ライブラリ（@react-pdf/renderer）のチャンクは約1.2MBあるが、PDF を表示するときだけ
    // 遅延読み込みしていて最初の表示には影響しないため、警告の上限をそれに合わせる
    chunkSizeWarningLimit: 1300,
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
