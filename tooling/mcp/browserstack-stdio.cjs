#!/usr/bin/env node
"use strict";

/**
 * BrowserStack MCP stdio launcher.
 * Credentials: shell env > .cursor/browserstack.local.json (gitignored).
 * Never embed secrets in .cursor/mcp.json.
 */
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const LOCAL = path.join(ROOT, ".cursor/browserstack.local.json");

function loadLocalCreds() {
  if (!fs.existsSync(LOCAL)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(LOCAL, "utf8"));
    return {
      username: parsed.username || parsed.BROWSERSTACK_USERNAME || "",
      accessKey: parsed.accessKey || parsed.BROWSERSTACK_ACCESS_KEY || "",
    };
  } catch {
    return {};
  }
}

function resolveCreds() {
  const local = loadLocalCreds();
  const username = process.env.BROWSERSTACK_USERNAME || local.username || "";
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || local.accessKey || "";
  if (!username || !accessKey) {
    process.stderr.write(
      "[browserstack-stdio] missing credentials — set BROWSERSTACK_USERNAME/BROWSERSTACK_ACCESS_KEY or .cursor/browserstack.local.json\n",
    );
    process.exit(1);
  }
  return { username, accessKey };
}

function main() {
  const { username, accessKey } = resolveCreds();
  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["-y", "@browserstack/mcp-server@latest"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        BROWSERSTACK_USERNAME: username,
        BROWSERSTACK_ACCESS_KEY: accessKey,
      },
    },
  );
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main();
