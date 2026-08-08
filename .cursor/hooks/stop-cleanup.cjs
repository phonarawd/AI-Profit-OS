#!/usr/bin/env node
/** stop / sessionEnd — run lowspec cleanup; remind verify */
const { execSync } = require("child_process");
const path = require("path");

const root = process.cwd();
let cleanupLog = "cleanup skipped";
try {
  cleanupLog = execSync("pnpm cleanup:lowspec", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 55000,
  });
} catch (e) {
  cleanupLog = (e.stdout || e.stderr || e.message || "cleanup error").toString().slice(0, 800);
}

process.stdout.write(
  JSON.stringify({
    continue: true,
    agentMessage: [
      "ADR-016 stop: ran cleanup:lowspec.",
      "Confirm domain verify:* PASS before claiming done.",
      cleanupLog.slice(0, 500),
    ].join("\n"),
  })
);
