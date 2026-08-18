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
  try {
    fs.rmSync(p, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
    return true;
  } catch (e) {
    const code = e && e.code;
    if (code === "EBUSY" || code === "EPERM" || code === "ENOENT") return false;
    throw e;
  }
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

function findPython() {
  try {
    execSync("python --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function pythonSql(dbPath, sql) {
  const script = [
    "import sqlite3, sys",
    "db, sql = sys.argv[1], sys.argv[2]",
    "con = sqlite3.connect(db)",
    "cur = con.cursor()",
    "cur.execute(sql)",
    "if cur.description:",
    "    row = cur.fetchone()",
    "    print('' if row is None else row[0])",
    "con.commit()",
    "con.close()",
  ].join("\n");
  const r = spawnSync("python", ["-c", script, dbPath, sql], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) {
    throw new Error(String(r.stderr || r.stdout || "python sqlite failed").slice(0, 300));
  }
  return String(r.stdout || "").trim();
}

function runSql(dbPath, sql) {
  if (findSqlite3()) {
    return sqlite3(`"${dbPath.replace(/"/g, '""')}" "${sql.replace(/"/g, '""')}"`);
  }
  if (findPython()) return pythonSql(dbPath, sql);
  throw new Error("no sqlite3 and no python");
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

// Local Playwright browsers — 유지. Founder가 MCP·@playwright/test를 이 PC에서 씀.

// --- Cursor AI checkpoints (keep newest 20) ---
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

const agentWorker = path.join(
  roaming,
  "User",
  "globalStorage",
  "anysphere.cursor-agent-worker"
);
if (rmrf(agentWorker)) removed.push("anysphere.cursor-agent-worker");

// --- Agent blob cache in state.vscdb (main multi-GB bloat) ---
const stateDb = path.join(roaming, "User", "globalStorage", "state.vscdb");
let agentDeleted = 0;
if (fs.existsSync(stateDb)) {
  const beforeDb = fs.statSync(stateDb).size;
  try {
    const count = runSql(
      stateDb,
      "SELECT COUNT(*) FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%'"
    );
    agentDeleted = Number(count) || 0;
    runSql(stateDb, "DELETE FROM cursorDiskKV WHERE key LIKE 'agentKv:blob:%'");
    runSql(stateDb, "VACUUM");
    const afterDb = fs.statSync(stateDb).size;
    removed.push(`state.vscdb agentKv×${agentDeleted} (${mb(beforeDb)} → ${mb(afterDb)})`);
  } catch (e) {
    console.warn("[cleanup:cursor-roaming] state.vscdb prune skipped:", e.message || e);
  }
}

const convDb = path.join(roaming, "User", "globalStorage", "conversation-search.db");
if (fs.existsSync(convDb)) {
  try {
    const b = fs.statSync(convDb).size;
    runSql(convDb, "VACUUM");
    removed.push(`conversation-search.db (${mb(b)} → ${mb(fs.statSync(convDb).size)})`);
  } catch {
    /* ignore */
  }
}

const aiTrack = path.join(userCursor, "ai-tracking");
if (fs.existsSync(aiTrack)) {
  for (const name of fs.readdirSync(aiTrack)) {
    if (!name.endsWith(".db")) continue;
    const dbPath = path.join(aiTrack, name);
    try {
      const b = fs.statSync(dbPath).size;
      runSql(dbPath, "VACUUM");
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
