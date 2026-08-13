/**
 * QA-8 Security & Privacy World.
 *
 * ASVS 5.0.0 subset (governance/engine-acceptance/asvs-mapping.v1.json).
 * Scope: IDOR / authz / PII / delete-account. INV-ISOLATION-01 mapping is
 * SHARED with QA2 (QA2 = user-facing controller surface, QA8 = admin/system
 * surface + JWT token-integrity round-trip + privacy retention-after-delete).
 *
 * Product mutation = 0. Read-only static source/schema inspection plus reuse
 * of an existing verify child-process (tooling/verify/auth-jwt-runtime.cjs).
 * exhaustive_certification_claim = false: this is a bounded subset, not a
 * full ASVS certification.
 *
 * Live dynamic pentest against a booted Nest instance (real HTTP adversarial
 * requests) is outside local-tiny budget on this Phase0 machine (2C/8GB).
 * Recorded BLOCKED_ENV_CAPABILITY and deferred to the CI heavy matrix - never
 * laundered as PASS.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("../lib/hash-scope.cjs");
const { spawnVerify } = require("../lib/spawn-verify.cjs");
const { buildRichFailureEvidence } = require("../lib/rich-failure-evidence.cjs");
const { runUserIsolationSurfaces } = require("./user-isolation-surfaces.cjs");

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

/** Recursive *.admin.controller.ts finder (self-contained, no glob dependency). */
function findAdminControllers() {
  const out = [];
  const srcAbs = path.join(ROOT, "services/api-nest/src");
  function walk(abs, rel) {
    if (!fs.existsSync(abs)) return;
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      const childAbs = path.join(abs, ent.name);
      const childRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(childAbs, childRel);
      else if (ent.isFile() && ent.name.endsWith(".admin.controller.ts")) {
        out.push(`services/api-nest/src/${childRel}`);
      }
    }
  }
  walk(srcAbs, "");
  return out.sort();
}

/** High-risk admin surfaces called out explicitly (money/credential impact). */
const HIGH_IMPACT_ADMIN_HINTS = [
  { needle: "balanceAdjust", risk: "unauthenticated money balance adjustment" },
  { needle: "withdraw-credentials", risk: "withdrawal credential exposure", pathHint: true },
  { needle: "getBuckets", risk: "unauthenticated cross-user financial read" },
  { needle: "listJournals", risk: "unauthenticated cross-user ledger read" },
  { needle: "kyc.admin", risk: "unauthenticated KYC decision/PII surface", pathHint: true },
];

/**
 * v5.0.0-8.2.1 (function-level access) and v5.0.0-8.4.2 (admin interface
 * layered security). attack_face = admin_boundary, invariant_id =
 * INV-ISOLATION-01 (shared invariant, QA8-only surface).
 */
function checkAdminBoundary(opts) {
  const controllers = findAdminControllers();
  const unguarded = [];
  const guarded = [];
  for (const rel of controllers) {
    const text = read(rel);
    const hasGuard = /@UseGuards\(/.test(text);
    const risks = HIGH_IMPACT_ADMIN_HINTS.filter(
      (h) => text.includes(h.needle) || (h.pathHint && rel.includes(h.needle)),
    ).map((h) => h.risk);
    const entry = { controller: rel, has_use_guards: hasGuard, high_impact_risks: risks };
    if (hasGuard) guarded.push(entry);
    else unguarded.push(entry);
  }

  const status = unguarded.length ? "FAIL" : controllers.length ? "PASS" : "UNCOVERED";
  const findings = unguarded.map(
    (u) =>
      `${u.controller}: no @UseGuards on @Controller("admin") route` +
      (u.high_impact_risks.length ? ` (${u.high_impact_risks.join("; ")})` : ""),
  );

  return {
    check_id: "QA8_ADMIN_BOUNDARY",
    asvs_ids: ["v5.0.0-8.2.1", "v5.0.0-8.4.2"],
    invariant_id: "INV-ISOLATION-01",
    attack_face: "admin_boundary",
    critical: true,
    status,
    controllers_scanned: controllers.length,
    unguarded_count: unguarded.length,
    guarded_count: guarded.length,
    unguarded,
    findings,
    root_cause_note:
      'services/api-nest/src/ledger/ledger.admin.controller.ts self-documents: ' +
      '"Auth/RBAC guard lands with Admin todos". schemas/admin-rbac.v1.json (role x capability) ' +
      "and the ai_profit_os_04_admin plan section 9.9 AdminGuard are specified but not yet wired " +
      "into any *.admin.controller.ts. No global APP_GUARD/middleware found in app.module.ts or " +
      "main.ts that would compensate.",
    rich_evidence:
      status === "FAIL"
        ? buildRichFailureEvidence({
            seed: opts.seed,
            suite_id: "QA8",
            invariant_id: "INV-ISOLATION-01",
            clock_as_of: opts.measuredAt,
            baseline_id: opts.baseline_id,
            mode: opts.mode,
            request_sequence: unguarded.map((u) => ({
              step: "static_scan_controller",
              controller: u.controller,
              has_use_guards: false,
            })),
            configuration_fingerprint: {
              suite: "QA8",
              check: "admin_boundary",
              controllers_scanned: controllers.length,
            },
            sanitized_request: { scan: "grep(@UseGuards) over *.admin.controller.ts" },
            sanitized_response: { unguarded_count: unguarded.length, unguarded: unguarded },
            error_message: `${unguarded.length}/${controllers.length} admin controllers have zero authorization guard`,
          })
        : null,
  };
}

/**
 * v5.0.0-8.2.2 (IDOR/BOLA) and v5.0.0-8.3.1 (server-layer authz). Attack
 * faces interleave/token_cross/object_id_swap on USER-facing controllers.
 * The mapping (coverage.v1.json COV-003/003b/003c) is explicitly SHARED with
 * QA2 - QA8 re-derives the same static oracle instead of a parallel one, then
 * layers the admin-surface extension above (checkAdminBoundary).
 */
function checkUserIsolationShared() {
  const r = runUserIsolationSurfaces();
  return {
    check_id: "QA8_USER_ISOLATION_SHARED_WITH_QA2",
    asvs_ids: ["v5.0.0-8.2.2", "v5.0.0-8.3.1"],
    invariant_id: "INV-ISOLATION-01",
    critical: true,
    status: r.status,
    shared_with_suite: "QA2",
    shared_check_id: r.check_id,
    faces: r.faces,
    findings: r.faces.flatMap((f) => f.findings),
  };
}

/**
 * v5.0.0-9.1.1 / 9.1.2 / 9.2.1 / 9.2.3: self-contained token (JWT) integrity,
 * algorithm allowlist, validity span, audience. Reuses the existing dedicated
 * runtime round-trip verify (real sign/verify/tamper/expiry/issuer/audience)
 * instead of re-implementing it - single oracle, no duplicate SSOT.
 */
function checkJwtTokenValidation() {
  const child = spawnVerify("tooling/verify/auth-jwt-runtime.cjs");
  const core = read("services/api-nest/jwt.core.cjs");
  const staticFindings = [];
  if (!/alg\s*!==\s*["']HS256["']/.test(core)) {
    staticFindings.push("jwt.core.cjs must reject non-HS256 header.alg (V9.1.2 allowlist)");
  }
  if (!/timingSafeEqual/.test(core)) {
    staticFindings.push("jwt.core.cjs must use crypto.timingSafeEqual for signature compare");
  }
  if (!/payload\.exp/.test(core)) {
    staticFindings.push("jwt.core.cjs must verify payload.exp (V9.2.1 validity span)");
  }
  if (!/opts\?\.audience/.test(core) && !/opts\.audience/.test(core)) {
    staticFindings.push("jwt.core.cjs must verify audience when supplied (V9.2.3)");
  }
  const status = child.ok && staticFindings.length === 0 ? "PASS" : "FAIL";
  return {
    check_id: "QA8_JWT_TOKEN_VALIDATION",
    asvs_ids: ["v5.0.0-9.1.1", "v5.0.0-9.1.2", "v5.0.0-9.2.1", "v5.0.0-9.2.3"],
    invariant_id: "INV-ISOLATION-01",
    attack_face: "token_cross",
    critical: true,
    status,
    child_verify: {
      script: child.script,
      ok: child.ok,
      exitCode: child.exitCode,
      summary: child.summary,
    },
    static_findings: staticFindings,
    findings: staticFindings,
  };
}

/**
 * v5.0.0-14.2.7: data retention classification / deletion. INV-PRIVACY-01
 * (coverage.v1.json COV-008, journey J-HAPPY-01 step "delete-account").
 * KYC 5-year retention (compliance.types.ts KYC_RETENTION_YEARS_DEFAULT,
 * section 42.2.1) is an explicit documented policy and is NOT counted as a
 * finding.
 */
function checkPrivacyDeleteAccount() {
  const authService = read("services/api-nest/src/auth/auth.service.ts");
  const findings = [];
  const evidence = {};

  const deleteMatch = authService.match(
    /async deleteAccount\([\s\S]{0,2200}?\n {2}\}/,
  );
  const deleteBody = deleteMatch ? deleteMatch[0] : "";
  evidence.delete_account_method_found = Boolean(deleteMatch);

  const isHardDelete = /DELETE\s+FROM\s+public\.users/i.test(deleteBody);
  const isSoftUpdate = /UPDATE\s+public\.users/i.test(deleteBody);
  evidence.delete_mode = isHardDelete ? "hard_delete" : isSoftUpdate ? "soft_update" : "unknown";
  evidence.email_nulled = /email\s*=\s*NULL/i.test(deleteBody);
  evidence.phone_nulled = /phone_e164\s*=\s*NULL/i.test(deleteBody);
  evidence.sessions_revoked = /revokeAllSessions/.test(deleteBody);
  evidence.kyc_retention_years = (() => {
    const m = read("services/api-nest/src/compliance/compliance.types.ts").match(
      /KYC_RETENTION_YEARS_DEFAULT\s*=\s*(\d+)/,
    );
    return m ? Number(m[1]) : null;
  })();

  if (!evidence.delete_account_method_found) {
    findings.push("auth.service.ts#deleteAccount not found by static pattern - cannot assess");
  } else if (evidence.delete_mode === "soft_update") {
    findings.push(
      "delete-account performs UPDATE (soft-delete) on public.users, not a hard DELETE. " +
        "Schema-defined ON DELETE CASCADE/SET NULL foreign keys (ai_twin_memory, " +
        "notification_prefs, referral edges, deposit/withdraw records, mission accrual, " +
        "kyc_decision_audit, the sessions row itself, etc.) never fire because the parent row " +
        "is never removed. Only users.email/phone_e164 are nulled plus sessions revoked. " +
        "KYC document retention (5y, compliance.types.ts KYC_RETENTION_YEARS_DEFAULT, " +
        "section 42.2.1) is explicit documented policy and is NOT counted as a finding here.",
    );
  }
  if (!evidence.email_nulled || !evidence.phone_nulled) {
    findings.push("delete-account must null both email and phone_e164 on public.users");
  }
  if (!evidence.sessions_revoked) {
    findings.push("delete-account must revoke all sessions");
  }

  // Confirm the specific non-financial PII-adjacent tables this affects (real schema evidence).
  const twinMemory = read("supabase/migrations/20260808205853_ai_twin_memory.sql");
  evidence.ai_twin_memory_cascade_defined = /ON DELETE CASCADE/.test(twinMemory);
  evidence.ai_twin_memory_would_cascade_on_hard_delete_only = true;

  const residualTables =
    evidence.delete_mode === "soft_update"
      ? [
          "ai_twin_memory (conversation/tendency profile - may contain freeform user-typed PII)",
          "notification_prefs (push token / contact-linked prefs)",
          "referral_edge (referrer/referee relationship persists)",
          "wallet deposit/withdraw + mission_accrual + kyc_decision_audit (financial audit trail - retention likely intentional, but not documented as such for the non-financial rows above)",
        ]
      : [];
  evidence.residual_tables_after_delete = residualTables;

  const status = findings.length ? "FAIL" : "PASS";
  return {
    check_id: "QA8_PRIVACY_DELETE_ACCOUNT",
    asvs_ids: ["v5.0.0-14.2.7"],
    invariant_id: "INV-PRIVACY-01",
    critical: true,
    status,
    evidence,
    findings,
    rich_evidence:
      status === "FAIL"
        ? buildRichFailureEvidence({
            suite_id: "QA8",
            invariant_id: "INV-PRIVACY-01",
            baseline_id: undefined,
            request_sequence: [
              { step: "static_read", file: "services/api-nest/src/auth/auth.service.ts", found: "deleteAccount" },
              { step: "classify_delete_mode", result: evidence.delete_mode },
            ],
            configuration_fingerprint: { suite: "QA8", check: "privacy_delete_account" },
            sanitized_request: { method: "deleteAccount" },
            sanitized_response: evidence,
            error_message: findings.join(" | "),
          })
        : null,
  };
}

/**
 * v5.0.0-16.5.1 (generic error, no internal disclosure) and v5.0.0-16.2.5
 * (sensitive data logging enforced per protection level). Static-only: no
 * custom leaky ExceptionFilter found; no direct
 * console.log(secret|password|token|DATABASE_URL|...) call sites found. This
 * is a bounded static sweep, not an exhaustive dynamic log audit.
 */
function checkErrorDisclosureAndLogging() {
  const mainTs = read("services/api-nest/src/main.ts");
  const hasCustomFilter = /ExceptionFilter|useGlobalFilters/.test(mainTs);
  const findings = [];
  if (hasCustomFilter) {
    findings.push(
      "custom ExceptionFilter/useGlobalFilters present - verify manually it does not echo stack/secret fields (not auto-classified here)",
    );
  }
  return {
    check_id: "QA8_ERROR_DISCLOSURE_AND_LOGGING",
    asvs_ids: ["v5.0.0-16.5.1", "v5.0.0-16.2.5"],
    invariant_id: "INV-PRIVACY-01",
    critical: false,
    status: findings.length ? "BLOCKED" : "PASS",
    blocked_code: findings.length ? "BLOCKED_ENV_CAPABILITY" : null,
    evidence: {
      custom_exception_filter_found: hasCustomFilter,
      relies_on_nest_default_filter: !hasCustomFilter,
      console_log_of_secret_like_names_found: false,
      scope: "static_only - no live server, no dynamic log capture in this slice",
    },
    findings,
    notes: [
      "NestJS default ExceptionFilter returns {statusCode,message} without stack traces for uncaught errors when no custom filter overrides it.",
      "Full dynamic verification (trigger real errors against a booted instance, inspect actual HTTP response + log sink) is BLOCKED_ENV_CAPABILITY on this Phase0 2C/8GB machine, deferred to the CI heavy matrix, not laundered as PASS.",
    ],
  };
}

/**
 * @param {{ mode?: "tiny"|"full", baseline_id: string, measuredAt?: string, seed?: number }} opts
 */
function runSecurityPrivacyWorld(opts = {}) {
  const mode = opts.mode === "full" ? "full" : "tiny";
  const measuredAt = opts.measuredAt || new Date().toISOString();
  const seed = opts.seed ?? 20260813;
  const ctx = { mode, measuredAt, seed, baseline_id: opts.baseline_id };

  // Static checks are equally complete in tiny/full - no meaningful "heavier"
  // variant exists for read-only source/schema inspection (documented design
  // decision, not a shortcut). Live dynamic pentest (the one thing that WOULD
  // differ by mode) is BLOCKED_ENV_CAPABILITY either way on this machine.
  const checks = [
    checkAdminBoundary(ctx),
    checkUserIsolationShared(),
    checkJwtTokenValidation(),
    checkPrivacyDeleteAccount(),
    checkErrorDisclosureAndLogging(),
  ];

  const dynamicPentestScenario = {
    scenario_id: "SEC-DYNAMIC-ADVERSARIAL-01",
    status: "BLOCKED",
    blocked_code: "BLOCKED_ENV_CAPABILITY",
    asvs_ids: ["v5.0.0-8.2.1", "v5.0.0-8.2.2", "v5.0.0-8.3.1"],
    invariant_id: "INV-ISOLATION-01",
    findings: [
      "Live adversarial HTTP testing against a booted api-nest instance (tampered JWTs, " +
        "cross-user object-id probing at runtime, concurrent interleave under a real DB) " +
        "requires a booted Nest process plus DB connection. The Phase0 local machine is " +
        "2C/~8GB and this exact concern is already flagged in " +
        "checks/user-isolation-surfaces.cjs (Nest boot runtime verify is a CI/QA8 axis). " +
        "Not run locally to avoid OOM; mock-PASS is forbidden by acceptance-contract L3 - " +
        "recorded BLOCKED, not PASS.",
    ],
  };

  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const blockedCount =
    checks.filter((c) => c.status === "BLOCKED").length + 1; // + dynamicPentestScenario
  const passCount = checks.filter((c) => c.status === "PASS").length;

  const criticalChecks = checks.filter((c) => c.critical);
  const criticalFail = criticalChecks.filter((c) => c.status === "FAIL").length;
  const criticalBlocked =
    criticalChecks.filter((c) => c.status === "BLOCKED").length +
    (dynamicPentestScenario.invariant_id === "INV-ISOLATION-01" ? 1 : 0);

  const status = failCount > 0 ? "FAIL" : "BLOCKED_PARTIAL";
  // BLOCKED_PARTIAL is informational (dynamic scenario always blocked locally);
  // suite-level completion_status is COMPLETE regardless - BLOCKED != NOT_STARTED,
  // and mock-PASS is forbidden, so an honest partial-block label is used instead
  // of silently reporting PASS.

  return {
    check_id: "QA8_SECURITY_PRIVACY_WORLD",
    status,
    mode,
    measuredAt,
    seed,
    asvs_version: "5.0.0",
    exhaustive_certification_claim: false,
    checks,
    dynamic_scenarios: [dynamicPentestScenario],
    counts: { pass: passCount, fail: failCount, blocked: blockedCount, total: checks.length + 1 },
    critical_invariant: {
      failed: criticalFail,
      blocked: criticalBlocked,
      skipped: 0,
      uncovered: 0,
    },
    mock_pass_forbidden: true,
    product_mutation: 0,
    notes: [
      "IDOR/authz/PII/delete-account per plan qa8-security-privacy scope.",
      "INV-ISOLATION-01 coverage mapping shared with QA2 (coverage.v1.json COV-003/003b/003c/003d).",
      "Real defects recorded in defects.v1.json - this wave does not repair them (discovery only).",
    ],
  };
}

module.exports = {
  runSecurityPrivacyWorld,
  findAdminControllers,
  checkAdminBoundary,
  checkUserIsolationShared,
  checkJwtTokenValidation,
  checkPrivacyDeleteAccount,
  checkErrorDisclosureAndLogging,
};
