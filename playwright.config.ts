import { defineConfig } from "playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: "http://localhost:4174",
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js preview --port 4174 --strictPort",
    url: "http://localhost:4174",
    reuseExistingServer: false,
  },
});
