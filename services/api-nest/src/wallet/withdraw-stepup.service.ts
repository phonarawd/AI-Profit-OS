/**
 * Money §43.6 — withdraw step-up: WebAuthn → Email OTP (Resend) → PIN → recovery.
 * Server stores verifiers/hashes only · rate-limited PIN · challenge TTL 60s.
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { loadPhase0Env } from "../config/phase0.env";
import { PostgresService } from "../db/postgres";
import { ResendEmailProvider } from "./resend-email.provider";
import {
  normalizeAppHost,
  originAllowed,
  WITHDRAW_STEP_UP_CODES,
  WITHDRAW_STEP_UP_PRIORITY,
  WITHDRAW_STEP_UP_TTL_SEC,
  type WithdrawStepUpMethod,
} from "./withdraw-stepup.policy";

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MIN = 15;
const SCRYPT_KEYLEN = 32;

type ChallengeRow = {
  id: string;
  user_id: string;
  method: WithdrawStepUpMethod;
  challenge_hash: string;
  origin: string;
  expires_at: Date;
  consumed_at: Date | null;
};

type PinRow = {
  user_id: string;
  pin_hash: string;
  must_reset: boolean;
  failed_attempts: number;
  locked_until: Date | null;
};

export type StepUpChallengeView = {
  challengeId: string;
  userId: string;
  method: WithdrawStepUpMethod;
  expiresAt: string;
  origin: string;
  rpId?: string;
  delivery?: "resend";
  priority: typeof WITHDRAW_STEP_UP_PRIORITY;
};

export type StepUpVerifyResult = {
  ok: true;
  stepUpToken: string;
  method: WithdrawStepUpMethod;
  expiresAt: string;
};

@Injectable()
export class WithdrawStepUpService {
  constructor(
    private readonly db: PostgresService,
    private readonly resend: ResendEmailProvider,
  ) {}

  /** Policy surface for clients / verify */
  policy() {
    return {
      owns: "Money §43.6",
      pwaOwns: "PWA §23.6 UX only",
      priority: WITHDRAW_STEP_UP_PRIORITY,
      ttlSec: WITHDRAW_STEP_UP_TTL_SEC,
      emailProvider: this.resend.provider,
      smsRequiredDay1: false,
    };
  }

  async createChallenge(input: {
    userId: string;
    method: WithdrawStepUpMethod;
    origin: string;
  }): Promise<StepUpChallengeView> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!WITHDRAW_STEP_UP_PRIORITY.includes(input.method)) {
      throw new BadRequestException("invalid step-up method");
    }
    if (input.method === "webauthn") {
      throw new ServiceUnavailableException({
        code: WITHDRAW_STEP_UP_CODES.WEBAUTHN_STEP_UP_NOT_READY,
        toastCode: WITHDRAW_STEP_UP_CODES.WEBAUTHN_STEP_UP_NOT_READY,
        statusCode: 503,
      });
    }
    const env = loadPhase0Env();
    if (!originAllowed(input.origin, env.appHost)) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.ORIGIN_REJECTED,
        toastCode: WITHDRAW_STEP_UP_CODES.ORIGIN_REJECTED,
        statusCode: 403,
      });
    }

    let verifiedEmail: string | null = null;
    if (input.method === "email_otp") {
      verifiedEmail = await this.getVerifiedEmail(input.userId);
      if (!verifiedEmail) {
        throw new ForbiddenException({
          code: WITHDRAW_STEP_UP_CODES.EMAIL_STEP_UP_VERIFICATION_REQUIRED,
          toastCode: WITHDRAW_STEP_UP_CODES.EMAIL_STEP_UP_VERIFICATION_REQUIRED,
          statusCode: 403,
        });
      }
    }

    if (input.method === "pin") {
      const pin = await this.getPinRow(input.userId);
      if (!pin || pin.must_reset) {
        throw new ForbiddenException({
          code: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
          toastCode: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
          statusCode: 403,
          message: "PIN_REQUIRED",
        });
      }
      this.assertPinNotLocked(pin);
    }

    const secret = this.makeSecret(input.method);
    const challengeHash = this.hashSecret(secret);
    const expiresAt = new Date(
      Date.now() + WITHDRAW_STEP_UP_TTL_SEC * 1000,
    );
    const origin = normalizeAppHost(input.origin);

    const ins = await this.db.query<ChallengeRow>(
      `INSERT INTO public.withdraw_stepup_challenges (
         user_id, method, challenge_hash, origin, expires_at
       ) VALUES ($1::uuid, $2, $3, $4, $5)
       RETURNING id, user_id, method, challenge_hash, origin, expires_at, consumed_at`,
      [input.userId, input.method, challengeHash, origin, expiresAt.toISOString()],
    );
    const row = ins.rows[0]!;

    if (input.method === "email_otp") {
      const sent = await this.resend.sendOtp({
        to: verifiedEmail!,
        code: secret,
        purpose: "withdraw_stepup",
      });
      if (!sent.ok) {
        throw new BadRequestException("email_otp_delivery_failed");
      }
    }

    const view: StepUpChallengeView = {
      challengeId: row.id,
      userId: row.user_id,
      method: row.method,
      expiresAt: expiresAt.toISOString(),
      origin,
      priority: WITHDRAW_STEP_UP_PRIORITY,
    };
    if (input.method === "email_otp") {
      view.delivery = "resend";
    }
    return view;
  }

  async verifyChallenge(input: {
    userId: string;
    challengeId: string;
    method: WithdrawStepUpMethod;
    /** OTP / PIN / recovery plaintext · WebAuthn assertion payload JSON */
    proof: string;
    origin: string;
  }): Promise<StepUpVerifyResult> {
    if (!input.userId || !input.challengeId) {
      throw new BadRequestException("userId and challengeId required");
    }
    const env = loadPhase0Env();
    if (!originAllowed(input.origin, env.appHost)) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.ORIGIN_REJECTED,
        toastCode: WITHDRAW_STEP_UP_CODES.ORIGIN_REJECTED,
        statusCode: 403,
      });
    }

    const ch = await this.db.query<ChallengeRow>(
      `SELECT id, user_id, method, challenge_hash, origin, expires_at, consumed_at
         FROM public.withdraw_stepup_challenges
        WHERE id = $1::uuid AND user_id = $2::uuid`,
      [input.challengeId, input.userId],
    );
    const row = ch.rows[0];
    if (!row) throw new BadRequestException("challenge not found");
    if (row.consumed_at) throw new ConflictConsumed();
    if (row.method !== input.method) {
      throw new BadRequestException("method mismatch");
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.CHALLENGE_EXPIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.CHALLENGE_EXPIRED,
        statusCode: 403,
      });
    }

    await this.verifyProof(input.userId, input.method, input.proof, row);

    const consumed = await this.db.query<{ id: string }>(
      `UPDATE public.withdraw_stepup_challenges
          SET consumed_at = now()
        WHERE id = $1::uuid
          AND consumed_at IS NULL
          AND expires_at > now()
        RETURNING id::text AS id`,
      [row.id],
    );
    if (!consumed.rows[0]) {
      throw new ConflictConsumed();
    }

    const expiresAtSec =
      Math.floor(Date.now() / 1000) + WITHDRAW_STEP_UP_TTL_SEC;
    const token = this.issueStepUpToken(
      input.userId,
      input.method,
      row.id,
      expiresAtSec,
    );
    return {
      ok: true,
      stepUpToken: token,
      method: input.method,
      expiresAt: new Date(expiresAtSec * 1000).toISOString(),
    };
  }

  /** Register or re-set PIN after wipe (must_reset / missing). */
  async setPin(input: {
    userId: string;
    pin: string;
    enrollmentStepUpToken: string;
  }): Promise<{ ok: true; toastCode: "PIN_SET" }> {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!/^\d{6}$/.test(input.pin)) {
      throw new BadRequestException("pin must be 6 digits");
    }
    const enrollment = this.assertStepUpToken({
      userId: input.userId,
      stepUpToken: input.enrollmentStepUpToken,
    });
    if (enrollment.method === "pin") {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.PIN_ENROLLMENT_STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.PIN_ENROLLMENT_STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    const current = await this.getPinRow(input.userId);
    if (current && !current.must_reset) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.PIN_ENROLLMENT_STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.PIN_ENROLLMENT_STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    await this.consumeStepUpToken({
      userId: input.userId,
      stepUpToken: input.enrollmentStepUpToken,
    });
    const hash = this.hashPin(input.pin, input.userId);
    await this.db.query(
      `INSERT INTO public.withdraw_pin_verifiers (
         user_id, pin_hash, must_reset, failed_attempts, locked_until, updated_at
       ) VALUES ($1::uuid, $2, false, 0, NULL, now())
       ON CONFLICT (user_id) DO UPDATE SET
         pin_hash = EXCLUDED.pin_hash,
         must_reset = false,
         failed_attempts = 0,
         locked_until = NULL,
         updated_at = now()`,
      [input.userId, hash],
    );
    return { ok: true, toastCode: "PIN_SET" };
  }

  /**
   * Assert a previously issued stepUpToken for withdraw create.
   * Format: v2.<userId>.<method>.<challengeId>.<expiresAtSec>.<hmac>
   */
  assertStepUpToken(input: {
    userId: string;
    stepUpToken: string;
  }): {
    method: WithdrawStepUpMethod;
    challengeId: string;
    expiresAtSec: number;
  } {
    const raw = (input.stepUpToken || "").trim();
    if (!raw.startsWith("v2.")) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    const parts = raw.split(".");
    if (parts.length !== 6) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    const [, userId, method, challengeId, expiresAtRaw, mac] = parts;
    if (userId !== input.userId) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    if (!WITHDRAW_STEP_UP_PRIORITY.includes(method as WithdrawStepUpMethod)) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    const expiresAtSec = Number(expiresAtRaw);
    if (
      !Number.isInteger(expiresAtSec) ||
      expiresAtSec <= Math.floor(Date.now() / 1000)
    ) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_TOKEN_EXPIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_TOKEN_EXPIRED,
        statusCode: 403,
      });
    }
    const expect = this.macToken(
      userId!,
      method!,
      challengeId!,
      expiresAtSec,
    );
    if (!safeEq(mac!, expect)) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_REQUIRED,
        statusCode: 403,
      });
    }
    return {
      method: method as WithdrawStepUpMethod,
      challengeId: challengeId!,
      expiresAtSec,
    };
  }

  /**
   * Consume a valid step-up token exactly once at the money/enrollment boundary.
   * The HMAC proves issuer/user/method/challenge/expiry; the DB update provides
   * cross-process replay protection. Missing schema or stale/replayed tokens
   * fail closed rather than silently accepting a reusable bearer proof.
   */
  async consumeStepUpToken(input: {
    userId: string;
    stepUpToken: string;
  }): Promise<{ method: WithdrawStepUpMethod }> {
    const claims = this.assertStepUpToken(input);
    const consumed = await this.db.query<{ id: string }>(
      `UPDATE public.withdraw_stepup_challenges
          SET token_consumed_at = now()
        WHERE id = $1::uuid
          AND user_id = $2::uuid
          AND method = $3
          AND consumed_at IS NOT NULL
          AND token_consumed_at IS NULL
          AND expires_at > now()
        RETURNING id::text AS id`,
      [claims.challengeId, input.userId, claims.method],
    );
    if (!consumed.rows[0]) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.STEP_UP_TOKEN_REPLAYED,
        toastCode: WITHDRAW_STEP_UP_CODES.STEP_UP_TOKEN_REPLAYED,
        statusCode: 403,
      });
    }
    return { method: claims.method };
  }

  async requirePinReadyOrThrow(userId: string): Promise<void> {
    const pin = await this.getPinRow(userId);
    if (!pin || pin.must_reset) {
      throw new ForbiddenException({
        code: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
        toastCode: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
        statusCode: 403,
        message: "PIN_REQUIRED",
      });
    }
  }

  // ── private ──────────────────────────────────────────────

  private makeSecret(method: WithdrawStepUpMethod): string {
    if (method === "email_otp") {
      return String(randomInt(100000, 999999));
    }
    return randomBytes(32).toString("base64url");
  }

  private hashSecret(secret: string): string {
    return createHash("sha256").update(secret, "utf8").digest("hex");
  }

  private hashPin(pin: string, userId: string): string {
    const salt = createHash("sha256")
      .update(`withdraw-pin:${userId}`)
      .digest();
    const key = scryptSync(pin, salt, SCRYPT_KEYLEN);
    return `scrypt$${key.toString("hex")}`;
  }

  private verifyPinHash(pin: string, userId: string, stored: string): boolean {
    const expect = this.hashPin(pin, userId);
    return safeEq(expect, stored);
  }

  private async getVerifiedEmail(userId: string): Promise<string | null> {
    const r = await this.db.query<{ email: string }>(
      `SELECT u.email
         FROM public.users u
        WHERE u.id = $1::uuid
          AND u.email IS NOT NULL
          AND EXISTS (
            SELECT 1
              FROM public.auth_magic_link_challenges m
             WHERE m.email = u.email
               AND m.consumed_at IS NOT NULL
          )`,
      [userId],
    );
    return r.rows[0]?.email ?? null;
  }

  private async getPinRow(userId: string): Promise<PinRow | null> {
    const r = await this.db.query<PinRow>(
      `SELECT user_id, pin_hash, must_reset, failed_attempts, locked_until
         FROM public.withdraw_pin_verifiers
        WHERE user_id = $1::uuid`,
      [userId],
    );
    return r.rows[0] ?? null;
  }

  private assertPinNotLocked(pin: PinRow): void {
    if (pin.locked_until && new Date(pin.locked_until).getTime() > Date.now()) {
      throw new HttpException(
        {
          code: WITHDRAW_STEP_UP_CODES.PIN_LOCKED,
          toastCode: WITHDRAW_STEP_UP_CODES.PIN_LOCKED,
          statusCode: 429,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async verifyProof(
    userId: string,
    method: WithdrawStepUpMethod,
    proof: string,
    row: ChallengeRow,
  ): Promise<void> {
    if (method === "webauthn") {
      throw new ServiceUnavailableException({
        code: WITHDRAW_STEP_UP_CODES.WEBAUTHN_STEP_UP_NOT_READY,
        toastCode: WITHDRAW_STEP_UP_CODES.WEBAUTHN_STEP_UP_NOT_READY,
        statusCode: 503,
      });
    }

    if (method === "email_otp") {
      if (this.hashSecret(proof) !== row.challenge_hash) {
        throw new ForbiddenException("email_otp_invalid");
      }
      return;
    }

    if (method === "pin") {
      const pin = await this.getPinRow(userId);
      if (!pin || pin.must_reset) {
        throw new ForbiddenException({
          code: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
          toastCode: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
          statusCode: 403,
        });
      }
      this.assertPinNotLocked(pin);
      if (!this.verifyPinHash(proof, userId, pin.pin_hash)) {
        await this.bumpPinFail(userId, pin);
        throw new ForbiddenException("pin_invalid");
      }
      await this.db.query(
        `UPDATE public.withdraw_pin_verifiers
            SET failed_attempts = 0, locked_until = NULL, updated_at = now()
          WHERE user_id = $1::uuid`,
        [userId],
      );
      return;
    }

    if (method === "recovery") {
      const codeHash = this.hashSecret(proof.trim().toUpperCase());
      const r = await this.db.query<{ id: string }>(
        `UPDATE public.withdraw_recovery_codes
            SET used_at = now()
          WHERE user_id = $1::uuid
            AND code_hash = $2
            AND used_at IS NULL
          RETURNING id`,
        [userId, codeHash],
      );
      if (!r.rows[0]) throw new ForbiddenException("recovery_invalid");
      return;
    }

    throw new BadRequestException("unsupported method");
  }

  private async bumpPinFail(userId: string, pin: PinRow): Promise<void> {
    const next = pin.failed_attempts + 1;
    const locked =
      next >= PIN_MAX_ATTEMPTS
        ? new Date(Date.now() + PIN_LOCK_MIN * 60 * 1000)
        : null;
    await this.db.query(
      `UPDATE public.withdraw_pin_verifiers
          SET failed_attempts = $2,
              locked_until = $3,
              updated_at = now()
        WHERE user_id = $1::uuid`,
      [userId, next, locked?.toISOString() ?? null],
    );
    if (locked) {
      throw new HttpException(
        {
          code: WITHDRAW_STEP_UP_CODES.PIN_LOCKED,
          toastCode: WITHDRAW_STEP_UP_CODES.PIN_LOCKED,
          statusCode: 429,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private issueStepUpToken(
    userId: string,
    method: WithdrawStepUpMethod,
    challengeId: string,
    expiresAtSec: number,
  ): string {
    const mac = this.macToken(userId, method, challengeId, expiresAtSec);
    return `v2.${userId}.${method}.${challengeId}.${expiresAtSec}.${mac}`;
  }

  private macToken(
    userId: string,
    method: string,
    challengeId: string,
    expiresAtSec: number,
  ): string {
    const secret = loadPhase0Env().jwtUserSecret;
    if (!secret) {
      throw new ServiceUnavailableException(
        "JWT_USER_SECRET unset — withdraw step-up unavailable",
      );
    }
    return createHmac("sha256", secret)
      .update(`${userId}|${method}|${challengeId}|${expiresAtSec}`)
      .digest("base64url");
  }
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

class ConflictConsumed extends ConflictException {
  constructor() {
    super("challenge already consumed");
  }
}
