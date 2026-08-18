/** pnpm cleanup:cursor-roaming-live — safe Cursor cache trim WHILE Cursor is open
 *  Does NOT touch state.vscdb (requires full quit → pnpm cleanup:cursor-roaming)
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const roaming = process.env.APPDATA
  ? path.join(process.env.APPDATA, "Cursor")
  : path.join(process.env.HOME || "", "AppData", "Roaming", "Cursor");
const userCursor = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, ".cursor")
  : path.join(process.env.HOME || "", ".cursor");

function rmrf(p) {
  if (!fs.existsSync(p)) return false;
  try {
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
    return true;
  } catch (e) {
    const code = e && e.code;
    if (code === "EBUSY" || code === "EPERM" || code === "ENOENT") return false;
    throw e;
  }
}

const removed = [];

for (const rel of ["GPUCache", "DawnGraphiteCache", "DawnWebGPUCache"]) {
  if (rmrf(path.join(roaming, rel))) removed.push(rel);
}

const logsDir = path.join(roaming, "logs");
if (fs.existsSync(logsDir)) {
  const sessions = fs
    .readdirSync(logsDir)
    .map((n) => ({ n, m: fs.statSync(path.join(logsDir, n)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  for (const s of sessions.slice(1)) {
    if (rmrf(path.join(logsDir, s.n))) removed.push(`logs/${s.n}`);
  }
}

const projectsDir = path.join(userCursor, "projects");
const keepProjects = new Set([
  "c-Users-PC-Desktop-AI-PROFIT-OS",
  "AI-PROFIT-OS",
]);
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (keepProjects.has(name)) continue;
    if (rmrf(path.join(projectsDir, name))) {
      removed.push(`.cursor/projects/${name}`);
    }
  }
}

const wsRoot = path.join(roaming, "User", "workspaceStorage");
if (fs.existsSync(wsRoot)) {
  for (const name of fs.readdirSync(wsRoot)) {
    const jsonPath = path.join(wsRoot, name, "workspace.json");
    let raw = "";
    try {
      raw = fs.readFileSync(jsonPath, "utf8");
    } catch {
      raw = "";
    }
    if (/AI_PROFIT_OS/i.test(raw)) continue;
    if (rmrf(path.join(wsRoot, name))) {
      removed.push(`workspaceStorage/${name}`);
    }
  }
}

// Local Playwright browsers — 유지. Founder가 MCP·@playwright/test를 이 PC에서 씀.

// Cursor AI checkpoints — keep newest 20 (692+ folders → I/O lag)
const ckpt = path.join(roaming, "User", "globalStorage", "anysphere.cursor-commits", "checkpoints");
if (fs.existsSync(ckpt)) {
  const dirs = fs
    .readdirSync(ckpt)
    .map((n) => {
      try {
        return { n, m: fs.statSync(path.join(ckpt, n)).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.m - a.m);
  let n = 0;
  for (const d of dirs.slice(20)) {
    if (rmrf(path.join(ckpt, d.n))) n += 1;
  }
  if (n) removed.push(`checkpoints×${n} (kept 20)`);
}

console.log("[cleanup:cursor-roaming-live] removed:", removed.length ? removed.join(", ") : "(nothing)");
console.log("[cleanup:cursor-roaming-live] For 3GB+ state.vscdb: quit Cursor → pnpm cleanup:cursor-roaming");

try {
  execSync(`node "${path.join(__dirname, "../lowspec/status.cjs")}"`, { stdio: "inherit" });
} catch {
  /* ignore */
}
