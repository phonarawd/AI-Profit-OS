const base = require("./playwright.config.cjs");

/** Bounded Chromium / Firefox / WebKit projects. skipped engine ≠ PASS. */
module.exports = {
  ...base,
  use: {
    ...base.use,
    serviceWorkers: "block",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
};
