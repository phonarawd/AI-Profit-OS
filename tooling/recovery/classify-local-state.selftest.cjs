"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { secretScanFlags } = require("./classify-local-state.cjs");

const src = fs.readFileSync(path.join(__dirname, "classify-local-state.cjs"), "utf8");
const fnSlice = src.slice(src.indexOf("function secretScanFlags"), src.indexOf("function main("));
assert.equal(fnSlice.includes("existsSync"), false, "secretScanFlags must not existsSync");
assert.equal(fnSlice.includes("statSync"), false, "secretScanFlags must not statSync");
assert.match(fnSlice, /readFileSync/);
assert.match(fnSlice, /ENOENT/);

assert.deepEqual(secretScanFlags("definitely-missing-classify-scan.nope"), []);
assert.deepEqual(secretScanFlags("tooling/recovery"), []);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classify-secret-"));
const relSafe = path.relative(path.resolve(__dirname, "../.."), path.join(dir, "safe.txt"));
const relFlag = path.relative(path.resolve(__dirname, "../.."), path.join(dir, "flag.txt"));
fs.writeFileSync(path.join(dir, "safe.txt"), "no secrets here\n", "utf8");
fs.writeFileSync(path.join(dir, "flag.txt"), "token ghp_abcdefghijklmnopqrstuvwxyz12\n", "utf8");
assert.deepEqual(secretScanFlags(relSafe), []);
assert.deepEqual(secretScanFlags(relFlag), ["ghp_token"]);
fs.rmSync(dir, { recursive: true, force: true });

process.stdout.write("[classify-local-state.selftest] PASS\n");
