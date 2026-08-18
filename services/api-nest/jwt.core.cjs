/**
 * First-party JWT (HS256) sign/verify — Infra §51.9 · ADR-006
 * Zero external deps (Node crypto only) · Nest JWT SoT · Supabase Auth FORBIDDEN
 *
 * Lives OUTSIDE src/ (sibling to dist/) so the same relative path resolves
 * from both `src/**​/*.ts` (dev) and `dist/**​/*.js` (build) — mirrors the
 * services/engine-rust/settlement_rule.cjs cross-boundary SSOT pattern.
 *
 * Required by: tooling/verify/auth-jwt-runtime.cjs (real sign/verify/tamper/
 * expiry/issuer/audience round-trip — no shape-only checks).
 */
"use strict";

const crypto = require("crypto");

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlJson(obj) {
  return base64url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function base64urlDecode(str) {
  if (typeof str !== "string" || !/^[A-Za-z0-9_-]*$/.test(str)) {
    throw new Error("malformed base64url segment");
  }
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function assertSecret(secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("JWT secret must be a string of >=32 chars (JWT_USER_SECRET/JWT_ADMIN_SECRET)");
  }
}

/**
 * @param {Record<string, unknown>} payload custom claims (e.g. { sub: userId })
 * @param {string} secret HS256 secret (>=32 chars) — never hardcode, env only
 * @param {{issuer:string, audience:string, expiresInSec:number, nowMs?:number, jti?:string}} opts
 * @returns {string} compact JWS (header.payload.signature)
 */
function sign(payload, secret, opts) {
  assertSecret(secret);
  if (!opts || typeof opts.issuer !== "string" || typeof opts.audience !== "string") {
    throw new Error("issuer and audience are required");
  }
  if (!Number.isFinite(opts.expiresInSec) || opts.expiresInSec <= 0) {
    throw new Error("expiresInSec must be a positive number");
  }
  const nowSec = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const fullPayload = {
    ...payload,
    iss: opts.issuer,
    aud: opts.audience,
    iat: nowSec,
    exp: nowSec + Math.floor(opts.expiresInSec),
    jti: opts.jti ?? crypto.randomUUID(),
  };
  const data = `${base64urlJson(header)}.${base64urlJson(fullPayload)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${base64url(sig)}`;
}

/**
 * @param {string} token compact JWS
 * @param {string} secret HS256 secret (>=32 chars)
 * @param {{issuer?:string, audience?:string, nowMs?:number}} [opts]
 * @returns {Record<string, unknown>} verified payload
 * @throws on any malformed/tampered/expired/mismatched-claim token (fail-closed)
 */
function verify(token, secret, opts) {
  assertSecret(secret);
  if (typeof token !== "string" || !token) {
    throw new Error("token required");
  }
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [headB64, bodyB64, sigB64] = parts;
  const data = `${headB64}.${bodyB64}`;
  const expectedSig = crypto.createHmac("sha256", secret).update(data).digest();

  let providedSig;
  try {
    providedSig = base64urlDecode(sigB64);
  } catch {
    throw new Error("malformed signature");
  }
  if (
    providedSig.length !== expectedSig.length ||
    !crypto.timingSafeEqual(providedSig, expectedSig)
  ) {
    throw new Error("invalid signature");
  }

  let header;
  let payload;
  try {
    header = JSON.parse(base64urlDecode(headB64).toString("utf8"));
    payload = JSON.parse(base64urlDecode(bodyB64).toString("utf8"));
  } catch {
    throw new Error("malformed payload");
  }
  if (!header || header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("unsupported header");
  }

  const nowSec = Math.floor((opts?.nowMs ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp < nowSec) {
    throw new Error("token expired");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 5) {
    throw new Error("token not yet valid");
  }
  if (opts?.issuer && payload.iss !== opts.issuer) {
    throw new Error("issuer mismatch");
  }
  if (opts?.audience && payload.aud !== opts.audience) {
    throw new Error("audience mismatch");
  }
  if (typeof payload.sub !== "string" || !payload.sub) {
    throw new Error("sub claim required");
  }
  return payload;
}

module.exports = { sign, verify, base64url, base64urlDecode };
