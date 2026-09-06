#!/usr/bin/env node
"use strict";

/**
 * Install Render CLI to ~/.local/bin (Windows: render.exe) if missing.
 * Does not print secrets. Uses official render-oss/cli GitHub releases.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const https = require("node:https");

const VERSION = "v2.19.0";
const ARCH = process.arch === "arm64" ? "arm64" : "amd64";
const OS = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux";
const VERSION_NUM = VERSION.replace(/^v/, "");
const ZIP = `cli_${VERSION_NUM}_${OS}_${ARCH}.zip`;
const URL = `https://github.com/render-oss/cli/releases/download/${VERSION}/${ZIP}`;
const INSTALL_DIR = path.join(process.env.USERPROFILE || process.env.HOME || ".", ".local", "bin");
const TARGET = path.join(INSTALL_DIR, process.platform === "win32" ? "render.exe" : "render");

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download failed: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

function findBinary(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      const nested = findBinary(full);
      if (nested) return nested;
      continue;
    }
    if (/^cli_v/i.test(name) || name === "render" || name === "render.exe") return full;
  }
  return null;
}

async function main() {
  if (fs.existsSync(TARGET)) {
    const ver = spawnSync(TARGET, ["--version"], { encoding: "utf8" });
    process.stdout.write(`render CLI already installed: ${TARGET}\n${ver.stdout || ver.stderr || ""}`);
    return;
  }

  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "render-cli-"));
  const zipPath = path.join(tmpDir, ZIP);

  process.stdout.write(`Downloading Render CLI ${VERSION} …\n`);
  await download(URL, zipPath);

  if (process.platform === "win32") {
    execFileSync(
      "powershell",
      ["-NoProfile", "-Command", `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force`],
      { stdio: "inherit" },
    );
  } else {
    execFileSync("unzip", ["-o", zipPath, "-d", tmpDir], { stdio: "inherit" });
  }

  const binary = findBinary(tmpDir);
  if (!binary) throw new Error("render binary not found in archive");
  fs.copyFileSync(binary, TARGET);
  if (process.platform !== "win32") fs.chmodSync(TARGET, 0o755);

  const ver = spawnSync(TARGET, ["--version"], { encoding: "utf8" });
  process.stdout.write(`Installed Render CLI → ${TARGET}\n${ver.stdout || ver.stderr || ""}`);
  process.stdout.write(`Add to PATH: ${INSTALL_DIR}\n`);
}

main().catch((err) => {
  process.stderr.write(`[ensure-render-cli] FAIL: ${err.message}\n`);
  process.exit(1);
});
