#!/usr/bin/env node
/**
 * Fault-injection: INTERNAL FAILURE SECURITY (fixture only).
 * Foreign paths assembled at runtime — never open foreign project contents.
 *
 * SECURITY_EXPECTED_FAILURE = import/load crash (failClosed) — not counted as
 * unexpected nonzero for stability.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const REAL_HOOK = path.join(ROOT, ".cursor", "hooks", "project-boundary.mjs");

const marker = ["clime", "gb"].join("-");
const FOREIGN_FS = "C:\\Users\\PC\\Desktop\\" + marker + "\\README.md";
const foreign = {
  hook_event_name: "beforeReadFile",
  file_path: FOREIGN_FS,
};
const local = {
  hook_event_name: "beforeReadFile",
  file_path: path.join(ROOT, "package.json"),
};

function toFileUrl(p) {
  const abs = path.resolve(p).replace(/\\/g, "/");
  return abs.startsWith("/") ? "file://" + abs : "file:///" + abs;
}

function run(args, stdin, timeoutMs) {
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    input: typeof stdin === "string" ? stdin : JSON.stringify(stdin ?? {}),
    encoding: "utf8",
    timeout: timeoutMs || 8000,
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(String(r.stdout || "").trim());
  } catch {
    json = null;
  }
  return {
    status: r.status,
    signal: r.signal,
    error: r.error && r.error.code,
    permission: json && json.permission,
    code: json && json.code,
    hasJson: !!json,
    stdout: String(r.stdout || "").slice(0, 200),
    stderr: String(r.stderr || "").slice(0, 200),
  };
}

function opened(r) {
  return r.permission === "allow" && r.status === 0;
}

function failClosedIntervened(r) {
  return !r.hasJson || !r.permission || (r.status !== 0 && r.status !== null);
}

const io = toFileUrl(path.join(ROOT, ".cursor", "hooks", "lib", "hook-io.mjs"));
const pol = toFileUrl(
  path.join(ROOT, ".cursor", "hooks", "lib", "project-boundary-policy.mjs")
);
const missing = toFileUrl(
  path.join(ROOT, ".cursor", "hooks", "lib", "MISSING-policy-module.mjs")
);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hook-sec-"));
const policyThrow = path.join(tmp, "policy-throw.mjs");
fs.writeFileSync(
  policyThrow,
  "import { runBoundaryHook } from " +
    JSON.stringify(io) +
    ";\nrunBoundaryHook(() => { throw new Error('POLICY_EVALUATOR_INJECTED_THROW'); });\n"
);
const internalThrow = path.join(tmp, "internal-throw.mjs");
fs.writeFileSync(
  internalThrow,
  "import { runBoundaryHook } from " +
    JSON.stringify(io) +
    ";\nimport { decideFromPayload } from " +
    JSON.stringify(pol) +
    ";\nrunBoundaryHook((payload) => { decideFromPayload(payload); throw new Error('UNEXPECTED_INTERNAL_HOOK_EXCEPTION'); });\n"
);
const importFail = path.join(tmp, "import-fail.mjs");
fs.writeFileSync(
  importFail,
  "import { runBoundaryHook } from " +
    JSON.stringify(io) +
    ";\nimport { decideFromPayload } from " +
    JSON.stringify(missing) +
    ";\nrunBoundaryHook(decideFromPayload);\n"
);
const uncaught = path.join(tmp, "uncaught.mjs");
fs.writeFileSync(
  uncaught,
  "import { installCrashGuards, readStdinSync } from " +
    JSON.stringify(io) +
    ";\ninstallCrashGuards();\nreadStdinSync();\nsetImmediate(() => { throw new Error('UNCAUGHT_SIM'); });\nsetTimeout(() => {}, 500);\n"
);
const unrej = path.join(tmp, "unhandled-rejection.mjs");
fs.writeFileSync(
  unrej,
  "import { installCrashGuards, readStdinSync } from " +
    JSON.stringify(io) +
    ";\ninstallCrashGuards();\nreadStdinSync();\nPromise.reject(new Error('REJ_SIM'));\nsetTimeout(() => {}, 500);\n"
);

const A = run([REAL_HOOK], local);
const B = run([REAL_HOOK], foreign);
const C = run([REAL_HOOK], "");
const D = run([REAL_HOOK], "not-json{{{");
const E = run([policyThrow], foreign);
const F = run([internalThrow], foreign);
const G = run([uncaught], foreign);
const H = run([unrej], foreign);
const I = run([importFail], foreign);

const cases = {
  A_local: {
    ...A,
    pass: A.status === 0 && A.permission === "allow",
  },
  B_foreign: {
    ...B,
    pass: B.status === 0 && B.permission === "deny",
  },
  C_empty: {
    ...C,
    pass: C.status === 0 && C.permission === "allow",
  },
  D_malformed: {
    ...D,
    pass: D.status === 0 && D.permission === "deny",
  },
  E_policy_throw_foreign: {
    ...E,
    pass: E.status === 0 && E.permission === "deny" && !opened(E),
  },
  F_internal_throw_foreign: {
    ...F,
    pass: F.status === 0 && F.permission === "deny" && !opened(F),
  },
  G_uncaught_foreign: {
    ...G,
    foreign_access_opened: opened(G),
    pass: !opened(G),
  },
  H_unhandled_rejection_foreign: {
    ...H,
    foreign_access_opened: opened(H),
    pass: !opened(H),
  },
  I_import_fail: {
    ...I,
    failClosed_intervened: failClosedIntervened(I),
    SECURITY_EXPECTED_FAILURE: I.status !== 0 || !I.hasJson,
    foreign_access_opened: opened(I),
    pass: !opened(I) && failClosedIntervened(I) && I.permission !== "allow",
  },
};

const FOREIGN_ALLOW_ON_INTERNAL_FAILURE =
  opened(E) || opened(F) || opened(G) || opened(H) || opened(I) ? "YES" : "NO";

const IMPORT_FAILURE = cases.I_import_fail.pass ? "PASS" : "FAIL";
const POLICY_EXCEPTION = cases.E_policy_throw_foreign.pass ? "PASS" : "FAIL";
const INTERNAL_EXCEPTION = cases.F_internal_throw_foreign.pass ? "PASS" : "FAIL";

const baselineOk =
  cases.A_local.pass &&
  cases.B_foreign.pass &&
  cases.C_empty.pass &&
  cases.D_malformed.pass;

const INTERNAL_FAILURE_SECURITY =
  baselineOk &&
  IMPORT_FAILURE === "PASS" &&
  POLICY_EXCEPTION === "PASS" &&
  INTERNAL_EXCEPTION === "PASS" &&
  cases.G_uncaught_foreign.pass &&
  cases.H_unhandled_rejection_foreign.pass &&
  FOREIGN_ALLOW_ON_INTERNAL_FAILURE === "NO"
    ? "PASS"
    : "FAIL";

const report = {
  INTERNAL_FAILURE_SECURITY,
  IMPORT_FAILURE,
  POLICY_EXCEPTION,
  INTERNAL_EXCEPTION,
  FOREIGN_ALLOW_ON_INTERNAL_FAILURE,
  cases,
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(INTERNAL_FAILURE_SECURITY === "PASS" ? 0 : 1);
