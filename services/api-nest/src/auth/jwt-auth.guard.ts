/**
 * Infra §51.9 · ADR-006 — Nest JWT verification guard (P0-1 fix).
 * Populates req.user from a real, cryptographically verified bearer token.
 * Zero constructor deps on purpose — usable via @UseGuards(JwtAuthGuard) in
 * any module without provider registration (Nest resolves it just-in-time).
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createRequire } from "node:module";
import { join } from "node:path";
import { loadPhase0Env } from "../config/phase0.env";
import { extractBearerToken } from "../common/bearer-header";
import {
  USER_JWT_AUDIENCE,
  USER_JWT_ISSUER,
  USER_SESSION_COOKIE_NAME,
} from "./auth.constants";

const req = createRequire(__filename);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwtCore = req(join(__dirname, "..", "..", "jwt.core.cjs")) as {
  verify: (
    token: string,
    secret: string,
    opts: { issuer?: string; audience?: string; nowMs?: number },
  ) => Record<string, unknown>;
};

export type SessionUser = {
  userId: string;
  sub: string;
  sessionId: string;
  /** ISO-8601 — decoded straight from the verified token's iat/exp claims */
  issuedAt: string;
  expiresAt: string;
};

type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
  user?: SessionUser;
};

/**
 * Apply via `@UseGuards(JwtAuthGuard)` on any session-protected controller.
 * Admin JWT issuer is explicitly rejected — Admin surfaces use a separate
 * guard (Admin domain 04), never this one (§40 issuer separation).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const httpReq = context.switchToHttp().getRequest<RequestWithUser>();
    const token =
      extractBearerToken(
        httpReq.headers?.authorization ?? httpReq.headers?.Authorization,
      ) ??
      httpReq.cookies?.[USER_SESSION_COOKIE_NAME] ??
      null;
    if (!token) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    const env = loadPhase0Env();
    if (!env.jwtUserSecret) {
      // Fail-closed — never fall back to a hardcoded/default secret.
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    let payload: Record<string, unknown>;
    try {
      payload = jwtCore.verify(token, env.jwtUserSecret, {
        issuer: USER_JWT_ISSUER,
        audience: USER_JWT_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    const userId = String(payload.sub ?? "");
    if (!userId) {
      throw new UnauthorizedException("AUTH_REQUIRED");
    }

    const iat = Number(payload.iat);
    const exp = Number(payload.exp);
    httpReq.user = {
      userId,
      sub: userId,
      sessionId: String(payload.jti ?? ""),
      issuedAt: Number.isFinite(iat)
        ? new Date(iat * 1000).toISOString()
        : new Date().toISOString(),
      expiresAt: Number.isFinite(exp)
        ? new Date(exp * 1000).toISOString()
        : new Date().toISOString(),
    };
    return true;
  }
}
