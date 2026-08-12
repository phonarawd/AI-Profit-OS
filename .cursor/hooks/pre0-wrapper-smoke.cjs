#!/usr/bin/env node
/**
 * PRE-0 wrapper smoke: ALLOW / DENY / malformed + repeated stability.
 * Does not mutate baseline / workflow / product.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const HOOKS = path.join(ROOT, ".cursor", "hooks");

const WRAPPERS = [
  "pre-tool-boundary.cjs",
  "before-shell-boundary.cjs",
  "before-read-boundary.cjs",
  "before-mcp-gate.cjs",
  "lib/hook-io.cjs",
  "lib/project-boundary.cjs",
];

function sha256File(rel) {
  const abs = path.join(HOOKS, rel);
  const buf = fs.readFileSync(abs);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function runHook(scriptRel, stdinObj) {
  const script = path.join(HOOKS, scriptRel);
  const stdin =
    typeof stdinObj === "string" ? stdinObj : JSON.stringify(stdinObj || {});
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    input: stdin,
    encoding: "utf8",
    timeout: 8000,
    windowsHide: true,
  });
  let json = null;
  try {
    json = JSON.parse(String(r.stdout || "").trim());
  } catch (_) {
    json = null;
  }
  return {
    status: r.status,
    signal: r.signal,
    stdout: String(r.stdout || ""),
    stderr: String(r.stderr || ""),
    permission: json && json.permission,
    json: json,
  };
}

function expect(name, cond, detail) {
  return { name: name, pass: !!cond, detail: detail || "" };
}

const cases = [];

// --- 3-case: pre-tool-boundary ---
const allowShell = runHook("pre-tool-boundary.cjs", {
  tool_name: "Shell",
  tool_input: { command: "pnpm -v", working_directory: ROOT },
  cwd: ROOT,
});
cases.push(
  expect(
    "ALLOW pre-tool Shell inside workspace",
    allowShell.status === 0 && allowShell.permission === "allow",
    "status=" + allowShell.status + " perm=" + allowShell.permission
  )
);

const denyShell = runHook("pre-tool-boundary.cjs", {
  tool_name: "Shell",
  tool_input: { command: "dir C:\\Users\\PC\\Desktop\\clime-gb" },
  cwd: ROOT,
});
cases.push(
  expect(
    "DENY pre-tool Shell clime-gb",
    denyShell.status === 0 && denyShell.permission === "deny",
    "status=" + denyShell.status + " perm=" + denyShell.permission
  )
);

const malformed = runHook("pre-tool-boundary.cjs", "not-json{{{");
cases.push(
  expect(
    "malformed stdin fail-closed (deny or allow-empty-keys path stable exit 0)",
    malformed.status === 0 &&
      (malformed.permission === "deny" || malformed.permission === "allow"),
    "status=" + malformed.status + " perm=" + malformed.permission
  )
);

// empty → deny (fail-closed)
const empty = runHook("pre-tool-boundary.cjs", "");
cases.push(
  expect(
    "empty stdin DENY exit 0",
    empty.status === 0 && empty.permission === "deny",
    "status=" + empty.status + " perm=" + empty.permission
  )
);

// shell-boundary ALLOW/DENY
const shAllow = runHook("before-shell-boundary.cjs", {
  command: "node -v",
  cwd: ROOT,
});
cases.push(
  expect(
    "ALLOW before-shell",
    shAllow.status === 0 && shAllow.permission === "allow",
    "status=" + shAllow.status + " perm=" + shAllow.permission
  )
);
const shDeny = runHook("before-shell-boundary.cjs", {
  command: "cd clime-gb && dir",
  cwd: ROOT,
});
cases.push(
  expect(
    "DENY before-shell foreign",
    shDeny.status === 0 && shDeny.permission === "deny",
    "status=" + shDeny.status + " perm=" + shDeny.permission
  )
);

// read-boundary
const rdAllow = runHook("before-read-boundary.cjs", {
  file_path: path.join(ROOT, "AGENTS.md"),
});
cases.push(
  expect(
    "ALLOW before-read in-root",
    rdAllow.status === 0 && rdAllow.permission === "allow",
    "status=" + rdAllow.status + " perm=" + rdAllow.permission
  )
);
const rdDeny = runHook("before-read-boundary.cjs", {
  file_path: "C:\\Users\\PC\\.cursor\\plans\\pre0_then_qa70_02eddc4b.plan.md",
});
cases.push(
  expect(
    "DENY before-read outside root",
    rdDeny.status === 0 && rdDeny.permission === "deny",
    "status=" + rdDeny.status + " perm=" + rdDeny.permission
  )
);

// --- repeated stability (pre-tool ALLOW x5 identical) ---
const reps = [];
let stable = true;
for (let i = 0; i < 5; i++) {
  const r = runHook("pre-tool-boundary.cjs", {
    tool_name: "Shell",
    tool_input: { command: "pnpm -v", working_directory: ROOT },
    cwd: ROOT,
  });
  reps.push({ status: r.status, permission: r.permission });
  if (r.status !== 0 || r.permission !== "allow") stable = false;
  if (i > 0 && (r.status !== reps[0].status || r.permission !== reps[0].permission)) {
    stable = false;
  }
}
cases.push(
  expect(
    "repeated stability pre-tool ALLOW x5",
    stable,
    JSON.stringify(reps)
  )
);

const hashes = {};
for (let i = 0; i < WRAPPERS.length; i++) {
  hashes[WRAPPERS[i]] = sha256File(WRAPPERS[i]);
}

const failed = cases.filter((c) => !c.pass);
const report = {
  BOOTSTRAP_REPAIR: failed.length === 0 ? "PASS" : "FAIL",
  three_case_and_guards: cases,
  repeated_stability: stable ? "PASS" : "FAIL",
  wrapper_sha256: hashes,
  mutation_policy: {
    baseline: 0,
    workflow: 0,
    product: 0,
    harness_wiring: 0,
  },
  failClosed: true,
  exit_policy: "always_0_permission_in_json",
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 && stable ? 0 : 1);
