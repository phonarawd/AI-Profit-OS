/**
 * REL-015 journal reader 행동 테스트.
 * fetch.ts를 strip-types로 실행해 실제 readUserJournal을 검증한다.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const fetchPath = path.join(root, "packages/sdk/src/ledger/fetch.ts");
const errorsUrl = pathToFileURL(
  path.join(root, "packages/sdk/src/ledger/errors.ts"),
).href;
const typesUrl = pathToFileURL(
  path.join(root, "packages/sdk/src/ledger/types.ts"),
).href;

let src = fs.readFileSync(fetchPath, "utf8");
src = src
  .replace(/from\s+["']\.\/errors["']/, `from ${JSON.stringify(errorsUrl)}`)
  .replace(/from\s+["']\.\/types["']/, `from ${JSON.stringify(typesUrl)}`);

const tmp = path.join(os.tmpdir(), "aipo-ledger-fetch.runtime.mts");
fs.writeFileSync(tmp, src);

const runner = `
import { readUserJournal } from ${JSON.stringify(pathToFileURL(tmp).href)};

function baseEntry(amountUsdt) {
  return {
    id: "e1",
    direction: "credit",
    amountUsdt,
    bucket: "principal",
    accountKind: "user_liability",
  };
}

function baseJournal(amountUsdt, extra = {}) {
  return {
    id: "j1",
    journalType: "deposit_usdt",
    createdAt: "2026-08-31T00:00:00.000Z",
    referenceType: null,
    referenceId: null,
    entries: [baseEntry(amountUsdt)],
    ...extra,
  };
}

function expectPass(name, amount) {
  const got = readUserJournal(baseJournal(amount));
  if (!got || got.entries[0].amountUsdt !== amount) {
    throw new Error("PASS case failed: " + name + " amount=" + amount);
  }
}

function expectBlock(name, raw) {
  if (readUserJournal(raw) !== null) {
    throw new Error("BLOCK case leaked: " + name);
  }
}

expectPass("0", "0");
expectPass("1", "1");
expectPass("1.00", "1.00");
expectPass("250.00", "250.00");
expectPass("12.50", "12.50");

expectBlock("missing amount", {
  ...baseJournal("1.00"),
  entries: [{
    id: "e1",
    direction: "credit",
    bucket: "principal",
    accountKind: "user_liability",
  }],
});
expectBlock("numeric 1", baseJournal(1));
expectBlock("trailing dot", baseJournal("1."));
expectBlock("leading dot", baseJournal(".1"));
expectBlock("nul", baseJournal("1\\x00"));
expectBlock("backslash decoy", baseJournal("1\\\\x00"));
expectBlock("malformed direction", {
  ...baseJournal("1.00"),
  entries: [{ ...baseEntry("1.00"), direction: "up" }],
});
expectBlock("malformed entry", { ...baseJournal("1.00"), entries: ["nope"] });
expectBlock("extra journal key", baseJournal("1.00", { extra: "1" }));
expectBlock("extra entry key", {
  ...baseJournal("1.00"),
  entries: [{ ...baseEntry("1.00"), extra: "1" }],
});

console.log("ledger-journal-reader-behavior PASS");
`;

const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "--eval", runner],
  { cwd: root, encoding: "utf8", timeout: 20_000 },
);
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
try {
  fs.unlinkSync(tmp);
} catch {
  /* ignore */
}
if (run.status !== 0) process.exit(run.status || 1);
