#!/usr/bin/env node
/**
 * Project-boundary hook stability — MINIMAL two-hook architecture.
 * Foreign paths/refs are string fixtures; never open clime-gb.
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

function preTool(toolName, toolInput) {
  return {
    hook_event_name: "preToolUse",
    tool_name: toolName,
    tool_input: toolInput || {},
    cwd: ROOT,
  };
}

const conformance = [
  [
    "ALLOW git status",
    preTool("Shell", { command: "git status", working_directory: ROOT }),
    "allow",
  ],
  [
    "ALLOW read package.json",
    preTool("Read", { path: path.join(ROOT, "package.json") }),
    "allow",
  ],
  [
    "ALLOW Write fixture path",
    preTool("Write", {
      path: path.join(ROOT, ".cursor", "hooks", "_stability-fixture.tmp"),
      contents: "ok",
    }),
    "allow",
  ],
  [
    "ALLOW Glob workspace",
    preTool("Glob", { target_directory: ROOT, glob_pattern: "package.json" }),
    "allow",
  ],
  [
    "ALLOW Grep workspace (pattern may mention foreign marker)",
    preTool("Grep", {
      path: path.join(ROOT, ".cursor", "hooks"),
      pattern: "clime-gb",
    }),
    "allow",
  ],
  [
    "ALLOW GitHub target fixture",
    preTool("Shell", { command: "gh repo view " + ALLOWED_GH, working_directory: ROOT }),
    "allow",
  ],
  [
    "ALLOW Supabase MCP fixture",
    preTool("CallMcpTool", {
      server: "project-0-AI_PROFIT_OS-supabase",
      toolName: "list_tables",
      arguments: { project_id: ALLOWED_SUPABASE_REF },
    }),
    "allow",
  ],
  [
    "ALLOW Tab repo read",
    {
      hook_event_name: "beforeTabFileRead",
      file_path: path.join(ROOT, "package.json"),
    },
    "allow",
  ],
  ["DENY foreign FS fixture", preTool("Read", { path: FOREIGN_FS }), "deny"],
  [
    "DENY foreign GitHub fixture",
    preTool("Shell", { command: "gh repo view " + FOREIGN_GH, working_directory: ROOT }),
    "deny",
  ],
  [
    "DENY foreign Supabase fixture",
    preTool("CallMcpTool", {
      server: "project-0-AI_PROFIT_OS-supabase",
      toolName: "execute_sql",
      arguments: { project_id: FOREIGN_SUPABASE_REF, query: "select 1" },
    }),
    "deny",
  ],
  [
    "DENY cwd outside workspace",
    preTool("Shell", { command: "git status", working_directory: "C:\\Users\\PC\\Desktop" }),
    "deny",
  ],
  [
    "DENY Tab foreign read",
    { hook_event_name: "beforeTabFileRead", file_path: FOREIGN_FS },
    "deny",
  ],
  ["IO empty stdin ALLOW", "", "allow"],
  ["IO non-JSON DENY", "not-json{{{", "deny"],
  [
    "IO UTF-8 BOM ALLOW",
    "\uFEFF" +
      JSON.stringify(preTool("Read", { path: path.join(ROOT, "package.json") })),
    "allow",
  ],
];

for (const [label, payload, expect] of conformance) {
  classify(runHook(payload), expect, "conf:" + label);
}

const allowShell = preTool("Shell", { command: "git status", working_directory: ROOT });
const allowRead = preTool("Read", { path: path.join(ROOT, "package.json") });
const allowWrite = preTool("Write", {
  path: path.join(ROOT, "package.json"),
  contents: "{}",
});
const allowGlob = preTool("Glob", { target_directory: ROOT, glob_pattern: "*.json" });
const allowGrep = preTool("Grep", { path: ROOT, pattern: "name" });
const allowMcp = preTool("CallMcpTool", {
  server: "project-0-AI_PROFIT_OS-supabase",
  toolName: "list_tables",
  arguments: { project_id: ALLOWED_SUPABASE_REF },
});

const denyRead = preTool("Read", { path: FOREIGN_FS });
const denyWrite = preTool("Write", { path: FOREIGN_FS, contents: "x" });
const denyShell = preTool("Shell", {
  command: "gh repo view " + FOREIGN_GH,
  working_directory: ROOT,
});
const denyGlob = preTool("Glob", {
  target_directory: "C:\\Users\\PC\\Desktop\\clime-gb",
  glob_pattern: "**/*",
});
const denyGrep = preTool("Grep", {
  path: "C:\\Users\\PC\\Desktop\\clime-gb",
  pattern: "x",
});
const denyMcp = preTool("CallMcpTool", {
  server: "project-0-AI_PROFIT_OS-supabase",
  toolName: "execute_sql",
  arguments: { project_id: FOREIGN_SUPABASE_REF },
});

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

const hooksJson = JSON.parse(
  fs
    .readFileSync(path.join(ROOT, ".cursor", "hooks.json"), "utf8")
    .replace(/^\uFEFF/, "")
);
const eventNames = Object.keys(hooksJson.hooks || {}).sort();
const minimalOk =
  eventNames.join(",") === "beforeTabFileRead,preToolUse" &&
  (hooksJson.hooks.preToolUse || []).length === 1 &&
  (hooksJson.hooks.beforeTabFileRead || []).length === 1 &&
  !hooksJson.hooks.sessionStart &&
  !hooksJson.hooks.sessionEnd &&
  !hooksJson.hooks.beforeReadFile &&
  !hooksJson.hooks.beforeShellExecution &&
  !hooksJson.hooks.beforeMCPExecution;

let failClosedOk = true;
for (const ev of ["preToolUse", "beforeTabFileRead"]) {
  const list = (hooksJson.hooks && hooksJson.hooks[ev]) || [];
  const hit = list.some(
    (h) =>
      String(h.command || "").includes("project-boundary.mjs") &&
      h.failClosed === true
  );
  if (!hit) failClosedOk = false;
}

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
  minimalOk &&
  selfGrep.permission === "allow"
    ? "PASS"
    : "FAIL";

const report = {
  HOOK_STABILITY,
  FAILCLOSED: failClosedOk,
  MINIMAL_TWO_HOOKS: minimalOk,
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
