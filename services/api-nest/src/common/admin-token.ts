/**
 * Admin bearer-token verification (reusable platform primitive).
 *
 * Trust domains are distinct (ADR-006 · §40): a user JWT can never become admin
 * authority because the admin issuer, audience and signing secret all differ.
 *
 * Fail-closed: no secret, short secret, malformed token, wrong algorithm, wrong
 * issuer/audience, expired token and an empty `sub` all reject.
 */

import { createRequire } from "node:module";
import { join } from "node:path";
import { loadPhase0Env } from "../config/phase0.env";
import { ADMIN_JWT_AUDIENCE, ADMIN_JWT_ISSUER } from "../auth/auth.constants";
import { extractBearerToken } from "./bearer-header";

export { extractBearerToken };

const requireCjs = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = requireCjs(join(__dirname, "..", "..", "jwt.core.cjs")) as {
  verify: (
    token: string,
    secret: string,
    opts: { issuer?: string; audience?: string; nowMs?: number },
  ) => Record<string, unknown>;
};

/** Verified operator identity. `adminId` is the only audit-trustworthy operator id. */
export type AdminPrincipal = {
  adminId: string;
  role: string;
  tokenId: string;
  issuedAt: string;
  expiresAt: string;
};

export type AdminTokenFailure =
  | "ADMIN_AUTH_REQUIRED"
  | "ADMIN_AUTH_NOT_CONFIGURED"
  | "ADMIN_AUTH_INVALID";

export class AdminTokenError extends Error {
  constructor(readonly code: AdminTokenFailure) {
    super(code);
    this.name = "AdminTokenError";
  }
}

function isoFromEpochSeconds(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

/**
 * Authentication time stays REAL (`Date.now()` inside jwt.core.cjs) — the QA
 * domain Clock seam must never be able to resurrect an expired admin token.
 */
export function verifyAdminAccessToken(token: string): AdminPrincipal {
  const secret = loadPhase0Env().jwtAdminSecret;
  if (!secret) {
    // Never open admin routes because the deployment forgot the secret.
    throw new AdminTokenError("ADMIN_AUTH_NOT_CONFIGURED");
  }

  let payload: Record<string, unknown>;
  try {
    payload = jwtCore.verify(token, secret, {
      issuer: ADMIN_JWT_ISSUER,
      audience: ADMIN_JWT_AUDIENCE,
    });
  } catch {
    throw new AdminTokenError("ADMIN_AUTH_INVALID");
  }

  const adminId = typeof payload.sub === "string" ? payload.sub.trim() : "";
  if (!adminId) throw new AdminTokenError("ADMIN_AUTH_INVALID");

  const role = typeof payload.role === "string" ? payload.role.trim() : "";
  const issuedAt = isoFromEpochSeconds(payload.iat);
  const expiresAt = isoFromEpochSeconds(payload.exp);
  if (!issuedAt || !expiresAt) throw new AdminTokenError("ADMIN_AUTH_INVALID");

  return {
    adminId,
    role,
    tokenId: typeof payload.jti === "string" ? payload.jti : "",
    issuedAt,
    expiresAt,
  };
}

export function verifyAdminAuthorizationHeader(
  headerValue: unknown,
): AdminPrincipal {
  const token = extractBearerToken(headerValue);
  if (!token) throw new AdminTokenError("ADMIN_AUTH_REQUIRED");
  return verifyAdminAccessToken(token);
}
