#!/usr/bin/env node
/**
 * Fixture-only project boundary verify + unit tests.
 * Never opens real clime-gb / global plans contents.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import {
  createPolicy,
  cursorProjectSlug,
  cursorProjectSlugs,
  ALLOWED_SUPABASE_REF,
  FOREIGN_SUPABASE_REF,
} from "../.cursor/hooks/lib/project-boundary-policy.mjs";
import {
  parsePayloadResult,
  looksSettledJsonObject,
  looksTruncatedJson,
} from "../.cursor/hooks/lib/hook-io.mjs";

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
  "ALLOW Grep hooks dir with foreign marker pattern (self-lock)",
  policy.decidePreToolUse({
    tool_name: "Grep",
    tool_input: {
      pattern: "clime-gb",
      path: path.join(ROOT, ".cursor", "hooks"),
    },
  }).permission === "allow"
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

// --- hook process: empty → allow; non-empty malformed → deny; exit 0 ---
const empty = runHook("");
expect(
  "hook empty stdin ALLOW exit 0",
  empty.status === 0 && empty.permission === "allow",
  "status=" + empty.status + " perm=" + empty.permission
);
const malformed = runHook("not-json{{{");
expect(
  "hook non-JSON DENY exit 0",
  malformed.status === 0 && malformed.permission === "deny",
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

// --- slug + this-project Cursor cache (AwaitShell / terminals / transcripts) ---
const rootSlug = cursorProjectSlug(ROOT);
expect("slug has no underscore", !/_/.test(rootSlug), rootSlug);
expect("slug has no colon", !/:/.test(rootSlug), rootSlug);
expect(
  "slug list includes full + basename",
  cursorProjectSlugs(ROOT).length >= 1
);
if (process.platform === "win32") {
  expect(
    "win32 AI_PROFIT_OS → c-Users-PC-Desktop-AI-PROFIT-OS",
    cursorProjectSlug("C:\\Users\\PC\\Desktop\\AI_PROFIT_OS") ===
      "c-Users-PC-Desktop-AI-PROFIT-OS"
  );
}

const cacheTerminals = path.join(
  policy.allowedProjectCache,
  "terminals",
  "3.txt"
);
expect(
  "ALLOW this project terminals (AwaitShell)",
  policy.decideRead({ file_path: cacheTerminals }).permission === "allow"
);
expect(
  "ALLOW shell cwd this project terminals",
  policy.decideShell({
    command: "git status --short",
    cwd: path.join(policy.allowedProjectCache, "terminals"),
  }).permission === "allow"
);
for (const slug of policy.projectSlugs) {
  const pth = path.join(
    FAKE_HOME,
    ".cursor",
    "projects",
    slug,
    "agent-transcripts",
    "x.jsonl"
  );
  expect(
    "ALLOW cache slug " + slug,
    policy.decideRead({ file_path: pth }).permission === "allow",
    pth
  );
}

const climeCache = path.join(
  FAKE_HOME,
  ".cursor",
  "projects",
  "c-Users-PC-Desktop-clime-gb",
  "terminals",
  "1.txt"
);
expect(
  "DENY clime-gb Cursor cache",
  policy.decideRead({ file_path: climeCache }).permission === "deny"
);
const otherCache = path.join(
  FAKE_HOME,
  ".cursor",
  "projects",
  "c-Users-PC-Desktop-OtherApp",
  "terminals",
  "1.txt"
);
expect(
  "DENY unrelated Cursor project cache",
  policy.decideRead({ file_path: otherCache }).permission === "deny"
);
expect(
  "DENY unrelated filesystem project",
  policy.decideRead({
    file_path: "C:\\Users\\PC\\Desktop\\SomeOtherProject\\README.md",
  }).permission === "deny"
);
expect(
  "ALLOW repo subdirectory",
  policy.decideRead({
    file_path: path.join(ROOT, ".cursor", "hooks", "project-boundary.mjs"),
  }).permission === "allow"
);

expect(
  "DENY git commit --no-verify",
  policy.decideShell({
    command: "git commit --no-verify -m fixture",
    cwd: ROOT,
  }).permission === "deny"
);
expect(
  "ALLOW git commit message mentioning --no-verify",
  policy.decideShell({
    command: 'git commit -m "docs --no-verify"',
    cwd: ROOT,
  }).permission === "allow"
);
expect(
  "DENY git add .env",
  policy.decideShell({ command: "git add .env", cwd: ROOT }).permission ===
    "deny"
);

const tPolicy = Date.now();
policy.decideRead({ file_path: path.join(ROOT, "package.json") });
expect("low-cost policy decideRead", Date.now() - tPolicy < 50);

// --- parser (no spawn) ---
expect("parse valid full JSON", parsePayloadResult('{"a":1}').ok === true);
expect("parse empty stdin", parsePayloadResult("").empty === true);
expect("parse whitespace-only", parsePayloadResult("  \n\t  ").empty === true);
expect(
  "parse truncated JSON",
  parsePayloadResult('{"hook_event_name":"beforeReadFile","file_path":"C:').ok ===
    false &&
    parsePayloadResult('{"hook_event_name":"beforeReadFile","file_path":"C:')
      .empty === false
);
expect(
  "parse malformed JSON",
  parsePayloadResult("not-json{{{").ok === false &&
    parsePayloadResult("not-json{{{").empty === false
);
expect(
  "parse Windows path payload",
  parsePayloadResult(
    '{"file_path":"C:\\\\Users\\\\PC\\\\Desktop\\\\AI_PROFIT_OS\\\\x.txt"}'
  ).ok === true
);
expect(
  "parse escaped characters",
  parsePayloadResult('{"x":"a\\"b\\\\c"}').ok === true
);
expect("settled object helper", looksSettledJsonObject('{"a":1}') === true);
expect(
  "truncated helper",
  looksTruncatedJson('{"hook_event_name":"beforeReadFile"') === true
);

const hookWhitespace = runHook("   \n\t  ");
expect(
  "hook whitespace-only ALLOW",
  hookWhitespace.status === 0 && hookWhitespace.permission === "allow"
);
const hookTruncated = runHook(
  '{"hook_event_name":"beforeReadFile","file_path":"C:\\\\Users'
);
expect(
  "hook truncated JSON DENY",
  hookTruncated.status === 0 && hookTruncated.permission === "deny",
  "perm=" + hookTruncated.permission
);
const hookWinPath = runHook({
  hook_event_name: "beforeReadFile",
  file_path: path.join(ROOT, "package.json"),
});
expect(
  "hook representative beforeReadFile ALLOW",
  hookWinPath.status === 0 && hookWinPath.permission === "allow"
);
const hookShell = runHook({
  hook_event_name: "beforeShellExecution",
  command: "git status --short",
  cwd: ROOT,
});
expect(
  "hook representative beforeShellExecution ALLOW",
  hookShell.status === 0 && hookShell.permission === "allow"
);
const hookAwait = runHook({
  hook_event_name: "beforeReadFile",
  file_path: cacheTerminals,
});
expect(
  "hook AwaitShell terminals path ALLOW",
  hookAwait.status === 0 && hookAwait.permission === "allow",
  "perm=" + hookAwait.permission + " code=" + hookAwait.code
);

// --- hooks.json wiring check ---
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
const shellList = (hooksJson.hooks && hooksJson.hooks.beforeShellExecution) || [];
expect(
  "beforeShellExecution single process",
  shellList.length === 1,
  "count=" + shellList.length
);
expect(
  "git-gate not wired",
  !JSON.stringify(hooksJson).includes("before-shell-git-gate")
);
expect("stop event removed", !hooksJson.hooks.stop);
expect(
  "sessionEnd retained",
  Array.isArray(hooksJson.hooks.sessionEnd) &&
    hooksJson.hooks.sessionEnd.length === 1
);
expect(
  "sessionStart retained",
  Array.isArray(hooksJson.hooks.sessionStart)
);

const wiredScripts = [];
for (const ev of Object.keys(hooksJson.hooks || {})) {
  for (const h of hooksJson.hooks[ev] || []) {
    const m = String(h.command || "").match(/node\s+(\S+)/);
    if (m) wiredScripts.push(m[1]);
  }
}
for (const rel of wiredScripts) {
  const abs = path.join(ROOT, rel.replace(/[\\/]/g, path.sep));
  expect("hooks.json script exists " + rel, fs.existsSync(abs), abs);
}

const syntaxTargets = [
  "project-boundary.mjs",
  "session-start.cjs",
  "stop-cleanup.cjs",
  "lib/hook-io.cjs",
  "lib/hook-io.mjs",
  "lib/project-boundary-policy.mjs",
];
for (const rel of syntaxTargets) {
  const abs = path.join(ROOT, ".cursor", "hooks", rel);
  const r = spawnSync(process.execPath, ["--check", abs], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 8000,
    windowsHide: true,
  });
  expect(
    "syntax " + rel,
    r.status === 0,
    String(r.stderr || r.stdout || "").slice(0, 200)
  );
}

const preCommit = fs.existsSync(path.join(ROOT, ".husky", "pre-commit"))
  ? fs.readFileSync(path.join(ROOT, ".husky", "pre-commit"), "utf8")
  : "";
const prePush = fs.existsSync(path.join(ROOT, ".husky", "pre-push"))
  ? fs.readFileSync(path.join(ROOT, ".husky", "pre-push"), "utf8")
  : "";
expect("husky pre-commit verify:gate:fast", /verify:gate:fast/.test(preCommit));
expect("husky pre-push verify:gate:push", /verify:gate:push/.test(prePush));

function runHookChunked(payload, delayMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [HOOK], {
      cwd: ROOT,
      windowsHide: true,
    });
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    const json = JSON.stringify(payload);
    const split = Math.max(24, Math.floor(json.length / 2));
    child.stdin.write(json.slice(0, split));
    setTimeout(() => {
      child.stdin.write(json.slice(split));
      child.stdin.end();
    }, delayMs || 80);
    const timer = setTimeout(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      reject(new Error("chunked hook timeout"));
    }, 8000);
    child.on("close", (status) => {
      clearTimeout(timer);
      let parsed = null;
      try {
        parsed = JSON.parse(String(stdout || "").trim());
      } catch {
        parsed = null;
      }
      resolve({
        status,
        permission: parsed && parsed.permission,
      });
    });
  });
}

const chunked = await runHookChunked({
  hook_event_name: "beforeReadFile",
  file_path: path.join(ROOT, "package.json"),
});
expect(
  "chunked valid JSON ALLOW",
  chunked.status === 0 && chunked.permission === "allow",
  "status=" + chunked.status + " perm=" + chunked.permission
);

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
