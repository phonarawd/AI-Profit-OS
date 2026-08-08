/** pnpm cleanup:lowspec — free disk/RAM pressure on 8GB / 2-core machines */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "../..");
const killDirs = [
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
  ".turbo",
];

function rmrf(p) {
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}

const removed = [];
for (const d of killDirs) {
  if (rmrf(path.join(root, d))) removed.push(d);
}

for (const base of ["apps", "packages", "services", "workers"]) {
  const b = path.join(root, base);
  if (!fs.existsSync(b)) continue;
  for (const name of fs.readdirSync(b)) {
    for (const junk of [".next", "dist", ".open-next", ".wrangler"]) {
      const p = path.join(b, name, junk);
      if (rmrf(p)) removed.push(path.relative(root, p));
    }
    // Rust debug artifacts (largest local RAM/disk spike after engine work)
    const debug = path.join(b, name, "target", "debug");
    if (rmrf(debug)) removed.push(path.relative(root, debug));
  }
}

for (const f of fs.readdirSync(root)) {
  if (/^_tmp/.test(f) || /\.log$/.test(f)) {
    try {
      fs.rmSync(path.join(root, f), { recursive: true, force: true });
      removed.push(f);
    } catch {
      /* ignore */
    }
  }
}

try {
  execSync("pnpm store prune", { cwd: root, stdio: "ignore" });
  removed.push("pnpm-store-prune");
} catch {
  /* ignore */
}

console.log("[cleanup:lowspec] removed:", removed.length ? removed.join(", ") : "(nothing)");

try {
  const { spawnSync } = require("child_process");
  const st = spawnSync(process.execPath, [path.join(root, "tooling/lowspec/status.cjs")], {
    cwd: root,
    encoding: "utf8",
  });
  if (st.stdout) process.stdout.write(st.stdout);
} catch {
  /* ignore */
}
