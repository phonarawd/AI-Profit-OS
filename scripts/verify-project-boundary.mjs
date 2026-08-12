#!/usr/bin/env node
/**
 * Fixture-only project boundary verify + unit tests.
 * Never opens real clime-gb / global plans contents.
 */
import path from "node:path";
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

const FAKE_HOME = "C:\\Users\\PC";
const policy = createPolicy({
  workspaceRoot: ROOT,
  homeDir: FAKE_HOME,
});

/** @type {{ name: string, pass: boolean, detail?: string }[]} */
const cases = [];

function expect(name, cond, detail) {
  cases.push({ name, pass: !!cond, detail: detail || "" });
}

function runHook(stdin) {
  const input =
    typeof stdin === "string" ? stdin : JSON.stringify(stdin ?? {});
  const r = spawnSync(process.execPath, [HOOK], {
    cwd: ROOT,
    input,
    encoding: "utf8",
    timeout: 8000,
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
    permission: json && json.permission,
    code: json && json.code,
    json,
  };
}

// --- unit: policy decisions (fixture paths only) ---
const localPlan = path.join(ROOT, ".cursor", "plans", "local.plan.md");
const globalPlan = path.join(
  FAKE_HOME,
  ".cursor",
  "plans",
  "mixed_clime_or_other.plan.md"
);
const climeFs = "C:\\Users\\PC\\Desktop\\clime-gb\\README.md";
const repoClimePlan = path.join(
  ROOT,
  ".cursor",
  "plans",
  "clime_foreign.plan.md"
);
const projectCacheOk = path.join(
  policy.allowedProjectCache,
  "agent-transcripts",
  "x.jsonl"
);

expect(
  "ALLOW read repo local.plan.md",
  policy.decideRead({ file_path: localPlan }).permission === "allow"
);
expect(
  "ALLOW read workspace AGENTS.md",
  policy.decideRead({ file_path: path.join(ROOT, "AGENTS.md") })
    .permission === "allow"
);
expect(
  "ALLOW read this project cursor cache",
  policy.decideRead({ file_path: projectCacheOk }).permission === "allow"
);
expect(
  "DENY read global plans",
  policy.decideRead({ file_path: globalPlan }).permission === "deny" &&
    policy.decideRead({ file_path: globalPlan }).code ===
      "GLOBAL_CURSOR_PLANS",
  policy.decideRead({ file_path: globalPlan }).code
);
expect(
  "DENY read clime-gb FS fixture",
  policy.decideRead({ file_path: climeFs }).permission === "deny" &&
    policy.decideRead({ file_path: climeFs }).code === "FOREIGN_FS"
);
expect(
  "DENY repo clime_*.plan.md marker",
  policy.decideRead({ file_path: repoClimePlan }).permission === "deny"
);

expect(
  "DENY shell Get-ChildItem global plans",
  policy.decideShell({
    command:
      "Get-ChildItem $env:USERPROFILE\\.cursor\\plans",
    cwd: ROOT,
  }).permission === "deny" &&
    policy.decideShell({
      command: "Get-ChildItem $env:USERPROFILE\\.cursor\\plans",
      cwd: ROOT,
    }).code === "GLOBAL_CURSOR_PLANS"
);
expect(
  "DENY shell Get-Content global plans",
  policy.decideShell({
    command:
      "Get-Content %USERPROFILE%\\.cursor\\plans\\x.plan.md",
    cwd: ROOT,
  }).permission === "deny"
);
expect(
  "DENY shell gh clime-gb",
  policy.decideShell({
    command: "gh repo view phonarawd/clime-gb",
    cwd: ROOT,
  }).permission === "deny" &&
    policy.decideShell({
      command: "gh repo view phonarawd/clime-gb",
      cwd: ROOT,
    }).code === "FOREIGN_GITHUB"
);
expect(
  "DENY shell supabase foreign ref",
  policy.decideShell({
    command: "supabase link --project-ref " + FOREIGN_SUPABASE_REF,
    cwd: ROOT,
  }).permission === "deny" &&
    policy.decideShell({
      command: "supabase link --project-ref " + FOREIGN_SUPABASE_REF,
      cwd: ROOT,
    }).code === "FOREIGN_SUPABASE"
);
expect(
  "DENY shell supabase projects list",
  policy.decideShell({
    command: "supabase projects list",
    cwd: ROOT,
  }).permission === "deny"
);
expect(
  "DENY shell supabase orgs list",
  policy.decideShell({
    command: "supabase orgs list",
    cwd: ROOT,
  }).permission === "deny"
);
expect(
  "ALLOW shell inside repo",
  policy.decideShell({ command: "pnpm -v", cwd: ROOT }).permission ===
    "allow"
);
expect(
  "ALLOW shell supabase allowed ref",
  policy.decideShell({
    command: "supabase link --project-ref " + ALLOWED_SUPABASE_REF,
    cwd: ROOT,
  }).permission === "allow"
);

expect(
  "DENY Grep global plans path",
  policy.decidePreToolUse({
    tool_name: "Grep",
    tool_input: {
      pattern: "todo",
      path: path.join(FAKE_HOME, ".cursor", "plans"),
    },
  }).permission === "deny"
);
expect(
  "DENY Glob clime-gb path",
  policy.decidePreToolUse({
    tool_name: "Glob",
    tool_input: {
      target_directory: "C:\\Users\\PC\\Desktop\\clime-gb",
      glob_pattern: "**/*",
    },
  }).permission === "deny"
);
expect(
  "DENY MCP foreign supabase",
  policy.decideMcp({
    server: "supabase",
    tool_name: "execute_sql",
    arguments: { project_id: FOREIGN_SUPABASE_REF },
  }).permission === "deny" &&
    policy.decideMcp({
      server: "supabase",
      tool_name: "execute_sql",
      arguments: { project_id: FOREIGN_SUPABASE_REF },
    }).code === "FOREIGN_SUPABASE"
);
expect(
  "DENY MCP list_projects",
  policy.decideMcp({
    server: "plugin-supabase-supabase",
    tool_name: "list_projects",
    arguments: {},
  }).permission === "deny"
);
expect(
  "ALLOW MCP allowed supabase ref",
  policy.decideMcp({
    server: "project-0-AI_PROFIT_OS-supabase",
    tool_name: "list_tables",
    arguments: { project_id: ALLOWED_SUPABASE_REF },
  }).permission === "allow"
);

// --- hook process: empty / malformed → allow, exit 0 ---
const empty = runHook("");
expect(
  "hook empty stdin ALLOW exit 0",
  empty.status === 0 && empty.permission === "allow",
  "status=" + empty.status + " perm=" + empty.permission
);
const malformed = runHook("not-json{{{");
expect(
  "hook non-JSON ALLOW exit 0",
  malformed.status === 0 && malformed.permission === "allow",
  "status=" + malformed.status + " perm=" + malformed.permission
);

const hookDenyGlobal = runHook({
  hook_event_name: "beforeReadFile",
  file_path: globalPlan,
});
expect(
  "hook DENY global plans read",
  hookDenyGlobal.status === 0 &&
    hookDenyGlobal.permission === "deny" &&
    hookDenyGlobal.code === "GLOBAL_CURSOR_PLANS"
);

const hookDenyClime = runHook({
  hook_event_name: "beforeShellExecution",
  command: "dir C:\\Users\\PC\\Desktop\\clime-gb",
  cwd: ROOT,
});
expect(
  "hook DENY clime shell",
  hookDenyClime.status === 0 && hookDenyClime.permission === "deny"
);

const hookAllowLocal = runHook({
  hook_event_name: "beforeReadFile",
  file_path: localPlan,
});
expect(
  "hook ALLOW repo local.plan.md",
  hookAllowLocal.status === 0 && hookAllowLocal.permission === "allow"
);

const hookDenyGh = runHook({
  tool_name: "Shell",
  tool_input: { command: "gh repo view phonarawd/clime-gb" },
  cwd: ROOT,
});
expect(
  "hook DENY gh clime-gb (preTool)",
  hookDenyGh.status === 0 && hookDenyGh.permission === "deny"
);

// --- hooks.json wiring check ---
import fs from "node:fs";
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
for (const ev of events) {
  const list = (hooksJson.hooks && hooksJson.hooks[ev]) || [];
  const hit = list.some(
    (h) =>
      String(h.command || "").includes("project-boundary.mjs") &&
      h.failClosed === true
  );
  expect("hooks.json " + ev + " → project-boundary.mjs failClosed", hit);
}

const failed = cases.filter((c) => !c.pass);
const unitTotal = cases.length;
const unitPass = cases.filter((c) => c.pass).length;

const report = {
  VERIFY: failed.length === 0 ? "PASS" : "FAIL",
  unit: unitPass + "/" + unitTotal,
  global_plans_DENY: cases.some(
    (c) => c.name.includes("global plans") && c.pass
  )
    ? "yes"
    : "no",
  clime_FS_GitHub_Supabase_DENY: cases.filter(
    (c) =>
      (c.name.includes("clime") ||
        c.name.includes("foreign") ||
        c.name.includes("gh clime")) &&
      c.pass
  ).length
    ? "yes"
    : "no",
  cases,
  failed: failed.map((c) => c.name + (c.detail ? " :: " + c.detail : "")),
  residual_WARNs: [
    "account-wide gh/supabase CLI may still exist — foreign targets DENY via hook only",
    "Desktop multi-root adding clime folder is a user/IDE residual risk (not fully hook-enforceable)",
  ],
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 ? 0 : 1);
