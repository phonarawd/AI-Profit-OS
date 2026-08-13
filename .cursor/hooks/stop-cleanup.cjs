#!/usr/bin/env node
/** sessionEnd only — sync plan SSOT to Cursor home · lowspec cleanup · remind verify */
const { execSync, spawnSync } = require("child_process");
const path = require("path");

const root = process.cwd();

let plansLog = "plans sync skipped";
try {
  const r = spawnSync(
    process.execPath,
    [path.join(root, "tooling/cursor/sync-plans-ssot.cjs"), "--quiet"],
    { cwd: root, encoding: "utf8", timeout: 15000 },
  );
  plansLog =
    r.status === 0
      ? "plans SSOT synced (workspace → %USERPROFILE%\\.cursor\\plans)"
      : `plans sync WARN: ${(r.stderr || r.stdout || "").toString().slice(0, 300)}`;
} catch (e) {
  plansLog = `plans sync WARN: ${e.message}`;
}

let cleanupLog = "cleanup skipped";
try {
  cleanupLog = execSync("pnpm cleanup:lowspec", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 40000,
  });
} catch (e) {
  cleanupLog = (e.stdout || e.stderr || e.message || "cleanup error").toString().slice(0, 800);
}

process.stdout.write(
  JSON.stringify({
    continue: true,
    agentMessage: [
      "ADR-016 stop: plans SSOT sync + cleanup:lowspec.",
      plansLog,
      "Confirm domain verify:* PASS before claiming done.",
      "Todo complete = plan YAML status:completed + pnpm cursor:sync-plans (hook did sync).",
      cleanupLog.slice(0, 400),
    ].join("\n"),
  })
);
