/**
 * Night Guard — 실행 가능한 프로덕션 변이 차단 (순수 정책, I/O 없음).
 *
 * Isolation(프로젝트 ID 허용)과 분리한다.
 * 같은 Supabase project_ref가 AI-Profit-OS여도 그 프로젝트는 Production이므로
 * DDL/DML/migration/deploy/secret/ruleset 변이는 DENY.
 *
 * 판정은 OPERATION을 본다. 픽스처/tool_input만으로 검증한다.
 * 실제 Production 변이를 시도해 규칙을 시험하지 않는다.
 */

export const PRODUCTION_SUPABASE_REF = "mgsytcetsiecllmhcyox";

export const PRODUCTION_HOSTS = [
  "hiptk.app",
  "app.hiptk.app",
  "ops.hiptk.app",
  "api.hiptk.app",
  "go.hiptk.app",
  "ai-profit-os.onrender.com",
  "ai-profit-web.ebay-adapter.workers.dev",
  "ai-profit-ops.ebay-adapter.workers.dev",
  "mgsytcetsiecllmhcyox.supabase.co",
  "db.mgsytcetsiecllmhcyox.supabase.co",
];

export const STAGING_WORKER_HOSTS = [
  "ai-profit-web-preview.ebay-adapter.workers.dev",
  "ai-profit-ops-preview.ebay-adapter.workers.dev",
];

export const CODES = {
  PROD_SUPABASE_DDL: "NG_PROD_SUPABASE_DDL",
  PROD_SUPABASE_DML: "NG_PROD_SUPABASE_DML",
  PROD_MIGRATION_APPLY: "NG_PROD_MIGRATION_APPLY",
  MIGRATION_HISTORY_REPAIR: "NG_MIGRATION_HISTORY_REPAIR",
  PROD_DEPLOY: "NG_PROD_DEPLOY",
  PROD_SECRET_ENV: "NG_PROD_SECRET_ENV",
  GITHUB_RULESET: "NG_GITHUB_RULESET",
  GITHUB_ENVIRONMENT: "NG_GITHUB_ENVIRONMENT",
  GITHUB_PROTECTION: "NG_GITHUB_PROTECTION",
  BRANCH_PROTECTION_BYPASS: "NG_BRANCH_PROTECTION_BYPASS",
  MAIN_PUSH: "NG_MAIN_PUSH",
  RELEASE_PUSH: "NG_RELEASE_PUSH",
  FORCE_PUSH: "NG_FORCE_PUSH",
  REMOTE_REF_REWRITE: "NG_REMOTE_REF_REWRITE",
  NO_VERIFY: "NG_NO_VERIFY",
  NO_GPG_SIGN: "NG_NO_GPG_SIGN",
  INTERNAL: "NG_INTERNAL",
};

/**
 * Founder 승인 채널 (범위·시한 제한 · 순수 검증).
 *
 * 엔트리(project-boundary.mjs)가 로컬 gitignored 파일
 * `.cursor/night-guard.founder-auth.local.json` 을 읽어 validateFounderAuth()로
 * 검증한 결과만 ctx.founderAuth 로 주입한다. 파일이 없거나 무효면 기존과 100% 동일(DENY).
 *
 * 스코프별 허용 연산은 아래 표에만 존재한다. 표 밖 연산은 승인이 있어도 DENY.
 *   REL-701-DB : Production migration apply (supabase db push / migration up · MCP apply_migration)
 *
 * 승인으로도 절대 열리지 않는 것: migration-history repair · db reset · Production deploy/rollback ·
 * secret/env 변이 · GitHub ruleset/protection · force push · main/release push · --no-verify.
 */
export const FOUNDER_AUTH_SCHEMA = "night-guard.founder-auth.v1";
export const FOUNDER_AUTH_MAX_WINDOW_MS = 4 * 60 * 60 * 1000;
export const FOUNDER_AUTH_SCOPES = Object.freeze({
  "REL-701-DB": Object.freeze(["PROD_MIGRATION_APPLY"]),
});

export function validateFounderAuth(raw, nowMs) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const invalid = (reason) => ({ valid: false, scopes: [], reason });
  if (!raw || typeof raw !== "object") return invalid("missing");
  if (raw.schema !== FOUNDER_AUTH_SCHEMA) return invalid("schema");
  const issued = Date.parse(String(raw.issuedAt || ""));
  const expires = Date.parse(String(raw.expiresAt || ""));
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) return invalid("timestamps");
  if (issued > now) return invalid("issued_in_future");
  if (expires <= now) return invalid("expired");
  if (expires - issued > FOUNDER_AUTH_MAX_WINDOW_MS) return invalid("window_too_long");
  if (!String(raw.founderStatement || "").trim()) return invalid("statement");
  const scopes = Array.isArray(raw.scopes)
    ? raw.scopes.map(String).filter((s) => Object.prototype.hasOwnProperty.call(FOUNDER_AUTH_SCOPES, s))
    : [];
  if (scopes.length === 0) return invalid("no_known_scope");
  return { valid: true, scopes, reason: "ok" };
}

function founderAllows(ctx, operation) {
  const auth = ctx && ctx.founderAuth;
  if (!auth || auth.valid !== true || !Array.isArray(auth.scopes)) return false;
  return auth.scopes.some((s) => (FOUNDER_AUTH_SCOPES[s] || []).includes(operation));
}

export function deny(code, userMessage, agentMessage) {
  const msg = userMessage || code;
  return {
    continue: true,
    permission: "deny",
    code,
    user_message: msg,
    userMessage: msg,
    agent_message: agentMessage || msg,
    agentMessage: agentMessage || msg,
  };
}

export function allow() {
  return { continue: true, permission: "allow" };
}

function lower(s) {
  return String(s || "").toLowerCase();
}

function stripQuoted(s) {
  return String(s || "")
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");
}

function blobOf(parts) {
  return parts.filter(Boolean).map((p) => String(p)).join("\n");
}

export function stripSqlLiteralsAndComments(sql) {
  return String(sql || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/\$[a-zA-Z0-9_]*\$[\s\S]*?\$[a-zA-Z0-9_]*\$/g, "''");
}

const SQL_WRITE_RE =
  /\b(INSERT|UPDATE|DELETE|MERGE|UPSERT|TRUNCATE|ALTER|DROP|CREATE|GRANT|REVOKE|COMMENT|COPY|CALL|DO|VACUUM|REINDEX|CLUSTER|REFRESH|LOAD|LOCK|SECURITY|OWNER|NOTIFY|LISTEN|UNLISTEN)\b/i;
const SQL_ROLE_RE =
  /\b(SET\s+ROLE|RESET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION)\b/i;
const SQL_READ_HEAD_RE = /^\s*(WITH|SELECT|EXPLAIN|SHOW|VALUES|TABLE)\b/i;
const MIGRATION_HISTORY_RE =
  /\b(schema_migrations|supabase_migrations)\b/i;

export function isReadOnlySql(sql) {
  const stripped = stripSqlLiteralsAndComments(sql).trim();
  if (!stripped) return false;
  const parts = stripped
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (SQL_WRITE_RE.test(part) || SQL_ROLE_RE.test(part)) return false;
    if (!SQL_READ_HEAD_RE.test(part)) return false;
  }
  return true;
}

export function isMigrationHistoryWrite(sql) {
  const stripped = stripSqlLiteralsAndComments(sql);
  return MIGRATION_HISTORY_RE.test(stripped) && SQL_WRITE_RE.test(stripped);
}

function mentionsProductionHost(blob) {
  const s = lower(blob);
  for (const host of PRODUCTION_HOSTS) {
    if (s.includes(lower(host))) return true;
  }
  if (s.includes(PRODUCTION_SUPABASE_REF)) return true;
  return false;
}

function hasPositiveStagingMarker(blob) {
  const s = lower(blob);
  if (STAGING_WORKER_HOSTS.some((h) => s.includes(lower(h)))) return true;
  if (/(^|[^\w-])(--env\s+(preview|staging)|wranglerenv[=:]\s*(preview|staging))([^\w-]|$)/i.test(s)) {
    return true;
  }
  if (/\bcf:deploy:staging\b|\bcf:rollback:staging\b|\bdeploy-staging\b/i.test(s)) {
    return true;
  }
  if (/\b(ai-profit-web-preview|ai-profit-ops-preview)\b/i.test(s)) return true;
  if (/(^|[^\w-])(preview|staging)([^\w-]|$)/i.test(s) && !mentionsProductionHost(s)) {
    // 호스트가 production이 아니고 preview/staging 토큰이 명시된 경우만.
    return /\b(preview|staging)\b/i.test(s);
  }
  return false;
}

function isExplicitlyNonProduction(blob) {
  return hasPositiveStagingMarker(blob) && !mentionsProductionHost(blob);
}

function extractShellCommand(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (payload.command) return String(payload.command);
  if (payload.cmd) return String(payload.cmd);
  const ti =
    payload.tool_input ||
    payload.toolInput ||
    payload.arguments ||
    payload.input;
  if (typeof ti === "string") {
    try {
      const parsed = JSON.parse(ti);
      if (parsed && parsed.command) return String(parsed.command);
    } catch {
      return ti;
    }
  }
  if (ti && typeof ti === "object") {
    if (ti.command) return String(ti.command);
    if (ti.cmd) return String(ti.cmd);
  }
  return "";
}

function parseToolInput(payload) {
  const ti =
    (payload &&
      (payload.tool_input ||
        payload.toolInput ||
        payload.arguments ||
        payload.input)) ||
    {};
  if (typeof ti === "string") {
    try {
      return JSON.parse(ti);
    } catch {
      return { command: ti };
    }
  }
  return ti && typeof ti === "object" ? ti : {};
}

function toolNameOf(payload) {
  return String(
    (payload && (payload.tool_name || payload.toolName || payload.tool)) || ""
  );
}

function mcpToolOf(payload, input) {
  const tool = toolNameOf(payload);
  if (/^MCP:/i.test(tool)) return tool.replace(/^MCP:/i, "");
  const obj = input && typeof input === "object" ? input : {};
  return String(
    obj.toolName ||
      obj.tool_name ||
      obj.tool ||
      (payload && (payload.mcp_tool || payload.mcpTool)) ||
      ""
  );
}

function mcpServerOf(payload, input) {
  const obj = input && typeof input === "object" ? input : {};
  return String(
    (payload && (payload.server || payload.url || payload.namespace)) ||
      obj.server ||
      obj.namespace ||
      ""
  );
}

function mcpArgsOf(input) {
  if (!input || typeof input !== "object") return {};
  if (input.arguments && typeof input.arguments === "object") return input.arguments;
  return input;
}

function sqlFromArgs(args) {
  if (!args || typeof args !== "object") return "";
  return String(args.query || args.sql || args.statement || args.command || "");
}

function projectRefFromArgs(args, blob) {
  if (args && typeof args === "object") {
    const ref = String(args.project_id || args.project_ref || args.projectRef || "");
    if (ref) return lower(ref);
  }
  const m = String(blob || "").match(/mgsytcetsiecllmhcyox/i);
  return m ? PRODUCTION_SUPABASE_REF : "";
}

function isSupabaseSurface(server, tool, blob) {
  const s = lower(server + " " + tool + " " + blob);
  return (
    /supabase/i.test(s) ||
    /list_tables|list_migrations|apply_migration|execute_sql|deploy_edge_function|list_extensions/i.test(
      tool
    )
  );
}

function isGithubSurface(server, tool, blob) {
  const s = lower(server + " " + tool + " " + blob);
  return /github/i.test(s) || /\bgh\s+/i.test(blob);
}

function isRenderSurface(server, tool, blob) {
  const s = lower(server + " " + tool + " " + blob);
  return /render/i.test(s) || /trigger_deploy|update_environment_variables/i.test(tool);
}

export function classifySqlOperation(sql) {
  if (!String(sql || "").trim()) {
    return { kind: "unknown" };
  }
  if (isMigrationHistoryWrite(sql)) return { kind: "history_repair" };
  if (!isReadOnlySql(sql)) {
    const stripped = stripSqlLiteralsAndComments(sql);
    if (/\b(ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE)\b/i.test(stripped)) {
      return { kind: "ddl" };
    }
    return { kind: "dml" };
  }
  return { kind: "read" };
}

function denyDb(kind) {
  if (kind === "history_repair") {
    return deny(
      CODES.MIGRATION_HISTORY_REPAIR,
      "Blocked: migration-history repair is forbidden.",
      "Do not repair supabase_migrations / schema_migrations on Production."
    );
  }
  if (kind === "ddl") {
    return deny(
      CODES.PROD_SUPABASE_DDL,
      "Blocked: Production Supabase DDL.",
      "Production is read-only. Write staging migrations instead."
    );
  }
  return deny(
    CODES.PROD_SUPABASE_DML,
    "Blocked: Production Supabase DML/test write.",
    "Production is read-only. Use mocked fixtures or a proven non-production DB."
  );
}

function decideSupabaseMcp(tool, args, blob, ctx) {
  const name = lower(tool);
  const sql = sqlFromArgs(args);
  const ref = projectRefFromArgs(args, blob);
  const productionRef =
    !ref || ref === PRODUCTION_SUPABASE_REF || mentionsProductionHost(blob);
  const staging = isExplicitlyNonProduction(blob + " " + JSON.stringify(args || {}));

  if (/^apply_migration$/.test(name)) {
    if (staging) return allow();
    if (founderAllows(ctx, "PROD_MIGRATION_APPLY")) return allow();
    return deny(
      CODES.PROD_MIGRATION_APPLY,
      "Blocked: Production migration apply.",
      "apply_migration is a Production write even when project_ref is AI-Profit-OS."
    );
  }
  if (/^deploy_edge_function$/.test(name)) {
    if (staging) return allow();
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production edge function deploy.",
      "Do not deploy to Production from recovery."
    );
  }
  if (/^execute_sql$/.test(name)) {
    if (staging) return allow();
    if (!productionRef) {
      // 미확인 ref — Production이 아니라고 증명되지 않으면 fail-closed.
      if (!ref) {
        const kind = classifySqlOperation(sql);
        if (kind.kind === "read") return allow();
        return denyDb(kind.kind === "unknown" ? "dml" : kind.kind);
      }
      return allow();
    }
    const kind = classifySqlOperation(sql);
    if (kind.kind === "read") return allow();
    return denyDb(kind.kind === "unknown" ? "dml" : kind.kind);
  }
  return null;
}

function ghApiPath(cmd) {
  const tokens = stripQuoted(cmd).split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (/^-/.test(t)) continue;
    if (/^https?:\/\//i.test(t) && /github/.test(t)) {
      try {
        return new URL(t).pathname;
      } catch {
        return t;
      }
    }
    if (
      /rulesets|environments|protection|ruleset/i.test(t) ||
      /^\/?repos\//i.test(t)
    ) {
      return t;
    }
  }
  return "";
}

function ghApiMethod(cmd) {
  const stripped = stripQuoted(cmd);
  const m = stripped.match(/(?:--method|-X)\s+([A-Za-z]+)/i);
  if (m) return m[1].toUpperCase();
  if (/\s-[fF]\s/.test(stripped) || /\s--raw-field\b/.test(stripped)) return "POST";
  if (/\s--input\b/.test(stripped)) return "POST";
  return "GET";
}

function isGhReadMethod(method) {
  return method === "GET" || method === "HEAD";
}

function decideGithubCli(cmd) {
  const stripped = stripQuoted(cmd);
  if (!/\bgh\s+/i.test(cmd)) return null;

  if (/\bgh\s+pr\s+merge\b/i.test(cmd) && /\s--admin\b/.test(stripped)) {
    return deny(
      CODES.BRANCH_PROTECTION_BYPASS,
      "Blocked: GitHub admin merge bypass.",
      "Do not bypass branch protection."
    );
  }

  if (!/\bgh\s+api\b/i.test(cmd)) return null;

  const method = ghApiMethod(cmd);
  const apiPath = lower(ghApiPath(cmd) + " " + cmd);
  const mutating = !isGhReadMethod(method);

  if (/ruleset/.test(apiPath) && mutating) {
    return deny(
      CODES.GITHUB_RULESET,
      "Blocked: GitHub ruleset mutation.",
      "Do not mutate repository rulesets."
    );
  }
  if (/\/environments\b|\/environments\//.test(apiPath) && mutating) {
    return deny(
      CODES.GITHUB_ENVIRONMENT,
      "Blocked: GitHub environment/protection mutation.",
      "Do not mutate GitHub environments."
    );
  }
  if (
    mutating &&
    (/\/protection\b/.test(apiPath) ||
      /branch-protection|bypass_pull_request|enforce_admins/i.test(apiPath))
  ) {
    return deny(
      CODES.GITHUB_PROTECTION,
      "Blocked: GitHub branch-protection mutation.",
      "Do not mutate or bypass branch protection."
    );
  }
  return null;
}

function gitPushForce(cmd) {
  const stripped = stripQuoted(cmd);
  if (!/\bgit\s+push\b/i.test(cmd)) return false;
  if (/\s--force(-with-lease)?\b/.test(stripped)) return true;
  if (/\s-[A-Za-z]*f[A-Za-z]*\b/.test(stripped)) return true;
  if (/\s\+[A-Za-z0-9._/\-:]+\b/.test(stripped)) return true;
  return false;
}

function gitPushRefspecs(cmd) {
  const stripped = stripQuoted(cmd);
  if (!/\bgit\s+push\b/i.test(stripped)) return [];
  const tokens = stripped.split(/\s+/).filter(Boolean);
  const out = [];
  let seenPush = false;
  for (const raw of tokens) {
    const t = raw.replace(/^\+/, "");
    if (!seenPush) {
      if (t === "push") seenPush = true;
      continue;
    }
    if (/^-/.test(t)) continue;
    if (/^(origin|upstream|github)$/i.test(t)) continue;
    out.push(t);
  }
  return out;
}

function refIsMain(ref) {
  const r = String(ref || "").replace(/^refs\/heads\//, "");
  if (/^HEAD:/.test(r)) return refIsMain(r.slice(5));
  if (/:/.test(r)) {
    const dest = r.split(":").pop();
    return refIsMain(dest);
  }
  return /^(main|master)$/i.test(r);
}

function refIsRelease(ref) {
  const r = String(ref || "").replace(/^refs\/heads\//, "");
  if (/^HEAD:/.test(r)) return refIsRelease(r.slice(5));
  if (/:/.test(r)) return refIsRelease(r.split(":").pop());
  return /^(release|releases)(\/|$)/i.test(r);
}

function gitDeleteRefspec(cmd) {
  const stripped = stripQuoted(cmd);
  if (!/\bgit\s+push\b/i.test(cmd)) return false;
  if (/\s--delete\b|\s-[A-Za-z]*d[A-Za-z]*\b/.test(stripped)) return true;
  if (/\s:[A-Za-z0-9._/\-]+/.test(stripped)) return true;
  if (/\s--mirror\b/.test(stripped)) return true;
  return false;
}

function decideGit(cmd) {
  const stripped = " " + stripQuoted(cmd) + " ";
  if (/\s--no-verify\b/.test(stripped)) {
    return deny(
      CODES.NO_VERIFY,
      "Blocked: --no-verify forbidden.",
      "Hooks must run. Remove --no-verify."
    );
  }
  if (/\s--no-gpg-sign\b/.test(stripped)) {
    return deny(
      CODES.NO_GPG_SIGN,
      "Blocked: --no-gpg-sign forbidden.",
      "Repo policy forbids --no-gpg-sign."
    );
  }

  if (/\bgit\s+push\b/i.test(cmd)) {
    if (gitPushForce(cmd)) {
      return deny(
        CODES.FORCE_PUSH,
        "Blocked: force push.",
        "Fast-forward only. No --force / +refspec."
      );
    }
    if (gitDeleteRefspec(cmd)) {
      const refs = gitPushRefspecs(cmd).concat([cmd]);
      if (refs.some((r) => refIsMain(r) || /main|master|release/i.test(String(r)))) {
        return deny(
          CODES.REMOTE_REF_REWRITE,
          "Blocked: destructive remote ref rewrite.",
          "Do not delete or mirror-rewrite main/release refs."
        );
      }
      return deny(
        CODES.REMOTE_REF_REWRITE,
        "Blocked: destructive remote ref rewrite.",
        "Do not delete remote refs or --mirror push."
      );
    }
    const refs = gitPushRefspecs(cmd);
    for (const ref of refs) {
      if (refIsMain(ref)) {
        return deny(
          CODES.MAIN_PUSH,
          "Blocked: main direct push.",
          "Do not push to main."
        );
      }
      if (refIsRelease(ref)) {
        return deny(
          CODES.RELEASE_PUSH,
          "Blocked: release direct push.",
          "Do not push to release branches."
        );
      }
    }
  }
  return null;
}

function decideSupabaseCli(cmd, ctx) {
  if (!/\bsupabase\b/i.test(cmd)) return null;
  const stripped = stripQuoted(cmd);
  const staging = isExplicitlyNonProduction(cmd);

  if (/\bmigration\s+repair\b/i.test(stripped) || /\bdb\s+repair\b/i.test(stripped)) {
    return deny(
      CODES.MIGRATION_HISTORY_REPAIR,
      "Blocked: migration-history repair.",
      "Do not repair Production migration history."
    );
  }
  if (/\bdb\s+push\b/i.test(stripped) || /\bmigration\s+up\b/i.test(stripped)) {
    if (staging) return allow();
    if (founderAllows(ctx, "PROD_MIGRATION_APPLY")) return allow();
    return deny(
      CODES.PROD_MIGRATION_APPLY,
      "Blocked: Production migration apply.",
      "supabase db push / migration up is a Production write."
    );
  }
  if (/\bdb\s+reset\b/i.test(stripped)) {
    if (staging) return allow();
    return deny(
      CODES.PROD_SUPABASE_DDL,
      "Blocked: Production database reset.",
      "db reset is Production DDL."
    );
  }
  if (/\bdb\s+execute\b|\bdb\s+query\b/i.test(stripped)) {
    if (staging) return allow();
    const q = cmd.match(/(?:-c|--sql|--command)\s+("[^"]*"|'[^']*'|\S+)/i);
    const sql = q ? q[1].replace(/^['"]|['"]$/g, "") : "";
    const kind = classifySqlOperation(sql);
    if (kind.kind === "read") return allow();
    return denyDb(kind.kind === "unknown" ? "dml" : kind.kind);
  }
  if (/\bsecrets?\s+set\b/i.test(stripped)) {
    if (staging) return allow();
    return deny(
      CODES.PROD_SECRET_ENV,
      "Blocked: Production secret mutation.",
      "Do not mutate Production secrets."
    );
  }
  return null;
}

function decidePsql(cmd) {
  if (!/\bpsql\b/i.test(cmd)) return null;
  if (isExplicitlyNonProduction(cmd)) return allow();
  if (!mentionsProductionHost(cmd) && !/\bsupabase\b/i.test(cmd)) return null;
  const q = cmd.match(/(?:-c|--command)\s+("[^"]*"|'[^']*'|\S+)/i);
  const sql = q ? q[1].replace(/^['"]|['"]$/g, "") : "";
  const kind = classifySqlOperation(sql);
  if (kind.kind === "read") return allow();
  return denyDb(kind.kind === "unknown" ? "dml" : kind.kind);
}

function decideDeployCli(cmd) {
  const stripped = stripQuoted(cmd);
  if (isExplicitlyNonProduction(cmd)) return null;

  if (
    /\bcf:deploy:[a-z0-9:-]*prod\b/i.test(cmd) ||
    /\bcf:deploy:all:prod\b/i.test(cmd) ||
    /\bcf:deploy:workers:prod\b/i.test(cmd) ||
    /\bcf:deploy:web:prod\b/i.test(cmd) ||
    /\bcf:deploy:ops:prod\b/i.test(cmd)
  ) {
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production deploy.",
      "Production deploy/redeploy is forbidden."
    );
  }

  if (
    /\b(wrangler|opennextjs-cloudflare)\b[\s\S]*\b(deploy|rollback)\b/i.test(cmd) &&
    !/\s--env\s+(preview|staging)\b/i.test(stripped)
  ) {
    if (/\b(pages\s+deploy|deploy\s+--env\s+production)\b/i.test(cmd) ||
        /\s--env\s+production\b/i.test(stripped) ||
        mentionsProductionHost(cmd) ||
        !/\bpreview|staging\b/i.test(cmd)) {
      return deny(
        CODES.PROD_DEPLOY,
        "Blocked: Production deploy/rollback.",
        "Use proven staging/preview only. Do not point preview at Production."
      );
    }
  }

  if (
    /\bnode\s+tooling\/deploy\/cf-(pages-web|pages-ops|workers|deploy-all)\.cjs\b/i.test(
      cmd
    ) &&
    /\bproduction\b/i.test(cmd)
  ) {
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production Cloudflare deploy.",
      "Production deploy scripts are forbidden."
    );
  }

  if (
    /\bgh\s+workflow\s+run\b/i.test(cmd) &&
    /deploy-cloudflare|release-build|release-acceptance/i.test(cmd) &&
    !/deploy-staging/i.test(cmd)
  ) {
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production deploy workflow.",
      "Do not dispatch Production deploy workflows."
    );
  }

  if (/\brender\b[\s\S]*\b(deploy|rollback)\b/i.test(cmd) && !isExplicitlyNonProduction(cmd)) {
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production Render deploy/rollback.",
      "Render Production deploy is forbidden."
    );
  }

  return null;
}

function decideSecretCli(cmd) {
  const stripped = stripQuoted(cmd);
  if (isExplicitlyNonProduction(cmd)) return null;
  if (
    /\bwrangler\s+secret\s+(put|delete|bulk)\b/i.test(cmd) &&
    !/\s--env\s+(preview|staging)\b/i.test(stripped)
  ) {
    return deny(
      CODES.PROD_SECRET_ENV,
      "Blocked: Production secret mutation.",
      "Do not mutate Production wrangler secrets."
    );
  }
  if (/\bgh\s+secret\s+(set|delete)\b/i.test(cmd)) {
    return deny(
      CODES.PROD_SECRET_ENV,
      "Blocked: Production GitHub secret mutation.",
      "Do not mutate repo secrets."
    );
  }
  if (/\bgh\s+variable\s+(set|delete)\b/i.test(cmd)) {
    return deny(
      CODES.PROD_SECRET_ENV,
      "Blocked: Production GitHub env/variable mutation.",
      "Do not mutate GitHub variables."
    );
  }
  return null;
}

function decideRenderMcp(tool, args, blob) {
  const name = lower(tool);
  const packed = blob + " " + JSON.stringify(args || {});
  if (/^trigger_deploy$/.test(name)) {
    if (isExplicitlyNonProduction(packed)) return allow();
    return deny(
      CODES.PROD_DEPLOY,
      "Blocked: Production Render deploy.",
      "trigger_deploy is fail-closed unless the service is positively non-production."
    );
  }
  if (/^update_environment_variables$/.test(name)) {
    if (isExplicitlyNonProduction(packed)) return allow();
    return deny(
      CODES.PROD_SECRET_ENV,
      "Blocked: Production env mutation.",
      "Do not mutate Production environment variables."
    );
  }
  return null;
}

function decideGithubMcp(tool, args, blob) {
  const name = lower(tool);
  const packed = lower(blob + " " + JSON.stringify(args || {}));
  if (
    /ruleset|update_environment|branch_protection|protection_rules/i.test(name) ||
    (/ruleset|branch.protection|environments\/production/i.test(packed) &&
      /create|update|delete|put|patch|post/i.test(name + packed))
  ) {
    if (/ruleset/.test(packed) || /ruleset/.test(name)) {
      return deny(
        CODES.GITHUB_RULESET,
        "Blocked: GitHub ruleset mutation.",
        "Do not mutate GitHub rulesets via MCP."
      );
    }
    if (/environment/.test(packed) || /environment/.test(name)) {
      return deny(
        CODES.GITHUB_ENVIRONMENT,
        "Blocked: GitHub environment mutation.",
        "Do not mutate GitHub environments via MCP."
      );
    }
    return deny(
      CODES.GITHUB_PROTECTION,
      "Blocked: GitHub protection mutation.",
      "Do not mutate branch protection via MCP."
    );
  }
  return null;
}

function decideShell(payload, ctx) {
  const cmd = extractShellCommand(payload);
  if (!cmd.trim()) return allow();

  const gitHit = decideGit(cmd);
  if (gitHit) return gitHit;

  const ghHit = decideGithubCli(cmd);
  if (ghHit) return ghHit;

  const sbHit = decideSupabaseCli(cmd, ctx);
  if (sbHit) return sbHit;

  const psqlHit = decidePsql(cmd);
  if (psqlHit) return psqlHit;

  const secretHit = decideSecretCli(cmd);
  if (secretHit) return secretHit;

  const deployHit = decideDeployCli(cmd);
  if (deployHit) return deployHit;

  return allow();
}

function decideMcp(payload, ctx) {
  const input = parseToolInput(payload);
  const server = mcpServerOf(payload, input);
  const tool = mcpToolOf(payload, input);
  const args = mcpArgsOf(input);
  const blob = blobOf([server, tool, JSON.stringify(args), extractShellCommand(payload)]);

  if (isSupabaseSurface(server, tool, blob)) {
    const hit = decideSupabaseMcp(tool, args, blob, ctx);
    if (hit) return hit;
  }
  if (isRenderSurface(server, tool, blob)) {
    const hit = decideRenderMcp(tool, args, blob);
    if (hit) return hit;
  }
  if (isGithubSurface(server, tool, blob)) {
    const hit = decideGithubMcp(tool, args, blob);
    if (hit) return hit;
  }
  return allow();
}

function isShellTool(tool, payload, input) {
  const cmd = extractShellCommand(payload) || String((input && input.command) || "");
  if (
    tool === "Shell" ||
    /^shell$/i.test(tool) ||
    /^bash$/i.test(tool) ||
    (/shell/i.test(tool) && cmd)
  ) {
    return true;
  }
  return Boolean(cmd && /terminal|command|exec/i.test(tool));
}

function isMcpTool(tool, payload, input) {
  if (/^MCP:/i.test(tool)) return true;
  if (/^(CallMcpTool|FetchMcpResource|CallDynamicTool)$/i.test(tool)) return true;
  if (payload && (payload.server || payload.namespace)) return true;
  if (input && typeof input === "object" && (input.server || input.toolName || input.namespace)) {
    return true;
  }
  return false;
}

export function decideNightGuard(payload, ctx) {
  try {
    if (!payload || typeof payload !== "object") return allow();
    const event = String(
      payload.hook_event_name ||
        payload.hookEventName ||
        payload.event ||
        payload.event_name ||
        ""
    );
    if (/TabFileRead|beforeTab/i.test(event)) return allow();

    const tool = toolNameOf(payload);
    const input = parseToolInput(payload);
    const safeCtx = ctx && typeof ctx === "object" ? ctx : {};

    if (isShellTool(tool, payload, input) || payload.command || payload.cmd) {
      return decideShell(
        {
          ...payload,
          command: extractShellCommand(payload) || String((input && input.command) || ""),
        },
        safeCtx
      );
    }

    if (isMcpTool(tool, payload, input)) {
      return decideMcp(payload, safeCtx);
    }

    return allow();
  } catch (err) {
    return deny(
      CODES.INTERNAL,
      "Blocked: Night Guard internal failure (fail-closed).",
      String(err && err.message ? err.message : err)
    );
  }
}
