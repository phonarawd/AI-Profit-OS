"use strict";

const cp = require("node:child_process");
const { chromium, firefox, webkit } = require("@playwright/test");

const username = String(process.env.BROWSERSTACK_USERNAME || "");
const accessKey = String(process.env.BROWSERSTACK_ACCESS_KEY || "");
const localIdentifier = String(process.env.BROWSERSTACK_LOCAL_IDENTIFIER || "");
const baseUrl = String(process.env.BROWSERSTACK_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const engine = String(process.env.BROWSERSTACK_ENGINE || "chromium");
const browserName = String(process.env.BROWSERSTACK_BROWSER || "chrome");
const os = String(process.env.BROWSERSTACK_OS || "Windows");
const osVersion = String(process.env.BROWSERSTACK_OS_VERSION || "11");
const browserVersion = String(process.env.BROWSERSTACK_BROWSER_VERSION || "");
const buildName = String(process.env.BROWSERSTACK_BUILD_NAME || "PUTDUK launch QA");
const projectName = String(process.env.BROWSERSTACK_PROJECT_NAME || "AI-Profit-OS");
const sessionName = String(process.env.BROWSERSTACK_SESSION_NAME || `${browserName}-${os}-${osVersion}`);

function requireSecret(name, value) {
  if (!value) throw new Error(`${name}_MISSING`);
}

function clientPlaywrightVersion() {
  return cp
    .execSync("pnpm exec playwright --version", { encoding: "utf8" })
    .trim()
    .split(/\s+/)
    .pop();
}

function browserType() {
  if (engine === "chromium") return chromium;
  if (engine === "firefox") return firefox;
  if (engine === "webkit") return webkit;
  throw new Error(`UNSUPPORTED_ENGINE:${engine}`);
}

async function main() {
  requireSecret("BROWSERSTACK_USERNAME", username);
  requireSecret("BROWSERSTACK_ACCESS_KEY", accessKey);
  if (!localIdentifier) throw new Error("BROWSERSTACK_LOCAL_IDENTIFIER_MISSING");

  const pwVersion = clientPlaywrightVersion();
  const caps = {
    os,
    os_version: osVersion,
    browser: browserName,
    "browserstack.username": username,
    "browserstack.accessKey": accessKey,
    "browserstack.local": true,
    "browserstack.localIdentifier": localIdentifier,
    "browserstack.playwrightVersion": pwVersion,
    "client.playwrightVersion": pwVersion,
    "browserstack.debug": true,
    "browserstack.console": "errors",
    "browserstack.networkLogs": true,
    project: projectName,
    build: buildName,
    name: sessionName,
    resolution: "1440x1080",
  };
  if (browserVersion) caps.browser_version = browserVersion;

  const browser = await browserType().connect({
    wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}`,
  });

  let status = "passed";
  let reason = "launch smoke passed";
  const failures = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on("pageerror", (err) => failures.push(`pageerror:${err.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) failures.push(`http${response.status()}:${response.url()}`);
    });

    for (const path of ["/", "/auth/login", "/auth/signup"]) {
      const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      if (!response) failures.push(`no-response:${path}`);
      else if (response.status() >= 500) failures.push(`status-${response.status()}:${path}`);

      const overflow = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      if (overflow.scrollWidth > overflow.innerWidth + 2) failures.push(`horizontal-overflow:${path}`);
    }

    if (failures.length) {
      status = "failed";
      reason = failures.slice(0, 5).join(" | ");
      throw new Error(`BROWSERSTACK_SMOKE_FAIL:${reason}`);
    }
  } catch (error) {
    status = "failed";
    reason = error instanceof Error ? error.message.slice(0, 240) : "unknown failure";
    throw error;
  } finally {
    try {
      const pages = browser.contexts().flatMap((context) => context.pages());
      const page = pages[0];
      if (page) {
        await page.evaluate(
          () => {},
          `browserstack_executor: ${JSON.stringify({ action: "setSessionStatus", arguments: { status, reason } })}`,
        );
      }
    } catch {
      // Session status reporting must never hide the actual test result.
    }
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`[browserstack-launch-smoke] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
