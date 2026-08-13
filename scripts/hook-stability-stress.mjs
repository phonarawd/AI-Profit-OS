#!/usr/bin/env node
/**
 * Project-boundary hook stability — conformance + stress (fixture only).
 * Foreign paths/refs are string fixtures inside this file; never open clime-gb.
 *
 * PASS: crash=0 no_output=0 timeout=0 unexpected_nonzero=0
 * Policy DENY with exit 0 is success.
 */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  createPolicy,
  ALLOWED_SUPABASE_REF,
  FOREIGN_SUPABASE_REF,
} from "../.cursor/hooks/lib/project-boundary-policy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const HOOK = path.join(ROOT, ".cursor", "hooks", "project-boundary.mjs");
const HOOK_TIMEOUT_MS = 8000;

const FOREIGN_FS = "C:\\Users\\PC\\Desktop\\clime-gb\\README.md";
const FOREIGN_GH = "phonarawd/clime-gb";
const ALLOWED_GH = "phonarawd/AI-Profit-OS";

const counts = {
  crash: 0,
  no_output: 0,
  timeout: 0,
  unexpected_nonzero: 0,
  allow_ok: 0,
  deny_ok: 0,
  allow_fail: 0,
  deny_fail: 0,
};
const failures = [];

function runHook(stdin) {
  const input =
    typeof stdin === "string" ? stdin : JSON.stringify(stdin ?? {});
  const r = spawnSync(process.execPath, [HOOK], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    timeout: HOOK_TIMEOUT_MS,
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
    error: r.error,
    stdout: String(r.stdout || ""),
    stderr: String(r.stderr || ""),
    permission: json && json.permission,
    code: json && json.code,
    json,
  };
}

function classify(r, expectPerm, label) {
  if (r.error && r.error.code === "ETIMEDOUT") {
    counts.timeout++;
    failures.push({ label, kind: "TIMEOUT" });
    return;
  }
  if (r.signal) {
    counts.crash++;
    failures.push({ label, kind: "CRASH", signal: r.signal });
    return;
  }
  if (r.status !== 0 && r.status !== null) {
    counts.unexpected_nonzero++;
    failures.push({
      label,
      kind: "NONZERO",
      status: r.status,
      perm: r.permission,
    });
    return;
  }
  if (!r.stdout.trim() || !r.json || !r.permission) {
    counts.no_output++;
    failures.push({
      label,
      kind: "NO_OUTPUT",
      stdoutLen: r.stdout.length,
      stderr: r.stderr.slice(0, 120),
    });
    return;
  }
  if (r.permission !== expectPerm) {
    if (expectPerm === "allow") counts.allow_fail++;
    else counts.deny_fail++;
    failures.push({
      label,
      kind: "WRONG_PERMISSION",
      expected: expectPerm,
      got: r.permission,
      code: r.code,
    });
    return;
  }
  if (expectPerm === "allow") counts.allow_ok++;
  else counts.deny_ok++;
}

// --- PHASE 2 conformance ---
const conformance = [
  [
    "ALLOW git status",
    { hook_event_name: "beforeShellExecution", command: "git status", cwd: ROOT },
    "allow",
  ],
  [
    "ALLOW read package.json",
    {
      hook_event_name: "beforeReadFile",
      file_path: path.join(ROOT, "package.json"),
    },
    "allow",
  ],
  [
    "ALLOW Write fixture path",
    {
      hook_event_name: "preToolUse",
      tool_name: "Write",
      tool_input: {
        path: path.join(ROOT, ".cursor", "hooks", "_stability-fixture.tmp"),
        contents: "ok",
      },
    },
    "allow",
  ],
  [
    "ALLOW Glob workspace",
    {
      hook_event_name: "preToolUse",
      tool_name: "Glob",
      tool_input: {
        target_directory: ROOT,
        glob_pattern: "package.json",
      },
    },
    "allow",
  ],
  [
    "ALLOW Grep workspace (pattern may mention foreign marker)",
    {
      hook_event_name: "preToolUse",
      tool_name: "Grep",
      tool_input: {
        path: path.join(ROOT, ".cursor", "hooks"),
        pattern: "clime-gb",
      },
    },
    "allow",
  ],
  [
    "ALLOW GitHub target fixture",
    {
      hook_event_name: "beforeShellExecution",
      command: "gh repo view " + ALLOWED_GH,
      cwd: ROOT,
    },
    "allow",
  ],
  [
    "ALLOW Supabase project fixture",
    {
      hook_event_name: "beforeMCPExecution",
      server: "project-0-AI_PROFIT_OS-supabase",
      tool_name: "list_tables",
      arguments: { project_id: ALLOWED_SUPABASE_REF },
    },
    "allow",
  ],
  [
    "DENY foreign FS fixture",
    { hook_event_name: "beforeReadFile", file_path: FOREIGN_FS },
    "deny",
  ],
  [
    "DENY foreign GitHub fixture",
    {
      hook_event_name: "beforeShellExecution",
      command: "gh repo view " + FOREIGN_GH,
      cwd: ROOT,
    },
    "deny",
  ],
  [
    "DENY foreign Supabase fixture",
    {
      hook_event_name: "beforeMCPExecution",
      server: "project-0-AI_PROFIT_OS-supabase",
      tool_name: "execute_sql",
      arguments: { project_id: FOREIGN_SUPABASE_REF, query: "select 1" },
    },
    "deny",
  ],
  [
    "DENY cwd outside workspace",
    {
      hook_event_name: "beforeShellExecution",
      command: "git status",
      cwd: "C:\\Users\\PC\\Desktop",
    },
    "deny",
  ],
  ["IO empty stdin ALLOW", "", "allow"],
  ["IO non-JSON DENY", "not-json{{{", "deny"],
  [
    "IO UTF-8 BOM ALLOW",
    "\uFEFF" +
      JSON.stringify({
        hook_event_name: "beforeReadFile",
        file_path: path.join(ROOT, "package.json"),
      }),
    "allow",
  ],
];

for (const [label, payload, expect] of conformance) {
  classify(runHook(payload), expect, "conf:" + label);
}

// --- PHASE 3 stress ---
const allowShell = {
  hook_event_name: "beforeShellExecution",
  command: "git status",
  cwd: ROOT,
};
const allowRead = {
  hook_event_name: "beforeReadFile",
  file_path: path.join(ROOT, "package.json"),
};
const allowWrite = {
  hook_event_name: "preToolUse",
  tool_name: "Write",
  tool_input: {
    path: path.join(ROOT, "package.json"),
    contents: "{}",
  },
};
const allowGlob = {
  hook_event_name: "preToolUse",
  tool_name: "Glob",
  tool_input: { target_directory: ROOT, glob_pattern: "*.json" },
};
const allowGrep = {
  hook_event_name: "preToolUse",
  tool_name: "Grep",
  tool_input: { path: ROOT, pattern: "name" },
};
const allowMcp = {
  hook_event_name: "beforeMCPExecution",
  server: "project-0-AI_PROFIT_OS-supabase",
  tool_name: "list_tables",
  arguments: { project_id: ALLOWED_SUPABASE_REF },
};

const denyRead = {
  hook_event_name: "beforeReadFile",
  file_path: FOREIGN_FS,
};
const denyWrite = {
  hook_event_name: "preToolUse",
  tool_name: "Write",
  tool_input: { path: FOREIGN_FS, contents: "x" },
};
const denyShell = {
  hook_event_name: "beforeShellExecution",
  command: "gh repo view " + FOREIGN_GH,
  cwd: ROOT,
};
const denyGlob = {
  hook_event_name: "preToolUse",
  tool_name: "Glob",
  tool_input: {
    target_directory: "C:\\Users\\PC\\Desktop\\clime-gb",
    glob_pattern: "**/*",
  },
};
const denyGrep = {
  hook_event_name: "preToolUse",
  tool_name: "Grep",
  tool_input: {
    path: "C:\\Users\\PC\\Desktop\\clime-gb",
    pattern: "x",
  },
};
const denyMcp = {
  hook_event_name: "beforeMCPExecution",
  server: "project-0-AI_PROFIT_OS-supabase",
  tool_name: "execute_sql",
  arguments: { project_id: FOREIGN_SUPABASE_REF },
};

for (let i = 0; i < 20; i++) {
  classify(runHook(allowShell), "allow", "stress:Shell:ALLOW:" + i);
  classify(runHook(allowRead), "allow", "stress:Read:ALLOW:" + i);
  classify(runHook(allowWrite), "allow", "stress:Write:ALLOW:" + i);
  classify(runHook(allowGlob), "allow", "stress:Glob:ALLOW:" + i);
  classify(runHook(allowGrep), "allow", "stress:Grep:ALLOW:" + i);
  classify(runHook(allowMcp), "allow", "stress:MCP:ALLOW:" + i);
}

for (let i = 0; i < 10; i++) {
  classify(runHook(denyRead), "deny", "stress:Read:DENY:" + i);
  classify(runHook(denyWrite), "deny", "stress:Write:DENY:" + i);
  classify(runHook(denyShell), "deny", "stress:Shell:DENY:" + i);
  classify(runHook(denyGlob), "deny", "stress:Glob:DENY:" + i);
  classify(runHook(denyGrep), "deny", "stress:Grep:DENY:" + i);
  classify(runHook(denyMcp), "deny", "stress:MCP:DENY:" + i);
}

// hooks.json failClosed still true
const hooksJson = JSON.parse(
  fs
    .readFileSync(path.join(ROOT, ".cursor", "hooks.json"), "utf8")
    .replace(/^\uFEFF/, "")
);
const events = [
  "preToolUse",
  "beforeShellExecution",
  "beforeMCPExecution",
  "beforeReadFile",
  "beforeTabFileRead",
];
let failClosedOk = true;
for (const ev of events) {
  const list = (hooksJson.hooks && hooksJson.hooks[ev]) || [];
  const hit = list.some(
    (h) =>
      String(h.command || "").includes("project-boundary.mjs") &&
      h.failClosed === true
  );
  if (!hit) failClosedOk = false;
}
const shellList = (hooksJson.hooks && hooksJson.hooks.beforeShellExecution) || [];
const singleShellHook =
  shellList.length === 1 &&
  !JSON.stringify(hooksJson).includes("before-shell-git-gate");

const policy = createPolicy({ workspaceRoot: ROOT, homeDir: "C:\\Users\\PC" });
const selfGrep = policy.decidePreToolUse({
  tool_name: "Grep",
  tool_input: {
    path: path.join(ROOT, ".cursor", "hooks"),
    pattern: "clime-gb",
  },
});

const HOOK_STABILITY =
  counts.crash === 0 &&
  counts.no_output === 0 &&
  counts.timeout === 0 &&
  counts.unexpected_nonzero === 0 &&
  counts.allow_fail === 0 &&
  counts.deny_fail === 0 &&
  failClosedOk &&
  singleShellHook &&
  selfGrep.permission === "allow"
    ? "PASS"
    : "FAIL";

const report = {
  HOOK_STABILITY,
  FAILCLOSED: failClosedOk,
  SINGLE_SHELL_HOOK: singleShellHook,
  ALLOW_STRESS:
    counts.allow_fail === 0 && counts.allow_ok > 0 ? "PASS" : "FAIL",
  DENY_STRESS: counts.deny_fail === 0 && counts.deny_ok > 0 ? "PASS" : "FAIL",
  HOOK_CRASH_COUNT: counts.crash,
  NO_OUTPUT_COUNT: counts.no_output,
  TIMEOUT_COUNT: counts.timeout,
  UNEXPECTED_NONZERO_EXIT_COUNT: counts.unexpected_nonzero,
  counts,
  self_lock_grep_hooks_dir: selfGrep.permission,
  failures: failures.slice(0, 40),
  failure_total: failures.length,
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(HOOK_STABILITY === "PASS" ? 0 : 1);
