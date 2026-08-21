"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");

async function runAccountSpec(specFile) {
  const { ensureLocalWebRuntime } = require("../../e2e/lib/local-web-runtime.cjs");
  const web = await ensureLocalWebRuntime({ timeoutMs: 180000 });
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "node_modules/@playwright/test/cli.js"),
      "test",
      "--config",
      "tooling/e2e/playwright.config.cjs",
      specFile,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: web.baseUrl,
        NODE_OPTIONS: process.env.NODE_OPTIONS || "--max-old-space-size=1536",
      },
      timeout: 420000,
    },
  );
  await web.stop();
  return result;
}

function shouldSkipBrowser(envName) {
  return (
    process.env[envName] === "1" ||
    process.env.CI === "true" ||
    process.env.CI === "1"
  );
}

module.exports = { runAccountSpec, shouldSkipBrowser, root };
