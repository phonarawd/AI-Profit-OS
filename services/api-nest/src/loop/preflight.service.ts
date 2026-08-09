/**
 * UI §51.24.2 / Engine §48.13.1 P0 — PreCTA completion token
 * HMAC issued only via Nest POST preflight · missing → 412 PREFLIGHT_REQUIRED
 * Deeplink / client forge bypass FORBIDDEN (L7 · L19)
 */

import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { loadPhase0Env } from "../config/phase0.env";

const TTL_SEC = 300;
const PREFIX = "pf1";

@Injectable()
export class PreflightService {
  issue(userId: string, opportunityId: string): {
    preflightToken: string;
    expiresAt: string;
    mayStopRequired: true;
  } {
    this.assertIds(userId, opportunityId);
    const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
    const nonce = randomBytes(8).toString("hex");
    const payload = `${userId}.${opportunityId}.${exp}.${nonce}`;
    const sig = this.sign(payload);
    return {
      preflightToken: `${PREFIX}.${payload}.${sig}`,
      expiresAt: new Date(exp * 1000).toISOString(),
      mayStopRequired: true as const,
    };
  }

  /**
   * P0 — throw 412 PREFLIGHT_REQUIRED when token missing/invalid/expired/mismatch
   */
  assertValid(
    userId: string,
    opportunityId: string,
    token: string | undefined | null,
  ): void {
    if (!token || typeof token !== "string") {
      this.throwRequired();
    }
    const parts = String(token).split(".");
    if (parts.length !== 6 || parts[0] !== PREFIX) {
      this.throwRequired();
    }
    const [, uid, oppId, expStr, nonce, sig] = parts;
    if (uid !== userId || oppId !== opportunityId) {
      this.throwRequired();
    }
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
      this.throwRequired();
    }
    if (!nonce || nonce.length < 8) {
      this.throwRequired();
    }
    const payload = `${uid}.${oppId}.${expStr}.${nonce}`;
    const expected = this.sign(payload);
    if (!this.safeEq(sig, expected)) {
      this.throwRequired();
    }
  }

  private sign(payload: string): string {
    const secret =
      loadPhase0Env().jwtUserSecret || "phase0-dev-preflight-hmac";
    return createHmac("sha256", secret).update(payload).digest("hex");
  }

  private safeEq(a: string, b: string): boolean {
    try {
      const ba = Buffer.from(a, "utf8");
      const bb = Buffer.from(b, "utf8");
      if (ba.length !== bb.length) return false;
      return timingSafeEqual(ba, bb);
    } catch {
      return false;
    }
  }

  private assertIds(userId: string, opportunityId: string) {
    if (!userId || !opportunityId) {
      throw new BadRequestException("userId and opportunityId required");
    }
  }

  private throwRequired(): never {
    throw new HttpException(
      {
        code: "PREFLIGHT_REQUIRED",
        toastCode: "PREFLIGHT_REQUIRED",
        statusCode: 412,
      },
      HttpStatus.PRECONDITION_FAILED,
    );
  }
}
