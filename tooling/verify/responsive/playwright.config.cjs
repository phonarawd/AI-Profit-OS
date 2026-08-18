/**
 * Playwright config — Canon structure harness (verify:responsive).
 * Projects = one viewport width each. Pixel screenshots intentionally disabled.
 */
const path = require("path");
const {
  HARNESS_VIEWPORTS,
} = require("../../../packages/ui/responsive/visual-regression/canon-structure.cjs");

const root = path.resolve(__dirname, "../../..");
const fixtureDir = path.join(__dirname, ".fixtures");

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: path.join(__dirname, "tests"),
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    headless: true,
    // ADR-013 — never baseline raw screenshots
    screenshot: "off",
    video: "off",
    trace: "off",
  },
  projects: HARNESS_VIEWPORTS.map((width) => ({
    name: `w${width}`,
    use: {
      viewport: { width, height: 900 },
    },
  })),
  metadata: {
    gate: "verify:responsive",
    diffMode: "canon_structure",
    fixtureDir,
    root,
  },
};

module.exports = config;
