/**
 * CI/acceptance 합성 신원 · JWT 유틸 (harness only).
 * 실사용자/운영자 자격증명 · 커밋된 정적 시크릿 · 제품 JWT 검증 약화 금지.
 */
"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

const USER_JWT_ISSUER = "ai-profit-os-nest";
const USER_JWT_AUDIENCE = "peotteok-user";
const ADMIN_JWT_ISSUER = "ai-profit-os-admin";
const ADMIN_JWT_AUDIENCE = "aipo-ops";

const SYNTH_USER_A = "11111111-1111-4111-8111-111111111111";
const SYNTH_USER_B = "22222222-2222-4222-8222-222222222222";
const SYNTH_USER_ORDINARY = "33333333-3333-4333-8333-333333333333";
const SYNTH_ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const IDENTITY_CLASSES = Object.freeze([
  "user_a",
  "user_b",
  "ordinary_user",
  "admin",
  "none",
  "malformed",
  "invalid_signature",
  "expired",
  "alg_none",
  "wrong_issuer",
  "wrong_audience",
  "role_escalation_user_as_admin",
]);

function loadJwtCore() {
  return require(path.join(ROOT, "services/api-nest/jwt.core.cjs"));
}

function generateEphemeralSecret(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function createEphemeralSecrets() {
  return {
    jwtUserSecret: generateEphemeralSecret(32),
    jwtAdminSecret: generateEphemeralSecret(32),
    llmApiKey: `ci-ephemeral-${generateEphemeralSecret(16)}`,
    source: "ci_ephemeral_runtime",
    committed: false,
  };
}

function mintUserToken(secret, userId, opts = {}) {
  const jwtCore = loadJwtCore();
  return jwtCore.sign({ sub: userId }, secret, {
    issuer: opts.issuer || USER_JWT_ISSUER,
    audience: opts.audience || USER_JWT_AUDIENCE,
    expiresInSec: opts.expiresInSec || 60 * 60,
    nowMs: opts.nowMs,
    jti: opts.jti,
  });
}

function mintAdminToken(secret, adminId, opts = {}) {
  const jwtCore = loadJwtCore();
  return jwtCore.sign({ sub: adminId, role: opts.role || "admin" }, secret, {
    issuer: opts.issuer || ADMIN_JWT_ISSUER,
    audience: opts.audience || ADMIN_JWT_AUDIENCE,
    expiresInSec: opts.expiresInSec || 60 * 60,
    nowMs: opts.nowMs,
    jti: opts.jti,
  });
}

function forgeAlgNone(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.`;
}

function tamperSignature(token) {
  const parts = String(token).split(".");
  if (parts.length !== 3) return `${token}.dead`;
  const sig = parts[2];
  const flipped = sig.slice(0, -2) + (sig.slice(-2) === "AA" ? "BB" : "AA");
  return `${parts[0]}.${parts[1]}.${flipped}`;
}

/**
 * @param {{ jwtUserSecret: string, jwtAdminSecret: string }} secrets
 */
function buildIdentityMatrix(secrets) {
  const userA = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A);
  const userB = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_B);
  const ordinary = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_ORDINARY);
  const admin = mintAdminToken(secrets.jwtAdminSecret, SYNTH_ADMIN);
  const expired = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A, {
    expiresInSec: 1,
    nowMs: Date.now() - 120_000,
  });
  const wrongIssuer = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A, {
    issuer: "someone-else-issuer",
  });
  const wrongAudience = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A, {
    audience: "wrong-audience",
  });
  const roleEscalation = mintUserToken(secrets.jwtUserSecret, SYNTH_USER_A);
  const algNone = forgeAlgNone({
    sub: SYNTH_ADMIN,
    iss: ADMIN_JWT_ISSUER,
    aud: ADMIN_JWT_AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });

  return {
    user_a: {
      class: "user_a",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${userA}`,
    },
    user_b: {
      class: "user_b",
      userId: SYNTH_USER_B,
      authorization: `Bearer ${userB}`,
    },
    ordinary_user: {
      class: "ordinary_user",
      userId: SYNTH_USER_ORDINARY,
      authorization: `Bearer ${ordinary}`,
    },
    admin: {
      class: "admin",
      userId: SYNTH_ADMIN,
      authorization: `Bearer ${admin}`,
    },
    none: { class: "none", userId: null, authorization: null },
    malformed: {
      class: "malformed",
      userId: SYNTH_USER_A,
      authorization: "Bearer not-a-jwt",
    },
    malformed_header: {
      class: "malformed",
      userId: SYNTH_USER_A,
      authorization: "Token abc",
    },
    invalid_signature: {
      class: "invalid_signature",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${tamperSignature(userA)}`,
    },
    expired: {
      class: "expired",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${expired}`,
    },
    alg_none: {
      class: "alg_none",
      userId: SYNTH_ADMIN,
      authorization: `Bearer ${algNone}`,
    },
    wrong_issuer: {
      class: "wrong_issuer",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${wrongIssuer}`,
    },
    wrong_audience: {
      class: "wrong_audience",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${wrongAudience}`,
    },
    role_escalation_user_as_admin: {
      class: "role_escalation_user_as_admin",
      userId: SYNTH_USER_A,
      authorization: `Bearer ${roleEscalation}`,
      note: "user issuer/audience presented against admin surface",
    },
  };
}

function redactAuthorization(value) {
  if (!value) return null;
  const raw = String(value).replace(/^Bearer\s+/i, "");
  if (!raw) return "[redacted]";
  const digest = crypto.createHash("sha256").update(raw, "utf8").digest("hex").slice(0, 16);
  return `Bearer sha256:${digest}`;
}

function assertNoCommittedStaticSecret(sourceText) {
  const banned = [
    /JWT_USER_SECRET\s*=\s*['"][^'"]{16,}['"]/,
    /JWT_ADMIN_SECRET\s*=\s*['"][^'"]{16,}['"]/,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\./,
  ];
  for (const re of banned) {
    if (re.test(sourceText)) {
      throw new Error("synthetic-identity source must not embed live JWT/secret literals");
    }
  }
  return true;
}

module.exports = {
  USER_JWT_ISSUER,
  USER_JWT_AUDIENCE,
  ADMIN_JWT_ISSUER,
  ADMIN_JWT_AUDIENCE,
  SYNTH_USER_A,
  SYNTH_USER_B,
  SYNTH_USER_ORDINARY,
  SYNTH_ADMIN,
  IDENTITY_CLASSES,
  generateEphemeralSecret,
  createEphemeralSecrets,
  mintUserToken,
  mintAdminToken,
  forgeAlgNone,
  tamperSignature,
  buildIdentityMatrix,
  redactAuthorization,
  assertNoCommittedStaticSecret,
  loadJwtCore,
};
