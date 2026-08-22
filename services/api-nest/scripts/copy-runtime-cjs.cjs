/**
 * tsc는 .ts만 dist에 낸다. runtime sibling .cjs를 src 상대 경로 그대로 미러한다.
 * require(join(__dirname, "*.cjs")) 경로를 바꾸지 않는다.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const pkgRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(pkgRoot, "src");
const distRoot = path.join(pkgRoot, "dist");

function listRuntimeCjs(dir, acc = []) {
  if (!fs.existsSync(dir)) {
    throw new Error(`[copy-runtime-cjs] src missing: ${dir}`);
  }
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      listRuntimeCjs(abs, acc);
      continue;
    }
    if (ent.isFile() && ent.name.endsWith(".cjs")) {
      acc.push(abs);
    }
  }
  return acc;
}

const files = listRuntimeCjs(srcRoot);
if (files.length < 1) {
  throw new Error("[copy-runtime-cjs] src/**/*.cjs 0 — mirror refused");
}

for (const srcAbs of files) {
  const rel = path.relative(srcRoot, srcAbs);
  const destAbs = path.join(distRoot, rel);
  fs.mkdirSync(path.dirname(destAbs), { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
}

const rels = files.map((abs) => path.relative(srcRoot, abs).split(path.sep).join("/"));
console.log(`[copy-runtime-cjs] mirrored ${rels.length}: ${rels.join(" ")}`);
