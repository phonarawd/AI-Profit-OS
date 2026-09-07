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

function sleep(ms) {
  return new Promise((ok) => setTimeout(ok, ms));
}

function writeChromePrefs(profileDir, downloadDir) {
  const def = path.join(profileDir, "Default");
  fs.mkdirSync(def, { recursive: true });
  fs.mkdirSync(downloadDir, { recursive: true });
  fs.writeFileSync(
    path.join(def, "Preferences"),
    JSON.stringify({
      download: {
        default_directory: downloadDir,
        prompt_for_download: false,
        directory_upgrade: true,
      },
      safebrowsing: { enabled: false, enhanced: false },
      profile: { default_content_setting_values: { automatic_downloads: 1 } },
    }),
  );
}

function tokenFromDir(downloadDir) {
  const named = path.join(downloadDir, "j0-turnstile.token");
  const names = fs.existsSync(named)
    ? [named]
    : fs
        .readdirSync(downloadDir)
        .filter((name) => name.startsWith("j0-turnstile.token"))
        .map((name) => path.join(downloadDir, name));
  for (const file of names) {
    const raw = fs.readFileSync(file, "utf8").trim();
    try {
      fs.unlinkSync(file);
    } catch {
      /* ignore */
    }
    if (raw.length > 20) return raw;
  }
  return "";
}

async function mintOneChromeFile(mintUrl) {
  const exe = chromeExe();
  if (!exe) throw new Error("chrome_exe_missing");
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "j0-chrome-file-"));
  const downloadDir = path.join(profileDir, "handoff");
  writeChromePrefs(profileDir, downloadDir);
  const child = spawn(
    exe,
    [
      "--user-data-dir=" + profileDir,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-popup-blocking",
      "--safebrowsing-disable-download-protection",
      "--disable-blink-features=AutomationControlled",
      String(mintUrl || "") + "?handoff=file",
    ],
    { stdio: "ignore", windowsHide: false },
  );
  const deadline = Date.now() + 45000;
  try {
    while (Date.now() < deadline) {
      const token = tokenFromDir(downloadDir);
      if (token) return token;
      await sleep(400);
    }
    throw new Error("turnstile_file_empty");
  } finally {
    try {
      child.kill();
    } catch {
      /* ignore */
    }
  }
}

async function mintWithChromeFile(count, mintUrl) {
  const tokens = [];
  for (let i = 0; i < count; i += 1) {
    tokens.push(await mintOneChromeFile(mintUrl));
  }
  return tokens;
}

module.exports = { chromeExe, launchCdpChrome, mintWithChromeFile, mintOneChromeFile };
