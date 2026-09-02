"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const EXACT = "16.3.3";
const fails = [];

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

for (const rel of [
  "apps/admin/package.json",
  "apps/web/package.json",
  "packages/ui/package.json",
]) {
  const pkg = readJson(rel);
  const got = (pkg.dependencies && pkg.dependencies.next) ||
    (pkg.devDependencies && pkg.devDependencies.next) || "";
  if (got !== EXACT) fails.push(rel + ":next=" + got);
}

const lock = fs.readFileSync(path.join(ROOT, "pnpm-lock.yaml"), "utf8");
const required = [
  "next@16.3.3:",
  "'@next/env@16.3.3':",
  "'@next/swc-darwin-arm64@16.3.3':",
  "'@next/swc-darwin-x64@16.3.3':",
  "'@next/swc-linux-arm64-gnu@16.3.3':",
  "'@next/swc-linux-arm64-musl@16.3.3':",
  "'@next/swc-linux-x64-gnu@16.3.3':",
  "'@next/swc-linux-x64-musl@16.3.3':",
  "'@next/swc-win32-arm64-msvc@16.3.3':",
  "'@next/swc-win32-x64-msvc@16.3.3':",
  "'@swc/helpers@0.5.23':",
  "baseline-browser-mapping@2.11.19:",
  "caniuse-lite@1.0.30001810:",
  "sha512-tuRTx1nQ/yVw83cwJBo9F+njGUgMn3UHQycreWHB8XsStvvAh1AthbI8/4IpKnFaF58F+iSiHejYOlMQ/eq83g==",
];
for (const token of required) {
  if (!lock.includes(token)) fails.push("lock_missing:" + token);
}
for (const stale of ["16.3.0", "@swc/helpers@0.5.15", "baseline-browser-mapping@2.11.13", "caniuse-lite@1.0.30001809"]) {
  if (lock.includes(stale)) fails.push("lock_stale:" + stale);
}

if (fails.length) {
  console.error("[next-security-pin] FAIL");
  for (const fail of fails) console.error(" - " + fail);
  process.exit(1);
}
console.log("[next-security-pin] PASS · Next 16.3.3 exact security pin");
