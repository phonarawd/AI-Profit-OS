const path = require("path");

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: path.join(__dirname, "specs"),
  testMatch: "**/*.spec.cjs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    headless: true,
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  metadata: {
    gate: "qa-lab-bootstrap",
    mcpOnlyEvidence: "NOT_DONE",
  },
};

module.exports = config;
