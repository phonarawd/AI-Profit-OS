#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const root = join(__dirname, "..", "..");
const command = process.argv[2] || "status";

const argsByCommand = {
  up: ["up", "-d", "postgres", "redis"],
  down: ["down"],
  status: ["ps"],
};

if (!argsByCommand[command]) {
  console.error("사용법: node tooling/dev/mine-local.cjs <up|down|status>");
  process.exit(2);
}

const result = spawnSync(
  "docker",
  ["compose", "-f", "docker-compose.dev.yml", ...argsByCommand[command]],
  { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
);

process.exit(result.status ?? 1);
