/** pnpm cleanup:cursor-roaming — prune Cursor Roaming bloat (8GB PC · ADR-016)
 *  SAFE: logs · GPU/HTTP cache · stale snapshots · agentKv blob cache · VACUUM state.vscdb
 *  REQUIRES: Cursor fully quit (script exits if Cursor.exe is running)
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const roaming = process.env.APPDATA
  ? path.join(process.env.APPDATA, "Cursor")
  : path.join(process.env.HOME || "", "AppData", "Roaming", "Cursor");
const userCursor = process.env.USERPROFILE
  ? path.join(process.env.USERPROFILE, ".cursor")
  : path.join(process.env.HOME || "", ".cursor");

function mb(n) {
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}

function dirSize(p) {
  if (!fs.existsSync(p)) return 0;
  let total = 0;
  const stack = [p];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

function rmrf(p) {
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}

function cursorRunning() {
  try {
    if (process.platform === "win32") {
      const out = execSync(
        'powershell -NoProfile -Command "(Get-Process Cursor -ErrorAction SilentlyContinue | Measure-Object).Count"',
        { encoding: "utf8" }
      ).trim();
      return Number(out) > 0;
    }
    execSync("pgrep -x Cursor", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function sqlite3(args) {
  const cmd = process.platform === "win32" ? "sqlite3.exe" : "sqlite3";
  return execSync(`${cmd} ${args}`, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function findSqlite3() {
  try {
    execSync(process.platform === "win32" ? "where sqlite3" : "which sqlite3", {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

const removed = [];
const beforeRoaming = dirSize(roaming);

if (cursorRunning()) {
  console.error("[cleanup:cursor-roaming] FAIL — Cursor.exe is still running.");
  console.error("  1) File → Exit (all windows)  2) re-run: pnpm cleanup:cursor-roaming");
  process.exit(2);
}

// --- HTTP / GPU caches (safe) ---
for (const rel of ["Cache", "GPUCache", "Code Cache", "DawnGraphiteCache", "DawnWebGPUCache"]) {
  if (rmrf(path.join(roaming, rel))) removed.push(rel);
}

// --- Old log sessions (keep newest folder) ---
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

// --- Stale workspace snapshots (other repos; regenerated on open) ---
const snapRoots = path.join(roaming, "snapshots", "roots");
if (fs.existsSync(snapRoots)) {
  const keep = new Set(["AI_PROFIT_OS-28bbe72e"]);
  for (const name of fs.readdirSync(snapRoots)) {
    if (keep.has(name)) continue;
    const p = path.join(snapRoots, name);
    if (rmrf(p)) removed.push(`snapshots/roots/${name}`);
  }
}

// --- Empty temp project metadata ---
const projectsDir = path.join(userCursor, "projects");
if (fs.existsSync(projectsDir)) {
  for (const name of fs.readdirSync(projectsDir)) {
    if (!/^C-Users-PC-AppData-Local-Temp-/.test(name) && !/^178\d+$/.test(name)) continue;
    const p = path.join(projectsDir, name);
    const size = dirSize(p);
    if (size < 1024 && rmrf(p)) removed.push(`.cursor/projects/${name}`);
  }
}

// --- Disable Continue extension (230MB · dual-AI ban per ADR-016) ---
const extDir = path.join(userCursor, "extensions");
if (fs.existsSync(extDir)) {
  for (const name of fs.readdirSync(extDir)) {
    if (/^continue\.continue-/.test(name) && !name.endsWith(".disabled")) {
      const from = path.join(extDir, name);
      const to = `${from}.disabled`;
      try {
        fs.renameSync(from, to);
        removed.push(`extensions/${name} → .disabled`);
      } catch {
        /* ignore */
      }
    }
  }
}

// --- Agent blob cache in state.vscdb (main 3GB+ bloat) ---
const stateDb = path.join(roaming, "User", "globalStorage", "state.vscdb");
let agentDeleted = 0;
if (fs.existsSync(stateDb) && findSqlite3()) {
  const beforeDb = fs.statSync(stateDb).size;
  try {
    const count = sqlite3(`"${stateDb.replace(/"/g, '""')}" "SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';"`);
    agentDeleted = Number(count) || 0;
    sqlite3(`"${stateDb.replace(/"/g, '""')}" "DELETE FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%';"`);
    sqlite3(`"${stateDb.replace(/"/g, '""')}" "VACUUM;"`);
    const afterDb = fs.statSync(stateDb).size;
    removed.push(`state.vscdb agentKv×${agentDeleted} (${mb(beforeDb)} → ${mb(afterDb)})`);
  } catch (e) {
    console.warn("[cleanup:cursor-roaming] state.vscdb prune skipped:", e.message || e);
  }
} else if (fs.existsSync(stateDb) && !findSqlite3()) {
  console.warn("[cleanup:cursor-roaming] sqlite3 not found — install scoop sqlite or run VACUUM manually");
}

// --- conversation-search.db VACUUM ---
const convDb = path.join(roaming, "User", "globalStorage", "conversation-search.db");
if (fs.existsSync(convDb) && findSqlite3()) {
  try {
    const b = fs.statSync(convDb).size;
    sqlite3(`"${convDb.replace(/"/g, '""')}" "VACUUM;"`);
    removed.push(`conversation-search.db (${mb(b)} → ${mb(fs.statSync(convDb).size)})`);
  } catch {
    /* ignore */
  }
}

// --- ai-tracking.db (Composer usage telemetry cache) ---
const aiTrack = path.join(userCursor, "ai-tracking");
if (fs.existsSync(aiTrack)) {
  for (const name of fs.readdirSync(aiTrack)) {
    if (!name.endsWith(".db")) continue;
    const dbPath = path.join(aiTrack, name);
    if (!findSqlite3()) continue;
    try {
      const b = fs.statSync(dbPath).size;
      sqlite3(`"${dbPath.replace(/"/g, '""')}" "VACUUM;"`);
      removed.push(`ai-tracking/${name} (${mb(b)} → ${mb(fs.statSync(dbPath).size)})`);
    } catch {
      /* ignore */
    }
  }
}

const afterRoaming = dirSize(roaming);
console.log("[cleanup:cursor-roaming] removed:", removed.length ? removed.join("\n  ") : "(nothing)");
console.log(`[cleanup:cursor-roaming] Roaming total: ${mb(beforeRoaming)} → ${mb(afterRoaming)} (saved ${mb(beforeRoaming - afterRoaming)})`);
console.log("[cleanup:cursor-roaming] done — restart Cursor once.");
