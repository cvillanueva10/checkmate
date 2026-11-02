import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: true, retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:3000", timezoneId: "UTC", trace: "retain-on-failure" },
  projects: [{name:"chromium",use:{...devices["Desktop Chrome"]}}, {name:"mobile",use:{...devices["iPhone 13"],defaultBrowserType:"chromium"}}],
  webServer: { command: "npm run start -- --hostname 127.0.0.1", url:"http://127.0.0.1:3000", reuseExistingServer: !process.env.CI, timeout:120000 }
});
