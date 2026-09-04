#!/usr/bin/env node
/**
 * Fixture-only project boundary verify — MINIMAL two-hook architecture.
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
const HOOKS_JSON_PATH = path.join(ROOT, ".cursor", "hooks.json");

const FAKE_HOME = "C:\\Users\\PC";
const policy = createPolicy({
  workspaceRoot: ROOT,
  homeDir: FAKE_HOME,
});

/** @type {{ name: string, pass: boolean, detail?: string }[]} */
const cases = [];

function expect(name, cond, detail) {
  cases.push({ name: name, pass: !!cond, detail: detail || "" });
}

function runHook(stdin) {
  const input =
    typeof stdin === "string" ? stdin : JSON.stringify(stdin ?? {});
  const started = Date.now();
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
    ms: Date.now() - started,
  };
}

function preTool(toolName, toolInput, extra) {
  return {
    hook_event_name: "preToolUse",
    tool_name: toolName,
    tool_input: toolInput || {},
    cwd: ROOT,
    ...(extra || {}),
  };
}

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
const cacheTerminals = path.join(
  policy.allowedProjectCache,
  "terminals",
  "3.txt"
);

// --- 1–6 ALLOW ---
expect(
  "1 normal repo Read ALLOW",
  policy.decidePreToolUse(preTool("Read", { path: path.join(ROOT, "AGENTS.md") }))
    .permission === "allow"
);
expect(
  "2 normal repo Write ALLOW",
  policy.decidePreToolUse(
    preTool("Write", {
      path: path.join(ROOT, ".cursor", "hooks", "_min-wave-fixture.tmp"),
      contents: "ok",
    })
  ).permission === "allow"
);
expect(
  "3 normal repo Grep ALLOW",
  policy.decidePreToolUse(
    preTool("Grep", { path: path.join(ROOT, ".cursor", "hooks"), pattern: "clime-gb" })
  ).permission === "allow"
);
expect(
  "4 normal Shell ALLOW",
  policy.decidePreToolUse(
    preTool("Shell", { command: "pnpm -v", working_directory: ROOT })
  ).permission === "allow"
);
expect(
  "5 normal MCP ALLOW",
  policy.decidePreToolUse(
    preTool("CallMcpTool", {
      server: "project-0-AI_PROFIT_OS-supabase",
      toolName: "list_tables",
      arguments: { project_id: ALLOWED_SUPABASE_REF },
    })
  ).permission === "allow"
);
expect(
  "6 AI_PROFIT_OS Cursor cache ALLOW",
  policy.decideRead({ file_path: projectCacheOk }).permission === "allow"
);

// --- 7–12 DENY isolation ---
expect(
  "7 clime-gb Read fixture DENY",
  policy.decidePreToolUse(preTool("Read", { path: climeFs })).permission ===
    "deny" &&
    policy.decidePreToolUse(preTool("Read", { path: climeFs })).code ===
      "FOREIGN_FS"
);
expect(
  "8 clime-gb Write fixture DENY",
  policy.decidePreToolUse(preTool("Write", { path: climeFs, contents: "x" }))
    .permission === "deny"
);
expect(
  "9 clime-gb Grep fixture DENY",
  policy.decidePreToolUse(
    preTool("Grep", { path: "C:\\Users\\PC\\Desktop\\clime-gb", pattern: "x" })
  ).permission === "deny"
);
expect(
  "10 clime-gb Shell path fixture DENY",
  policy.decidePreToolUse(
    preTool("Shell", { command: "dir C:\\Users\\PC\\Desktop\\clime-gb", working_directory: ROOT })
  ).permission === "deny"
);
const climeCache = path.join(
  FAKE_HOME,
  ".cursor",
  "projects",
  "c-Users-PC-Desktop-clime-gb",
  "terminals",
  "1.txt"
);
expect(
  "11 clime-gb Cursor cache fixture DENY",
  policy.decideRead({ file_path: climeCache }).permission === "deny"
);
expect(
  "12 foreign project fixture DENY",
  policy.decideRead({
    file_path: "C:\\Users\\PC\\Desktop\\SomeOtherProject\\README.md",
  }).permission === "deny"
);

{
  const posixPolicy = createPolicy({
    workspaceRoot: "/home/runner/work/AI-Profit-OS/AI-Profit-OS",
    homeDir: "C:\\Users\\PC",
  });
  expect(
    "12b POSIX workspace must DENY Windows Desktop foreign path",
    posixPolicy.decideRead({
      file_path: "C:\\Users\\PC\\Desktop\\SomeOtherProject\\README.md",
    }).permission === "deny"
  );
  expect(
    "12c POSIX workspace must DENY unrelated Windows Cursor cache",
    posixPolicy.decideRead({
      file_path:
        "C:\\Users\\PC\\.cursor\\projects\\c-Users-PC-Desktop-OtherApp\\terminals\\1.txt",
    }).permission === "deny"
  );
}

// --- 13–14 shell unique policies ---
expect(
  "13 --no-verify Shell DENY",
  policy.decidePreToolUse(
    preTool("Shell", {
      command: "git commit --no-verify -m fixture",
      working_directory: ROOT,
    })
  ).permission === "deny"
);
expect(
  "14 protected secret-staging DENY",
  policy.decidePreToolUse(
    preTool("Shell", { command: "git add .env", working_directory: ROOT })
  ).permission === "deny"
);

// --- extra isolation (kept, still live policy) ---
expect(
  "ALLOW read repo local.plan.md",
  policy.decideRead({ file_path: localPlan }).permission === "allow"
);
expect(
  "DENY read global plans",
  policy.decideRead({ file_path: globalPlan }).permission === "deny" &&
    policy.decideRead({ file_path: globalPlan }).code === "GLOBAL_CURSOR_PLANS"
);
expect(
  "DENY repo clime_*.plan.md marker",
  policy.decideRead({ file_path: repoClimePlan }).permission === "deny"
);
expect(
  "DENY shell gh clime-gb",
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
  }).code === "FOREIGN_SUPABASE"
);
expect(
  "DENY Glob clime-gb path",
  policy.decidePreToolUse(
    preTool("Glob", {
      target_directory: "C:\\Users\\PC\\Desktop\\clime-gb",
      glob_pattern: "**/*",
    })
  ).permission === "deny"
);
expect(
  "DENY Delete clime-gb path",
  policy.decidePreToolUse(preTool("Delete", { path: climeFs })).permission ===
    "deny"
);
expect(
  "DENY MCP native prefix foreign supabase",
  policy.decidePreToolUse(
    preTool("MCP:execute_sql", {
      project_id: FOREIGN_SUPABASE_REF,
      query: "select 1",
    })
  ).permission === "deny"
);
expect(
  "DENY MCP CallMcpTool account-wide list_projects",
  policy.decidePreToolUse(
    preTool("CallMcpTool", {
      server: "plugin-supabase-supabase",
      toolName: "list_projects",
      arguments: {},
    })
  ).permission === "deny"
);
expect(
  "DENY MCP list_projects without server (preTool-only)",
  policy.decidePreToolUse(preTool("MCP:list_projects", {})).permission ===
    "deny"
);
expect(
  "ALLOW git commit message mentioning --no-verify",
  policy.decideShell({
    command: 'git commit -m "docs --no-verify"',
    cwd: ROOT,
  }).permission === "allow"
);
expect(
  "ALLOW this project terminals (AwaitShell)",
  policy.decideRead({ file_path: cacheTerminals }).permission === "allow"
);
expect(
  "DENY unrelated Cursor project cache",
  policy.decideRead({
    file_path: path.join(
      FAKE_HOME,
      ".cursor",
      "projects",
      "c-Users-PC-Desktop-OtherApp",
      "terminals",
      "1.txt"
    ),
  }).permission === "deny"
);

const rootSlug = cursorProjectSlug(ROOT);
expect("slug has no underscore", !/_/.test(rootSlug), rootSlug);
if (process.platform === "win32") {
  expect(
    "win32 AI_PROFIT_OS → c-Users-PC-Desktop-AI-PROFIT-OS",
    cursorProjectSlug("C:\\Users\\PC\\Desktop\\AI_PROFIT_OS") ===
      "c-Users-PC-Desktop-AI-PROFIT-OS"
  );
}
expect("slug list includes full + basename", cursorProjectSlugs(ROOT).length >= 1);

// --- 15–17 parser ---
expect("15 valid full JSON parse", parsePayloadResult('{"a":1}').ok === true);
expect(
  "16 parse Windows path payload",
  parsePayloadResult(
    '{"file_path":"C:\\\\Users\\\\PC\\\\Desktop\\\\AI_PROFIT_OS\\\\x.txt"}'
  ).ok === true
);
expect(
  "17 malformed/truncated settled JSON not ok",
  parsePayloadResult('{"hook_event_name":"preToolUse","tool_name":"Read","tool_input":{"path":"C:').ok ===
    false &&
    parsePayloadResult(
      '{"hook_event_name":"preToolUse","tool_name":"Read","tool_input":{"path":"C:'
    ).empty === false
);
expect("parse empty stdin", parsePayloadResult("").empty === true);
expect("settled object helper", looksSettledJsonObject('{"a":1}') === true);
expect(
  "truncated helper",
  looksTruncatedJson('{"hook_event_name":"preToolUse"') === true
);

const empty = runHook("");
expect(
  "hook empty stdin ALLOW exit 0",
  empty.status === 0 && empty.permission === "allow",
  "status=" + empty.status + " perm=" + empty.permission
);
const malformed = runHook("not-json{{{");
expect(
  "hook non-JSON DENY exit 0",
  malformed.status === 0 && malformed.permission === "deny"
);
const hookTruncated = runHook(
  '{"hook_event_name":"preToolUse","tool_name":"Read","tool_input":{"path":"C:\\\\Users'
);
expect(
  "17b hook truncated JSON DENY",
  hookTruncated.status === 0 && hookTruncated.permission === "deny",
  "perm=" + hookTruncated.permission
);

// --- hook process: required live shapes ---
const hookRead = runHook(preTool("Read", { path: path.join(ROOT, "package.json") }));
expect(
  "hook 1 Read ALLOW",
  hookRead.status === 0 && hookRead.permission === "allow"
);
const hookWrite = runHook(
  preTool("Write", {
    path: path.join(ROOT, ".cursor", "hooks", "_min-wave-fixture.tmp"),
    contents: "ok",
  })
);
expect(
  "hook 2 Write ALLOW",
  hookWrite.status === 0 && hookWrite.permission === "allow"
);
const hookGrep = runHook(
  preTool("Grep", { path: ROOT, pattern: "name" })
);
expect(
  "hook 3 Grep ALLOW",
  hookGrep.status === 0 && hookGrep.permission === "allow"
);
const hookShell = runHook(
  preTool("Shell", { command: "git status --short", working_directory: ROOT })
);
expect(
  "hook 4 Shell ALLOW",
  hookShell.status === 0 && hookShell.permission === "allow"
);
const hookMcp = runHook(
  preTool("CallMcpTool", {
    server: "project-0-AI_PROFIT_OS-supabase",
    toolName: "list_tables",
    arguments: { project_id: ALLOWED_SUPABASE_REF },
  })
);
expect(
  "hook 5 MCP ALLOW",
  hookMcp.status === 0 && hookMcp.permission === "allow"
);
const livePolicy = createPolicy({ workspaceRoot: ROOT });
const liveCacheTerminals = path.join(
  livePolicy.allowedProjectCache,
  "terminals",
  "3.txt"
);
const hookCache = runHook(preTool("Read", { path: liveCacheTerminals }));
expect(
  "hook 6 cache Read ALLOW",
  hookCache.status === 0 && hookCache.permission === "allow",
  "perm=" + hookCache.permission + " code=" + hookCache.code
);
const hookDenyRead = runHook(preTool("Read", { path: climeFs }));
expect(
  "hook 7 clime Read DENY",
  hookDenyRead.status === 0 && hookDenyRead.permission === "deny"
);
const hookTabDeny = runHook({
  hook_event_name: "beforeTabFileRead",
  file_path: climeFs,
});
expect(
  "18 Tab foreign-file read DENY",
  hookTabDeny.status === 0 && hookTabDeny.permission === "deny"
);
const hookTabAllow = runHook({
  hook_event_name: "beforeTabFileRead",
  file_path: path.join(ROOT, "package.json"),
});
expect(
  "19 Tab AI_PROFIT_OS read ALLOW",
  hookTabAllow.status === 0 && hookTabAllow.permission === "allow"
);

// --- 20–25 architecture ---
const hooksJson = JSON.parse(
  fs.readFileSync(HOOKS_JSON_PATH, "utf8").replace(/^\uFEFF/, "")
);
const eventNames = Object.keys(hooksJson.hooks || {}).sort();
expect(
  "20 no duplicate Agent Read (beforeReadFile absent)",
  !hooksJson.hooks.beforeReadFile &&
    Array.isArray(hooksJson.hooks.preToolUse) &&
    hooksJson.hooks.preToolUse.length === 1
);
expect(
  "21 no duplicate Shell (beforeShellExecution absent)",
  !hooksJson.hooks.beforeShellExecution &&
    hooksJson.hooks.preToolUse.length === 1
);
expect(
  "22 no duplicate MCP (beforeMCPExecution absent)",
  !hooksJson.hooks.beforeMCPExecution &&
    hooksJson.hooks.preToolUse.length === 1
);
expect("23 sessionStart hook count = 0", !hooksJson.hooks.sessionStart);
expect("24 sessionEnd hook count = 0", !hooksJson.hooks.sessionEnd);
expect(
  "events exactly preToolUse + beforeTabFileRead",
  eventNames.join(",") === "beforeTabFileRead,preToolUse",
  eventNames.join(",")
);
expect("stop event removed", !hooksJson.hooks.stop);

const preToolHook = (hooksJson.hooks.preToolUse || [])[0] || {};
const tabHook = (hooksJson.hooks.beforeTabFileRead || [])[0] || {};
expect(
  "preToolUse failClosed + project-boundary.mjs",
  String(preToolHook.command || "").includes("project-boundary.mjs") &&
    preToolHook.failClosed === true
);
expect(
  "beforeTabFileRead failClosed + project-boundary.mjs",
  String(tabHook.command || "").includes("project-boundary.mjs") &&
    tabHook.failClosed === true &&
    (hooksJson.hooks.beforeTabFileRead || []).length === 1
);

const matcher = String(preToolHook.matcher || "");
let matcherRe = null;
try {
  matcherRe = new RegExp(matcher);
} catch {
  matcherRe = null;
}
expect("preToolUse matcher present", !!matcher && !!matcherRe, matcher);
const mustMatch = [
  "Shell",
  "Read",
  "Write",
  "Grep",
  "Glob",
  "Delete",
  "StrReplace",
  "EditNotebook",
  "WebFetch",
  "FetchMcpResource",
  "CallMcpTool",
  "CallDynamicTool",
  "MCP:list_tables",
  "MCP:execute_sql",
];
const mustMiss = [
  "TodoWrite",
  "AwaitShell",
  "WebSearch",
  "SwitchMode",
  "AskQuestion",
  "GetMcpTools",
];
for (const t of mustMatch) {
  expect("matcher hits " + t, !!(matcherRe && matcherRe.test(t)));
}
for (const t of mustMiss) {
  expect("matcher misses " + t, !!(matcherRe && !matcherRe.test(t)));
}

const wiredScripts = [];
for (const ev of Object.keys(hooksJson.hooks || {})) {
  for (const h of hooksJson.hooks[ev] || []) {
    const m = String(h.command || "").match(/node\s+(\S+)/);
    if (m) wiredScripts.push(m[1]);
  }
}
expect("25 hooks.json references no missing scripts", wiredScripts.length > 0);
for (const rel of wiredScripts) {
  const abs = path.join(ROOT, rel.replace(/[\\/]/g, path.sep));
  expect("hooks.json script exists " + rel, fs.existsSync(abs), abs);
}

const dead = [
  "session-start.cjs",
  "stop-cleanup.cjs",
  "pre-tool-boundary.cjs",
  "before-shell-boundary.cjs",
  "before-read-boundary.cjs",
  "before-mcp-gate.cjs",
  "lib/project-boundary.cjs",
  "pre0-wrapper-smoke.cjs",
];
for (const rel of dead) {
  expect(
    "dead hook file removed " + rel,
    !fs.existsSync(path.join(ROOT, ".cursor", "hooks", rel))
  );
}

const liveScripts = [
  "project-boundary.mjs",
  "lib/hook-io.cjs",
  "lib/hook-io.mjs",
  "lib/project-boundary-policy.mjs",
  "lib/night-guard-policy.mjs",
];
for (const rel of liveScripts) {
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
expect(
  "git-gate not wired",
  !JSON.stringify(hooksJson).includes("before-shell-git-gate")
);

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

const chunked = await runHookChunked(
  preTool("Read", { path: path.join(ROOT, "package.json") })
);
expect(
  "16 chunked valid JSON ALLOW",
  chunked.status === 0 && chunked.permission === "allow",
  "status=" + chunked.status + " perm=" + chunked.permission
);

const tPolicy = Date.now();
policy.decideRead({ file_path: path.join(ROOT, "package.json") });
expect("low-cost policy decideRead", Date.now() - tPolicy < 50);

const latencies = {
  Read: hookRead.ms,
  Write: hookWrite.ms,
  Grep: hookGrep.ms,
  Shell: hookShell.ms,
  MCP: hookMcp.ms,
  Tab: hookTabAllow.ms,
};

const failed = cases.filter((c) => !c.pass);
const unitTotal = cases.length;
const unitPass = cases.filter((c) => c.pass).length;

const report = {
  VERIFY: failed.length === 0 ? "PASS" : "FAIL",
  unit: unitPass + "/" + unitTotal,
  HOOK_EVENTS: eventNames,
  HOOK_PROCESS_COUNT: {
    Read: 1,
    Write: 1,
    Grep: 1,
    Shell: 1,
    MCP: 1,
    Tab: 1,
    sessionStart: 0,
    sessionEnd: 0,
  },
  NORMAL_HOOK_LATENCY_MS: latencies,
  MATCHER: matcher,
  residual_WARNs: [
    "Desktop multi-root adding clime folder is a USER-CONFIGURATION residual (not hook-enforceable without workspace watchers)",
    "Tab beforeTabFileRead still receives file content — large Tab reads may hit malformed-input DENY (isolation kept)",
  ],
  cases,
  failed: failed.map((c) => c.name + (c.detail ? " :: " + c.detail : "")),
};

process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 ? 0 : 1);
