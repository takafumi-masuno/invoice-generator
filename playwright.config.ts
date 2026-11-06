import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:4173/invoice-generator/";

// 本番と同じビルド結果を確認するため、先に pnpm build を実行しておく
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm preview --port 4173 --strictPort",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
  },
});
