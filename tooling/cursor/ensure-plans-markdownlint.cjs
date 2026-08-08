#!/usr/bin/env node
/**
 * Ensures %USERPROFILE%\.cursor\plans\ has companion markdownlint configs so
 * davidanson.vscode-markdownlint never throws ENOENT on global Cursor plan files.
 *
 * Sync target: ~/.cursor/plans/.markdownlint.json + .markdownlint-cli2.jsonc
 * Idempotent — safe on every pnpm install (prepare hook).
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const plansDir = path.join(process.env.USERPROFILE || process.env.HOME || "", ".cursor", "plans");

const markdownlintJson = {
  $schema:
    "https://raw.githubusercontent.com/DavidAnson/markdownlint/main/schema/markdownlint-config-schema.json",
  default: false,
};

const markdownlintCli2 = `{
  // Cursor Plan files (%USERPROFILE%\\\\.cursor\\\\plans\\\\*.plan.md) are outside git repos.
  // They use YAML frontmatter + dense AI prose and must NOT be style-linted.
  // Synced by: pnpm cursor:ensure-plans-markdownlint (AI Profit OS prepare hook)
  "globs": [],
  "ignores": ["**/*"],
  "config": {
    "extends": ".markdownlint.json"
  }
}
`;

function writeIfChanged(filePath, content) {
  const next = typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`;
  let current = null;
  try {
    current = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  if (current === next) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, next, "utf8");
  return true;
}

function main() {
  if (!process.env.USERPROFILE && !process.env.HOME) {
    console.warn("[cursor:ensure-plans-markdownlint] skip — no USERPROFILE/HOME");
    process.exit(0);
  }

  fs.mkdirSync(plansDir, { recursive: true });

  const jsonPath = path.join(plansDir, ".markdownlint.json");
  const cli2Path = path.join(plansDir, ".markdownlint-cli2.jsonc");

  const wroteJson = writeIfChanged(jsonPath, markdownlintJson);
  const wroteCli2 = writeIfChanged(cli2Path, markdownlintCli2);

  if (wroteJson || wroteCli2) {
    const parts = [];
    if (wroteJson) parts.push(".markdownlint.json");
    if (wroteCli2) parts.push(".markdownlint-cli2.jsonc");
    console.log(`[cursor:ensure-plans-markdownlint] wrote ${parts.join(" + ")} → ${plansDir}`);
  }
}

main();
