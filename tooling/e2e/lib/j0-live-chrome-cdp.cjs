/** 시스템 Chrome CDP. 값 출력 금지. */
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

function chromeExe() {
  const p = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  return fs.existsSync(p) ? p : "";
}

async function launchCdpChrome(chromium) {
  const exe = chromeExe();
  if (!exe) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "j0-chrome-"));
  const port = 9222 + Math.floor(Math.random() * 800);
  const child = spawn(
    exe,
    [
      "--remote-debugging-port=" + port,
      "--user-data-dir=" + dir,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
    ],
    { stdio: "ignore", windowsHide: true },
  );
  await new Promise((ok) => setTimeout(ok, 2500));
  const browser = await chromium.connectOverCDP("http://127.0.0.1:" + port);
  return { browser, child };
}

module.exports = { chromeExe, launchCdpChrome };
