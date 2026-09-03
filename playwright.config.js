const { defineConfig, devices } = require("@playwright/test");

// Serve the built _site with Eleventy's dev server, then run the browser tests
// against it. `npm run build` is not required first — the serve command builds.
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: {
    command: "npx @11ty/eleventy --serve --port=8080",
    url: "http://localhost:8080/",
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
});
