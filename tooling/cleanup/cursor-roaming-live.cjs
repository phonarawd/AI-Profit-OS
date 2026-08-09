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
  fs.rmSync(p, { recursive: true, force: true });
  return true;
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
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (!/^C-Users-PC-AppData-Local-Temp-/.test(name) && !/^178\d+$/.test(name)) continue;
    const p = path.join(projectsDir, name);
    try {
      const files = fs.readdirSync(p);
      if (files.length === 0 && rmrf(p)) removed.push(`.cursor/projects/${name}`);
    } catch {
      /* ignore */
    }
  }
}

console.log("[cleanup:cursor-roaming-live] removed:", removed.length ? removed.join(", ") : "(nothing)");
console.log("[cleanup:cursor-roaming-live] For 3GB+ state.vscdb: quit Cursor → pnpm cleanup:cursor-roaming");

try {
  execSync(`node "${path.join(__dirname, "../lowspec/status.cjs")}"`, { stdio: "inherit" });
} catch {
  /* ignore */
}
