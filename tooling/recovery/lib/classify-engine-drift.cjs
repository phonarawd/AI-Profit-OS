/**
 * Engine drift 공식 classify().
 * 분류 가능 ≠ 변경 안전성 승인 ≠ QA 완료 ≠ 플랫폼 운영 준비.
 * 디렉터리 광역 매처로 membership/opportunities 전체를 자동 승인하지 않는다.
 */
"use strict";

const OPERATOR_MEMBERSHIP_PATHS = new Set([
  "services/api-nest/src/membership/auto-downgrade.core.cjs",
  "services/api-nest/src/membership/bonus-match-grant.core.cjs",
  "services/api-nest/src/membership/bulk-operator-job.core.cjs",
  "services/api-nest/src/membership/grade-daily-policy.core.cjs",
  "services/api-nest/src/membership/member-360.core.cjs",
  "services/api-nest/src/membership/member-daily-cap.core.cjs",
  "services/api-nest/src/membership/member-daily-cap.http.cjs",
  "services/api-nest/src/membership/member-daily-cap.isolation.cjs",
  "services/api-nest/src/membership/operator-control.persist.cjs",
  "services/api-nest/src/membership/operator-control.provider.cjs",
  "services/api-nest/src/membership/operator-control.store.cjs",
  "services/api-nest/src/membership/operator-quota-grade.admin-http.cjs",
  "services/api-nest/src/membership/operator-quota-grade.isolation.cjs",
  "services/api-nest/src/membership/presentation-profile.core.cjs",
  "services/api-nest/src/membership/support-conversation.contract.cjs",
  "services/api-nest/src/membership/membership.admin.controller.ts",
  "services/api-nest/src/membership/membership.admin.service.ts",
  "services/api-nest/src/membership/membership.mi.ts",
  "services/api-nest/src/membership/membership.routes.ts",
  "services/api-nest/src/membership/membership.runtime.service.ts",
  "services/api-nest/src/membership/membership.types.ts",
  "services/api-nest/src/membership/membership.user.controller.ts",
  "services/api-nest/src/membership/membership.events.ts",
  "services/api-nest/src/membership/admin-member-directory.admin-http.cjs",
  "services/api-nest/src/membership/admin-member-directory.core.cjs",
  "services/api-nest/src/membership/admin-member-directory.isolation.cjs",
  "services/api-nest/src/membership/admin-member-directory.persist.cjs",
  "services/api-nest/src/opportunities/participate.service.ts",
]);

const ADMIN_STAFF_LOGIN_PATHS = new Set([
  "services/api-nest/admin-staff-login.core.cjs",
  "services/api-nest/admin-staff-login.isolation.cjs",
  "services/api-nest/admin-staff-login.persist.cjs",
  "services/api-nest/admin-staff-login.persist.isolation.cjs",
]);

const OPERATOR_MALL_PATHS = new Set([
  "services/api-nest/src/opportunities/operator-mall-ledger-posting.cjs",
  "services/api-nest/src/opportunities/operator-mall-ledger-posting.isolation.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.admin-http.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.admin.service.ts",
  "services/api-nest/src/opportunities/operator-mall-product.core.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.isolation.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.persist.cjs",
  "services/api-nest/src/opportunities/operator-mall-product.persist.isolation.cjs",
  "services/api-nest/src/opportunities/opportunities.user.service.ts",
  "services/api-nest/src/opportunities/opportunities-user-operator-only.isolation.cjs",
]);

const EXTRA_MODULE_WIRING_PATHS = new Set([
  "services/api-nest/isolated-qa-pg.cjs",
  "services/api-nest/src/opportunities/opportunities.admin.controller.ts",
  "services/api-nest/src/opportunities/opportunities.routes.ts",
]);

const TRADE_EXECUTION_LEDGER_PATHS = new Set([
  "services/api-nest/src/trades/trades.execution.service.ts",
]);

const CATALOG_EXTERNAL_WRITE_PATHS = new Set([
  "services/api-nest/catalog-external-write.core.cjs",
  "services/api-nest/src/adapters/adapters.admin.service.ts",
  "services/api-nest/src/opportunities/catalog-external-write.admin-writers.isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.guard.ts",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-http.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-http.selftest.ts",
  "services/api-nest/src/opportunities/catalog-external-write.ingest-isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.pricing-writers.isolation.cjs",
  "services/api-nest/src/opportunities/catalog-external-write.runtime.test.ts",
  "services/api-nest/src/opportunities/catalog-external-write.ts-hook.cjs",
  "services/api-nest/src/opportunities/catalog-runtime-seed.service.ts",
  "services/api-nest/src/opportunities/opportunities.admin.service.ts",
  "services/api-nest/src/opportunities/opportunities.module.ts",
  "services/api-nest/src/opportunities/opportunity-reprice.service.ts",
  "services/api-nest/src/price-override/price-override.service.ts",
]);

const CLASSIFY_IS_NOT = Object.freeze({
  change_safety_approved: false,
  qa_complete: false,
  platform_ops_ready: false,
  human_po_ack: false,
});

function classify(rel) {
  const p = String(rel || "").replace(/\\/g, "/");
  if (p.includes("/migrations/") || p.endsWith(".sql")) {
    return {
      category: "DB_MIGRATION",
      reason: "Schema/ledger change after Engine baseline. Formal rebase must re-prove money invariants.",
      security_impact: "HIGH",
      schema_impact: true,
      prompt_impact: false,
      required_rerun: ["QA0", "QA3", "QA4", "QA5", "QA8"],
    };
  }
  if (p.startsWith("schemas/")) {
    return {
      category: "CONTRACT_SCHEMA",
      reason: "Public contract drift. Engine consumers must re-bind after rebase.",
      security_impact: "MEDIUM",
      schema_impact: true,
      prompt_impact: false,
      required_rerun: ["QA0", "QA3", "QA4"],
    };
  }
  if (
    p.includes("identity-proof") ||
    p.includes("magic-link") ||
    p.includes("oauth-identity") ||
    p.includes("webauthn") ||
    p.includes("passkey") ||
    p.includes("auth.controller") ||
    p.includes("auth.service") ||
    p.includes("auth.module") ||
    p.includes("auth.stage") ||
    p.includes("jwt-auth.guard") ||
    p.includes("jwt-revocation")
  ) {
    return {
      category: "AUTH_SECURITY",
      reason: "Identity proof / session mint path changed. CSRF design stays; ACK waits rebase QA.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA1", "QA2", "QA8"],
    };
  }
  if (
    p.includes("admin-session") ||
    p.includes("admin-token") ||
    p.includes("admin.guard") ||
    p.includes("admin-csrf") ||
    p.includes("admin-capabilities") ||
    p.includes("bearer-header") ||
    p.includes("admin-audit") ||
    ADMIN_STAFF_LOGIN_PATHS.has(p)
  ) {
    return {
      category: "ADMIN_SESSION",
      reason: "Admin cookie/CSRF/capability surface. Double-submit cookie remains JS-readable by design.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA1", "QA2", "QA8"],
    };
  }
  if (
    p.includes("/wallet/") ||
    p.includes("tron-address") ||
    p.includes("deposit-") ||
    p.includes("withdraw-") ||
    p.includes("krw-deposit") ||
    p.includes("min-holding") ||
    p.includes("chain-sweep") ||
    p.includes("chain-watch") ||
    p.includes("resend-email.provider")
  ) {
    return {
      category: "MONEY_WALLET",
      reason: "Wallet/TRON/withdraw path. Synthetic HMAC derivation remains forbidden. Vault still external.",
      security_impact: "HIGH",
      schema_impact: p.includes("withdraw"),
      prompt_impact: false,
      required_rerun: ["QA3", "QA4", "QA5", "QA8"],
    };
  }
  if (
    TRADE_EXECUTION_LEDGER_PATHS.has(p) ||
    p.includes("idempotency") ||
    p.includes("/ledger/") ||
    p.includes("ledger-adjustment")
  ) {
    return {
      category: "LEDGER",
      reason: "Idempotency/ledger fingerprint drift. Money truth must be re-proven.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA3", "QA4", "QA8"],
    };
  }
  if (p.includes("referral")) {
    return {
      category: "REFERRAL",
      reason: "Referral code issuance/own-code path. Not a ledger writer.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA2", "QA8"],
    };
  }
  if (p.includes("ux-prefs")) {
    return {
      category: "UX_PREFS",
      reason: "User preference store. No money authority.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA2"],
    };
  }
  if (p.includes("health")) {
    return {
      category: "HEALTH",
      reason: "Public/admin health surface. No session mint.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0"],
    };
  }
  if (p.includes("/ai/") || p.includes("coach.") || p.includes("fact-tool")) {
    return {
      category: "AI_COACH",
      reason: "Coach/fact-tool mutation. Prompt/SSE contract must stay fail-closed; no fake ACK.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: true,
      required_rerun: ["QA6", "QA7", "QA9"],
    };
  }
  if (p.includes("adapters.ingest")) {
    return {
      category: "ADAPTER_INGEST",
      reason: "Ingest controller wiring. Marketplace truth, not wallet mutation.",
      security_impact: "MEDIUM",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA5", "QA8"],
    };
  }
  if (
    p.includes("app.module") ||
    p.includes("common.module") ||
    p.includes("wallet.module") ||
    p.includes("wallet/index.ts") ||
    p.includes("wallet.routes") ||
    p.includes("wallet.types") ||
    p.includes("wallet.events") ||
    p.includes("nest-provenance") ||
    p.includes("tsconfig.json") ||
    p.includes("admin-audit.core.cjs") ||
    EXTRA_MODULE_WIRING_PATHS.has(p)
  ) {
    return {
      category: "MODULE_WIRING",
      reason: "Module/export/tsconfig wiring for the above surfaces. No independent money writer.",
      security_impact: "LOW",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0", "QA2"],
    };
  }
  if (OPERATOR_MEMBERSHIP_PATHS.has(p)) {
    return {
      category: "OPERATOR_MEMBERSHIP",
      reason:
        "등급·하루 cap·보너스 매칭·operator-control persist/provider. 지갑 writer가 아니고 admin cookie 면도 아니다. 분류만이며 변경 안전성 승인·QA 완료가 아니다.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0", "QA1", "QA2", "QA8"],
    };
  }
  if (CATALOG_EXTERNAL_WRITE_PATHS.has(p)) {
    return {
      category: "CATALOG_EXTERNAL_WRITE",
      reason:
        "S1 운영자 행 보호·외부 카탈로그 쓰기 게이트. 분류만이며 변경 안전성 승인·QA 완료가 아니다.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0", "QA5", "QA8"],
    };
  }
  if (OPERATOR_MALL_PATHS.has(p)) {
    return {
      category: "OPERATOR_MALL",
      reason:
        "운영자 쇼핑몰 상품·원장 posting 연결. 분류만이며 지급 완료·QA 완료·운영 적용이 아니다.",
      security_impact: "HIGH",
      schema_impact: false,
      prompt_impact: false,
      required_rerun: ["QA0", "QA3", "QA8"],
    };
  }
  return {
    category: "UNCLASSIFIED",
    reason: "Path did not match a known Engine drift class.",
    security_impact: "UNKNOWN",
    schema_impact: "UNKNOWN",
    prompt_impact: "UNKNOWN",
    required_rerun: ["QA0", "QA1", "QA2", "QA3", "QA4", "QA5", "QA6", "QA7", "QA8", "QA9"],
  };
}

module.exports = {
  classify,
  OPERATOR_MEMBERSHIP_PATHS,
  CATALOG_EXTERNAL_WRITE_PATHS,
  ADMIN_STAFF_LOGIN_PATHS,
  OPERATOR_MALL_PATHS,
  EXTRA_MODULE_WIRING_PATHS,
  TRADE_EXECUTION_LEDGER_PATHS,
  CLASSIFY_IS_NOT,
};
