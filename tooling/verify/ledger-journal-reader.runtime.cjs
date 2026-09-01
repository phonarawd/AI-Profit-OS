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
import {
  readUserJournal,
  fetchUserJournalList,
  fetchUserJournal,
} from ${JSON.stringify(pathToFileURL(tmp).href)};
import { LedgerRequestError } from ${JSON.stringify(errorsUrl)};

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
expectBlock("empty entries", { ...baseJournal("1.00"), entries: [] });
expectBlock("missing entries", ((o) => { const x = { ...o }; delete x.entries; return x; })(baseJournal("1.00")));

function httpRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  };
}

function mockFetch(impl) {
  globalThis.fetch = impl;
}

async function expectLedgerCode(name, impl, fn, code) {
  mockFetch(impl);
  try {
    await fn();
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    if (!(err instanceof LedgerRequestError) || err.code !== code) {
      throw new Error(
        name +
          " code=" +
          (err && err.code) +
          " status=" +
          (err && err.status) +
          " expected " +
          code,
      );
    }
  }
}

const validList = {
  items: [baseJournal("1.00")],
  total: 1,
  limit: 20,
  offset: 0,
};
const emptyList = { items: [], total: 0, limit: 20, offset: 0 };

mockFetch(async () => httpRes(200, emptyList));
const empty = await fetchUserJournalList({ limit: 20, offset: 0 });
if (empty.total !== 0 || empty.items.length !== 0) {
  throw new Error("valid empty list must stay empty");
}

mockFetch(async () => httpRes(200, validList));
const listed = await fetchUserJournalList({ limit: 20, offset: 0 });
if (listed.items[0].entries[0].amountUsdt !== "1.00") {
  throw new Error("valid list decimal was rejected");
}

mockFetch(async () =>
  httpRes(200, {
    items: [baseJournal("1.00"), { id: "bad" }],
    total: 2,
    limit: 20,
    offset: 0,
  }),
);
try {
  await fetchUserJournalList({ limit: 20, offset: 0 });
  throw new Error("EXPECTED_THROW:malformed list item");
} catch (err) {
  if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
  if (!(err instanceof LedgerRequestError) || err.status !== 502) {
    throw new Error("one malformed journal must fail the whole list");
  }
}

await expectLedgerCode(
  "list 401",
  async () => httpRes(401, { error: "unauthorized" }),
  () => fetchUserJournalList(),
  "AUTH_REQUIRED",
);
await expectLedgerCode(
  "list 403",
  async () => httpRes(403, { error: "forbidden" }),
  () => fetchUserJournalList(),
  "FORBIDDEN",
);
await expectLedgerCode(
  "list 404",
  async () => httpRes(404, { error: "missing" }),
  () => fetchUserJournalList(),
  "NOT_FOUND",
);
await expectLedgerCode(
  "list 5xx",
  async () => httpRes(500, { error: "boom" }),
  () => fetchUserJournalList(),
  "REQUEST_FAILED",
);
await expectLedgerCode(
  "list network",
  async () => {
    throw new Error("ECONNRESET");
  },
  () => fetchUserJournalList(),
  "NETWORK_ERROR",
);

mockFetch(async () => httpRes(200, { journal: baseJournal("250.00") }));
const detail = await fetchUserJournal("j1");
if (detail.entries[0].amountUsdt !== "250.00") {
  throw new Error("valid detail decimal was rejected");
}

await expectLedgerCode(
  "detail 401",
  async () => httpRes(401, { error: "unauthorized" }),
  () => fetchUserJournal("j1"),
  "AUTH_REQUIRED",
);
await expectLedgerCode(
  "detail 403",
  async () => httpRes(403, { error: "forbidden" }),
  () => fetchUserJournal("j1"),
  "FORBIDDEN",
);
await expectLedgerCode(
  "detail 404",
  async () => httpRes(404, { error: "missing" }),
  () => fetchUserJournal("j1"),
  "NOT_FOUND",
);
await expectLedgerCode(
  "detail 5xx",
  async () => httpRes(503, { error: "boom" }),
  () => fetchUserJournal("j1"),
  "REQUEST_FAILED",
);
await expectLedgerCode(
  "detail network",
  async () => {
    throw new Error("ECONNRESET");
  },
  () => fetchUserJournal("j1"),
  "NETWORK_ERROR",
);
await expectLedgerCode(
  "detail malformed 200",
  async () => httpRes(200, { journal: { ...baseJournal("1.00"), extra: "1" } }),
  () => fetchUserJournal("j1"),
  "REQUEST_FAILED",
);

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
