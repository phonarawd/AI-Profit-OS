#!/usr/bin/env node
/**
 * REL-601 staging regression runner (HTTP smoke + optional Playwright home viewports).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  loadMatrix,
  runHttpRegression,
  assertMatrixContract,
} = require("../e2e/lib/staging-regression.cjs");

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "governance/release-master/REL-601-STAGING-REGRESSION.json");

async function main() {
  const matrix = loadMatrix();
  const contractIssues = assertMatrixContract(matrix);
  if (contractIssues.length) {
    console.error("[staging-regression] contract FAIL");
    for (const i of contractIssues) console.error(" - " + i);
    process.exit(1);
  }

  const report = await runHttpRegression(matrix);
  console.log(
    `[staging-regression] HTTP ${report.passCount}/${report.surfaceCount + report.assetCount} pass`,
  );

  const runPw =
    process.env.STAGING_REGRESSION_PW === "1" ||
    process.env.CI === "true" ||
    process.env.CI === "1";
  if (runPw) {
    const pw = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      [
        "playwright",
        "test",
        "tooling/e2e/specs/staging-regression.spec.cjs",
        "--config=tooling/e2e/playwright.config.cjs",
      ],
      { cwd: ROOT, encoding: "utf8", timeout: 300000, shell: process.platform === "win32" },
    );
    report.playwright = {
      ran: true,
      pass: pw.status === 0,
      exitCode: pw.status,
      stdout: String(pw.stdout || "").slice(-2000),
      stderr: String(pw.stderr || "").slice(-2000),
    };
    if (pw.status !== 0) {
      report.pass = false;
      report.failCount += 1;
      console.error("[staging-regression] Playwright FAIL");
    } else {
      console.log("[staging-regression] Playwright home viewports PASS");
    }
  } else {
    report.playwright = { ran: false, reason: "STAGING_REGRESSION_PW not set" };
    console.log("[staging-regression] Playwright skipped (set STAGING_REGRESSION_PW=1)");
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

  if (!report.pass) {
    for (const row of report.rows.filter((r) => !r.pass)) {
      console.error(` - FAIL ${row.id}: ${row.issues.join("; ")}`);
    }
    process.exit(1);
  }
  console.log("[staging-regression] PASS");
}

main().catch((err) => {
  console.error("[staging-regression] error:", err.message || err);
  process.exit(1);
});
