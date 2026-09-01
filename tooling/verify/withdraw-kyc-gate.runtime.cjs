/**
 * #92 — withdraw KYC gate 상태 매트릭스 (Next 0).
 * 훅 소스의 파서/HTTP 분류를 잘라 실제 함수 본문을 실행한다.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const os = require("node:os");

const root = path.resolve(__dirname, "../..");
const hookPath = path.join(root, "apps/web/lib/use-withdraw-kyc-gate.ts");
const usdt = fs.readFileSync(
  path.join(root, "apps/web/app/wallet/withdraw/usdt/page.tsx"),
  "utf8",
);
const krw = fs.readFileSync(
  path.join(root, "apps/web/app/wallet/withdraw/krw/page.tsx"),
  "utf8",
);
const hook = fs.readFileSync(hookPath, "utf8");

function fail(msg) {
  console.error("[withdraw-kyc-gate-runtime] " + msg);
  process.exit(1);
}

if (usdt.includes("allowWithdrawForm || !gate.toastMessage")) {
  fail("USDT page still fail-opens before KYC authority");
}
if (krw.includes("allowWithdrawForm || !gate.toastMessage")) {
  fail("KRW page still fail-opens before KYC authority");
}
if (!usdt.includes("allowForm={gate.allowWithdrawForm}")) {
  fail("USDT page must bind allowForm to allowWithdrawForm only");
}
if (!krw.includes("allowForm={gate.allowWithdrawForm}")) {
  fail("KRW page must bind allowForm to allowWithdrawForm only");
}
if (
  !hook.includes('allowWithdrawForm: authority === "ready" && kycStatus === "approved"')
) {
  fail("hook must allow the form only when ready+approved");
}
if (!hook.includes('useState<KycAuthorityView>("loading")')) {
  fail("hook must start authority=loading");
}
if (!hook.includes('"/api/v1/compliance/kyc/status"')) {
  fail("hook must call session-owned kyc/status");
}

const start = hook.indexOf("const KYC_STATUS_PATH");
const end = hook.indexOf("export function useWithdrawKycGate");
if (start < 0 || end < 0 || end <= start) {
  fail("cannot isolate KYC parser/HTTP from hook source");
}

const core =
  hook
    .slice(start, end)
    .replace("class KycStatusLoadError", "export class KycStatusLoadError")
    .replace(
      'constructor(readonly kind: "unauthorized" | "unavailable")',
      "constructor(kind)",
    )
    .replace("super(kind);", "super(kind);\n    this.kind = kind;")
    .replace(
      "function parseKycStatus",
      "export function parseKycStatus",
    )
    .replace(
      "async function fetchSessionKycStatus",
      "export async function fetchSessionKycStatus",
    ) +
  `
export function withdrawFormAllowed(authority, kycStatus) {
  return authority === "ready" && kycStatus === "approved";
}
`;

const tmp = path.join(os.tmpdir(), "aipo-withdraw-kyc-gate.runtime.mts");
fs.writeFileSync(tmp, core);
const coreUrl = pathToFileURL(tmp).href;

const runner = `
import {
  parseKycStatus,
  fetchSessionKycStatus,
  withdrawFormAllowed,
  KycStatusLoadError,
} from ${JSON.stringify(coreUrl)};

function expectUnavailable(name, raw) {
  try {
    parseKycStatus(raw);
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    if (!(err instanceof KycStatusLoadError) || err.kind !== "unavailable") {
      throw new Error(name + " expected unavailable: " + (err && err.message));
    }
  }
}

function validStatus(kycStatus) {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    kycStatus,
    submissionId: "sub_1",
    decidedAt: "2026-08-31T00:00:00.000Z",
    rejectReason: "",
  };
}

for (const st of ["none", "pending", "approved", "rejected"]) {
  if (parseKycStatus(validStatus(st)) !== st) {
    throw new Error("parse failed for " + st);
  }
}
expectUnavailable("null", null);
expectUnavailable("array", []);
expectUnavailable("bad enum", validStatus("maybe"));
expectUnavailable("missing userId", { kycStatus: "approved" });
expectUnavailable("extra key", { ...validStatus("approved"), extra: "1" });

if (withdrawFormAllowed("loading", null) !== false) {
  throw new Error("loading must hide form");
}
if (withdrawFormAllowed("unauthorized", null) !== false) {
  throw new Error("unauthorized must hide form");
}
if (withdrawFormAllowed("unavailable", null) !== false) {
  throw new Error("unavailable must hide form");
}
if (withdrawFormAllowed("ready", "none") !== false) {
  throw new Error("none must hide form");
}
if (withdrawFormAllowed("ready", "pending") !== false) {
  throw new Error("pending must hide form");
}
if (withdrawFormAllowed("ready", "rejected") !== false) {
  throw new Error("rejected must hide form");
}
if (withdrawFormAllowed("ready", "approved") !== true) {
  throw new Error("approved ready must show form");
}

function httpRes(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === "BAD_JSON") throw new Error("json");
      return body;
    },
    text: async () => JSON.stringify(body),
  };
}

async function expectKind(name, impl, kind) {
  globalThis.fetch = impl;
  try {
    await fetchSessionKycStatus();
    throw new Error("EXPECTED_THROW:" + name);
  } catch (err) {
    if (String(err && err.message).startsWith("EXPECTED_THROW:")) throw err;
    if (!(err instanceof KycStatusLoadError) || err.kind !== kind) {
      throw new Error(name + " kind=" + (err && err.kind) + " expected " + kind);
    }
  }
}

await expectKind("401", async () => httpRes(401, { error: "unauthorized" }), "unauthorized");
await expectKind("403", async () => httpRes(403, { error: "forbidden" }), "unauthorized");
await expectKind("5xx", async () => httpRes(500, { error: "boom" }), "unavailable");
await expectKind("network", async () => { throw new Error("ECONNRESET"); }, "unavailable");
await expectKind("malformed 200 json", async () => httpRes(200, "BAD_JSON"), "unavailable");

globalThis.fetch = async () => httpRes(200, validStatus("approved"));
const raw = await fetchSessionKycStatus();
if (parseKycStatus(raw) !== "approved") {
  throw new Error("approved 200 must parse");
}
if (withdrawFormAllowed("ready", parseKycStatus(raw)) !== true) {
  throw new Error("approved 200 must allow form");
}

console.log("withdraw-kyc-gate-behavior PASS");
`;

const run = spawnSync(
  process.execPath,
  ["--experimental-strip-types", "--input-type=module", "--eval", runner],
  { cwd: root, encoding: "utf8", timeout: 20_000 },
);
try {
  fs.unlinkSync(tmp);
} catch {
  /* ignore */
}
process.stdout.write(run.stdout || "");
process.stderr.write(run.stderr || "");
if (run.status !== 0) process.exit(run.status || 1);
