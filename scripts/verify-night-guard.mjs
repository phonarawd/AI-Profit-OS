#!/usr/bin/env node
/**
 * Night Guard selftest — mocked tool_input fixtures only.
 * 실제 Production 변이를 실행해 DENY를 증명하지 않는다.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import {
  decideNightGuard,
  isReadOnlySql,
  CODES,
  PRODUCTION_SUPABASE_REF,
  validateFounderAuth,
  FOUNDER_AUTH_SCHEMA,
} from "../.cursor/hooks/lib/night-guard-policy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const HOOK = path.join(ROOT, ".cursor", "hooks", "project-boundary.mjs");

/** @type {{ name: string, pass: boolean, detail?: string }[]} */
const cases = [];

function expect(name, cond, detail) {
  cases.push({ name, pass: !!cond, detail: detail || "" });
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

function shell(command) {
  return preTool("Shell", { command, working_directory: ROOT });
}

function mcp(toolName, args, extra) {
  return preTool(
    "CallDynamicTool",
    {
      namespace: "project-0-AI_PROFIT_OS-supabase",
      toolName,
      arguments: args || {},
    },
    extra
  );
}

function expectDeny(name, payload, code) {
  const r = decideNightGuard(payload);
  expect(
    name,
    r.permission === "deny" && (!code || r.code === code),
    "perm=" + r.permission + " code=" + r.code
  );
}

function expectAllow(name, payload) {
  const r = decideNightGuard(payload);
  expect(name, r.permission === "allow", "perm=" + r.permission + " code=" + r.code);
}

function runHook(stdin) {
  const input = typeof stdin === "string" ? stdin : JSON.stringify(stdin ?? {});
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

// --- SQL classifier ---
expect("SQL allow SELECT", isReadOnlySql("SELECT 1"));
expect("SQL allow WITH SELECT", isReadOnlySql("WITH x AS (SELECT 1) SELECT * FROM x"));
expect("SQL block INSERT", !isReadOnlySql("INSERT INTO t VALUES (1)"));
expect("SQL block missing", !isReadOnlySql(""));
expect("SQL comment INSERT is still SELECT", isReadOnlySql("SELECT 1 -- INSERT INTO t"));

// --- ALLOW: read-only Production forensic ---
expectAllow(
  "ALLOW list_tables on production ref",
  mcp("list_tables", { project_id: PRODUCTION_SUPABASE_REF })
);
expectAllow(
  "ALLOW execute_sql SELECT on production ref",
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "select tablename from pg_tables limit 1",
  })
);
expectAllow(
  "ALLOW execute_sql EXPLAIN",
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "EXPLAIN SELECT 1",
  })
);
expectAllow(
  "ALLOW CallMcpTool list_migrations",
  preTool("CallMcpTool", {
    server: "project-0-AI_PROFIT_OS-supabase",
    toolName: "list_migrations",
    arguments: { project_id: PRODUCTION_SUPABASE_REF },
  })
);
expectAllow(
  "ALLOW MCP:execute_sql SELECT",
  preTool("MCP:execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "SELECT current_schema()",
  })
);

// --- DENY: same production ref is NOT an allow reason ---
expectDeny(
  "DENY apply_migration even when project_ref is AI-Profit-OS",
  mcp("apply_migration", {
    project_id: PRODUCTION_SUPABASE_REF,
    name: "fixture_do_not_apply",
    query: "select 1",
  }),
  CODES.PROD_MIGRATION_APPLY
);
expectDeny(
  "DENY execute_sql INSERT on production",
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "INSERT INTO deposit_config(id) VALUES ('x')",
  }),
  CODES.PROD_SUPABASE_DML
);
expectDeny(
  "DENY execute_sql ALTER on production",
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "ALTER TABLE deposit_config ADD COLUMN fixture int",
  }),
  CODES.PROD_SUPABASE_DDL
);
expectDeny(
  "DENY execute_sql missing query fail-closed",
  mcp("execute_sql", { project_id: PRODUCTION_SUPABASE_REF }),
  CODES.PROD_SUPABASE_DML
);
expectDeny(
  "DENY migration history UPDATE",
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "UPDATE supabase_migrations.schema_migrations SET version='x'",
  }),
  CODES.MIGRATION_HISTORY_REPAIR
);
expectDeny(
  "DENY deploy_edge_function production",
  mcp("deploy_edge_function", {
    project_id: PRODUCTION_SUPABASE_REF,
    name: "fixture",
  }),
  CODES.PROD_DEPLOY
);

// --- Shell: supabase / psql ---
expectDeny(
  "DENY supabase db push",
  shell("npx supabase db push --project-ref " + PRODUCTION_SUPABASE_REF),
  CODES.PROD_MIGRATION_APPLY
);
expectDeny(
  "DENY supabase migration repair",
  shell("supabase migration repair --status applied 20260821223109"),
  CODES.MIGRATION_HISTORY_REPAIR
);
expectDeny(
  "DENY supabase db reset",
  shell("supabase db reset --project-ref " + PRODUCTION_SUPABASE_REF),
  CODES.PROD_SUPABASE_DDL
);
expectDeny(
  "DENY psql write to production host",
  shell(
    "psql postgres://user@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres -c \"DELETE FROM deposit_config\""
  ),
  CODES.PROD_SUPABASE_DML
);
expectAllow(
  "ALLOW psql SELECT forensic",
  shell(
    "psql postgres://user@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres -c \"SELECT 1\""
  )
);

// --- Deploy / secret ---
expectDeny(
  "DENY wrangler deploy production",
  shell("pnpm exec wrangler deploy --env production"),
  CODES.PROD_DEPLOY
);
expectDeny(
  "DENY cf-pages-web production",
  shell("node tooling/deploy/cf-pages-web.cjs production"),
  CODES.PROD_DEPLOY
);
expectDeny(
  "DENY pnpm cf:deploy:web:prod",
  shell("pnpm cf:deploy:web:prod"),
  CODES.PROD_DEPLOY
);
expectDeny(
  "DENY gh workflow run deploy-cloudflare",
  shell("gh workflow run deploy-cloudflare.yml"),
  CODES.PROD_DEPLOY
);
expectDeny(
  "DENY wrangler secret put production",
  shell("wrangler secret put FOO"),
  CODES.PROD_SECRET_ENV
);
expectDeny(
  "DENY gh secret set",
  shell("gh secret set FOO --body fixture"),
  CODES.PROD_SECRET_ENV
);
expectAllow(
  "ALLOW wrangler deploy preview",
  shell("pnpm exec wrangler deploy --env preview")
);
expectAllow(
  "ALLOW cf:deploy:staging",
  shell("pnpm cf:deploy:staging")
);

// --- Render MCP ---
expectDeny(
  "DENY Render trigger_deploy unspecified service",
  preTool("CallDynamicTool", {
    namespace: "plugin-render-render",
    toolName: "trigger_deploy",
    arguments: { serviceId: "unknown-prod" },
  }),
  CODES.PROD_DEPLOY
);
expectDeny(
  "DENY Render update_environment_variables",
  preTool("CallDynamicTool", {
    namespace: "plugin-render-render",
    toolName: "update_environment_variables",
    arguments: { serviceId: "ai-profit-os", envVars: [{ key: "X", value: "1" }] },
  }),
  CODES.PROD_SECRET_ENV
);
expectAllow(
  "ALLOW Render trigger_deploy preview service",
  preTool("CallDynamicTool", {
    namespace: "plugin-render-render",
    toolName: "trigger_deploy",
    arguments: { serviceId: "ai-profit-web-preview" },
  })
);

// --- GitHub protection / ruleset ---
expectDeny(
  "DENY gh api ruleset POST",
  shell("gh api repos/phonarawd/AI-Profit-OS/rulesets --method POST"),
  CODES.GITHUB_RULESET
);
expectDeny(
  "DENY gh api environment PUT",
  shell(
    "gh api repos/phonarawd/AI-Profit-OS/environments/production --method PUT"
  ),
  CODES.GITHUB_ENVIRONMENT
);
expectDeny(
  "DENY gh api branch protection",
  shell(
    "gh api repos/phonarawd/AI-Profit-OS/branches/main/protection --method PUT"
  ),
  CODES.GITHUB_PROTECTION
);
expectDeny(
  "DENY gh pr merge --admin",
  shell("gh pr merge 1 --admin"),
  CODES.BRANCH_PROTECTION_BYPASS
);
expectAllow(
  "ALLOW gh api GET rulesets",
  shell("gh api repos/phonarawd/AI-Profit-OS/rulesets --method GET")
);
expectAllow(
  "ALLOW gh run list",
  shell("gh run list --branch recovery/release-provenance-20260831 --limit 1")
);

// --- Git push ---
expectDeny("DENY git push origin main", shell("git push origin main"), CODES.MAIN_PUSH);
expectDeny(
  "DENY git push HEAD:main",
  shell("git push origin HEAD:main"),
  CODES.MAIN_PUSH
);
expectDeny(
  "DENY git push release branch",
  shell("git push origin release/1.0.0"),
  CODES.RELEASE_PUSH
);
expectDeny(
  "DENY force push",
  shell("git push --force origin recovery/release-provenance-20260831"),
  CODES.FORCE_PUSH
);
expectDeny(
  "DENY force-with-lease",
  shell("git push --force-with-lease"),
  CODES.FORCE_PUSH
);
expectDeny(
  "DENY plus refspec",
  shell("git push origin +main"),
  CODES.FORCE_PUSH
);
expectDeny(
  "DENY delete remote main",
  shell("git push origin :main"),
  CODES.REMOTE_REF_REWRITE
);
expectDeny(
  "DENY git push --delete origin main",
  shell("git push --delete origin main"),
  CODES.REMOTE_REF_REWRITE
);
expectDeny(
  "DENY --no-verify commit",
  shell("git commit --no-verify -m fixture"),
  CODES.NO_VERIFY
);
expectDeny(
  "DENY --no-gpg-sign",
  shell("git commit --no-gpg-sign -m fixture"),
  CODES.NO_GPG_SIGN
);
expectAllow(
  "ALLOW recovery branch fast-forward push",
  shell("git push origin recovery/release-provenance-20260831")
);
expectAllow("ALLOW git push implicit dest", shell("git push"));
expectAllow("ALLOW git push origin HEAD", shell("git push origin HEAD"));
expectAllow(
  "ALLOW git commit message mentioning --no-verify",
  shell('git commit -m "docs --no-verify"')
);

// --- Local / non-production ---
expectAllow("ALLOW pnpm verify:gate:fast", shell("pnpm verify:gate:fast"));
expectAllow("ALLOW git status", shell("git status --short"));
expectAllow(
  "ALLOW Read repo file",
  preTool("Read", { path: path.join(ROOT, "package.json") })
);
expectAllow(
  "ALLOW Write local hook fixture path",
  preTool("Write", {
    path: path.join(ROOT, ".cursor", "hooks", "_night-guard-fixture.tmp"),
    contents: "ok",
  })
);

// --- Founder 승인 채널 (범위·시한 · 순수 검증 · 파일 I/O 0) ---
const NOW = Date.parse("2026-09-04T03:00:00Z");
const authRaw = (over) => ({
  schema: FOUNDER_AUTH_SCHEMA,
  issuedAt: "2026-09-04T02:30:00Z",
  expiresAt: "2026-09-04T04:30:00Z",
  scopes: ["REL-701-DB"],
  founderStatement: "fixture statement",
  ...(over || {}),
});
const validAuth = validateFounderAuth(authRaw(), NOW);
expect("FOUNDER valid auth → REL-701-DB scope", validAuth.valid && validAuth.scopes.includes("REL-701-DB"));
expect("FOUNDER expired → invalid", !validateFounderAuth(authRaw({ expiresAt: "2026-09-04T02:59:00Z" }), NOW).valid);
expect("FOUNDER issued in future → invalid", !validateFounderAuth(authRaw({ issuedAt: "2026-09-04T03:01:00Z" }), NOW).valid);
expect("FOUNDER window > 4h → invalid", !validateFounderAuth(authRaw({ expiresAt: "2026-09-04T09:00:00Z" }), NOW).valid);
expect("FOUNDER wrong schema → invalid", !validateFounderAuth(authRaw({ schema: "x" }), NOW).valid);
expect("FOUNDER unknown scope only → invalid", !validateFounderAuth(authRaw({ scopes: ["PROD_DEPLOY"] }), NOW).valid);
expect("FOUNDER empty statement → invalid", !validateFounderAuth(authRaw({ founderStatement: " " }), NOW).valid);
expect("FOUNDER missing → invalid", !validateFounderAuth(null, NOW).valid);

const withAuth = { founderAuth: validAuth };
const noAuth = { founderAuth: null };
const applyProd = mcp("apply_migration", {
  project_id: PRODUCTION_SUPABASE_REF,
  name: "fixture_do_not_apply",
  query: "select 1",
});
const pushProd = shell(
  "supabase db push --include-all --db-url postgresql://postgres@db.mgsytcetsiecllmhcyox.supabase.co:5432/postgres"
);
expect("FOUNDER ctx allows apply_migration (REL-701-DB)", decideNightGuard(applyProd, withAuth).permission === "allow");
expect("FOUNDER ctx allows supabase db push (REL-701-DB)", decideNightGuard(pushProd, withAuth).permission === "allow");
expect("no ctx still denies apply_migration", decideNightGuard(applyProd, noAuth).code === CODES.PROD_MIGRATION_APPLY);
expect("no ctx still denies db push", decideNightGuard(pushProd, noAuth).code === CODES.PROD_MIGRATION_APPLY);
expect("invalid ctx shape still denies db push", decideNightGuard(pushProd, { founderAuth: { valid: "yes", scopes: ["REL-701-DB"] } }).code === CODES.PROD_MIGRATION_APPLY);
// 승인이 있어도 절대 열리지 않는 것
expect("FOUNDER ctx never opens migration repair", decideNightGuard(shell("supabase migration repair --status applied 20260821223109"), withAuth).code === CODES.MIGRATION_HISTORY_REPAIR);
expect("FOUNDER ctx never opens db reset", decideNightGuard(shell("supabase db reset --project-ref " + PRODUCTION_SUPABASE_REF), withAuth).code === CODES.PROD_SUPABASE_DDL);
expect("FOUNDER ctx never opens execute_sql INSERT", decideNightGuard(mcp("execute_sql", { project_id: PRODUCTION_SUPABASE_REF, query: "INSERT INTO deposit_config(id) VALUES ('x')" }), withAuth).code === CODES.PROD_SUPABASE_DML);
expect("FOUNDER ctx never opens deploy_edge_function", decideNightGuard(mcp("deploy_edge_function", { project_id: PRODUCTION_SUPABASE_REF, name: "fixture" }), withAuth).code === CODES.PROD_DEPLOY);
expect("FOUNDER ctx never opens wrangler deploy production", decideNightGuard(shell("pnpm exec wrangler deploy --env production"), withAuth).code === CODES.PROD_DEPLOY);
expect("FOUNDER ctx never opens gh workflow run deploy-cloudflare", decideNightGuard(shell("gh workflow run deploy-cloudflare.yml"), withAuth).code === CODES.PROD_DEPLOY);
expect("FOUNDER ctx never opens gh secret set", decideNightGuard(shell("gh secret set FOO --body fixture"), withAuth).code === CODES.PROD_SECRET_ENV);
expect("FOUNDER ctx never opens ruleset mutation", decideNightGuard(shell("gh api repos/phonarawd/AI-Profit-OS/rulesets --method POST"), withAuth).code === CODES.GITHUB_RULESET);
expect("FOUNDER ctx never opens force push", decideNightGuard(shell("git push --force origin main"), withAuth).code === CODES.FORCE_PUSH);
expect("FOUNDER ctx never opens main push", decideNightGuard(shell("git push origin main"), withAuth).code === CODES.MAIN_PUSH);
expect("FOUNDER ctx never opens --no-verify", decideNightGuard(shell("git commit --no-verify -m fixture"), withAuth).code === CODES.NO_VERIFY);
expect(
  "founder auth file is gitignored",
  fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8").includes(".cursor/night-guard.founder-auth.local.json")
);

// --- Composed hook (executable) ---
const hookAllow = runHook(
  mcp("list_tables", { project_id: PRODUCTION_SUPABASE_REF })
);
expect(
  "HOOK ALLOW list_tables",
  hookAllow.status === 0 && hookAllow.permission === "allow",
  "perm=" + hookAllow.permission
);
const hookDeny = runHook(
  mcp("apply_migration", {
    project_id: PRODUCTION_SUPABASE_REF,
    name: "fixture_do_not_apply",
    query: "select 1",
  })
);
expect(
  "HOOK DENY apply_migration production ref",
  hookDeny.status === 0 &&
    hookDeny.permission === "deny" &&
    hookDeny.code === CODES.PROD_MIGRATION_APPLY,
  "perm=" + hookDeny.permission + " code=" + hookDeny.code
);
const hookPush = runHook(shell("git push --force origin main"));
expect(
  "HOOK DENY force push main",
  hookPush.status === 0 &&
    hookPush.permission === "deny" &&
    (hookPush.code === CODES.FORCE_PUSH || hookPush.code === CODES.MAIN_PUSH),
  "code=" + hookPush.code
);
const hookSelect = runHook(
  mcp("execute_sql", {
    project_id: PRODUCTION_SUPABASE_REF,
    query: "SELECT 1",
  })
);
expect(
  "HOOK ALLOW production SELECT forensic",
  hookSelect.status === 0 && hookSelect.permission === "allow",
  "perm=" + hookSelect.permission
);

// --- Wiring ---
const hooksJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, ".cursor", "hooks.json"), "utf8").replace(/^\uFEFF/, "")
);
const pre = (hooksJson.hooks.preToolUse || [])[0] || {};
expect("hooks.json still one preToolUse", (hooksJson.hooks.preToolUse || []).length === 1);
expect(
  "matcher includes CallDynamicTool",
  String(pre.matcher || "").includes("CallDynamicTool")
);
expect(
  "night-guard policy file exists",
  fs.existsSync(path.join(ROOT, ".cursor", "hooks", "lib", "night-guard-policy.mjs"))
);
const hookSrc = fs.readFileSync(
  path.join(ROOT, ".cursor", "hooks", "project-boundary.mjs"),
  "utf8"
);
expect("hook composes decideNightGuard", hookSrc.includes("decideNightGuard"));
const catalog = fs.readFileSync(path.join(ROOT, "tooling", "verify", "CATALOG.md"), "utf8");
expect("CATALOG.md lists night-guard", catalog.includes("| night-guard |"));

const failed = cases.filter((c) => !c.pass);
const report = {
  VERIFY: failed.length === 0 ? "PASS" : "FAIL",
  unit: cases.filter((c) => c.pass).length + "/" + cases.length,
  PRODUCTION_MUTATION: 0,
  FIXTURE_ONLY: 1,
  failed: failed.map((c) => c.name + (c.detail ? " :: " + c.detail : "")),
};
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exit(failed.length === 0 ? 0 : 1);
