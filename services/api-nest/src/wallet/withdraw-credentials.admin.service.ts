/**
 * Money §43.6a — Admin PIN wipe / WebAuthn credential revoke.
 * UI·RBAC Owns=Admin §9.8.10E · this module = verifier wipe only.
 * FORBIDDEN: plaintext PIN read/set · ledger mutation · recovery bulk expose.
 */

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { WALLET_EVENTS } from "./wallet.events";
import {
  ADMIN_CREDENTIAL_AUDIT,
  pinStateAfterAdminWipe,
  WITHDRAW_STEP_UP_CODES,
} from "./withdraw-stepup.policy";

const REASON_MIN = 10;

export type CredentialWipeResult = {
  ok: true;
  userId: string;
  action: "withdraw_pin.reset" | "webauthn.revoke";
  toastCode: "WITHDRAW_PIN_RESET" | "WEBAUTHN_REVOKED";
  nextWithdrawCode?: "PIN_REQUIRED";
  auditAction: string;
  reused: boolean;
  ledgerMutated: false;
};

@Injectable()
export class WithdrawCredentialsAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  /** Admin [출금 비밀번호 초기화] — wipe verifier · force PIN re-register */
  async resetWithdrawPin(input: {
    userId: string;
    adminId: string;
    idempotencyKey: string;
    reason?: string;
  }): Promise<CredentialWipeResult> {
    this.assertIds(input);
    const existing = await this.findAudit(input.idempotencyKey);
    if (existing) {
      return {
        ok: true,
        userId: input.userId,
        action: "withdraw_pin.reset",
        toastCode: "WITHDRAW_PIN_RESET",
        nextWithdrawCode: "PIN_REQUIRED",
        auditAction: ADMIN_CREDENTIAL_AUDIT.pinReset,
        reused: true,
        ledgerMutated: false,
      };
    }

    const wipe = pinStateAfterAdminWipe();
    // Delete verifier row (no plaintext ever stored/returned)
    await this.db.query(
      `DELETE FROM public.withdraw_pin_verifiers WHERE user_id = $1::uuid`,
      [input.userId],
    );
    // Marker row: must_reset without hash — next setPin / step-up PIN path
    await this.db.query(
      `INSERT INTO public.withdraw_pin_verifiers (
         user_id, pin_hash, must_reset, failed_attempts, updated_at
       ) VALUES ($1::uuid, $2, true, 0, now())
       ON CONFLICT (user_id) DO UPDATE SET
         pin_hash = EXCLUDED.pin_hash,
         must_reset = true,
         failed_attempts = 0,
         locked_until = NULL,
         updated_at = now()`,
      [input.userId, "WIPED"],
    );

    await this.insertAudit({
      userId: input.userId,
      adminId: input.adminId,
      action: "withdraw_pin.reset",
      idempotencyKey: input.idempotencyKey,
      detail: { reason: input.reason ?? null, next: wipe.nextWithdrawCode },
    });

    const result: CredentialWipeResult = {
      ok: true,
      userId: input.userId,
      action: "withdraw_pin.reset",
      toastCode: wipe.toastCode,
      nextWithdrawCode: wipe.nextWithdrawCode,
      auditAction: ADMIN_CREDENTIAL_AUDIT.pinReset,
      reused: false,
      ledgerMutated: false,
    };
    this.bus.emit(WALLET_EVENTS.withdrawPinReset, {
      userId: input.userId,
      adminId: input.adminId,
      toastCode: result.toastCode,
      nextWithdrawCode: WITHDRAW_STEP_UP_CODES.PIN_REQUIRED,
      ledgerMutated: false,
    });
    return result;
  }

  /** Admin [패스키 등록 해제] — revoke auth_passkeys · OTP/PIN fallback 유지 */
  async revokeWebauthn(input: {
    userId: string;
    adminId: string;
    idempotencyKey: string;
    reason?: string;
  }): Promise<CredentialWipeResult> {
    this.assertIds(input);
    const existing = await this.findAudit(input.idempotencyKey);
    if (existing) {
      return {
        ok: true,
        userId: input.userId,
        action: "webauthn.revoke",
        toastCode: "WEBAUTHN_REVOKED",
        auditAction: ADMIN_CREDENTIAL_AUDIT.webauthnRevoke,
        reused: true,
        ledgerMutated: false,
      };
    }

    const rev = await this.db.query<{ id: string }>(
      `UPDATE public.auth_passkeys
          SET revoked_at = now()
        WHERE user_id = $1::uuid
          AND revoked_at IS NULL
        RETURNING id`,
      [input.userId],
    );

    await this.insertAudit({
      userId: input.userId,
      adminId: input.adminId,
      action: "webauthn.revoke",
      idempotencyKey: input.idempotencyKey,
      detail: {
        reason: input.reason ?? null,
        revokedCount: rev.rowCount ?? rev.rows.length,
        fallbacks: ["email_otp", "pin", "recovery"],
      },
    });

    const result: CredentialWipeResult = {
      ok: true,
      userId: input.userId,
      action: "webauthn.revoke",
      toastCode: "WEBAUTHN_REVOKED",
      auditAction: ADMIN_CREDENTIAL_AUDIT.webauthnRevoke,
      reused: false,
      ledgerMutated: false,
    };
    this.bus.emit(WALLET_EVENTS.webauthnRevoked, {
      userId: input.userId,
      adminId: input.adminId,
      toastCode: result.toastCode,
      ledgerMutated: false,
    });
    return result;
  }

  private assertIds(input: {
    userId: string;
    adminId: string;
    idempotencyKey: string;
    reason?: string;
  }): void {
    if (!input.userId) throw new BadRequestException("userId required");
    if (!input.adminId) throw new BadRequestException("adminId required");
    if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
      throw new BadRequestException("idempotencyKey minLength 8");
    }
    if (input.reason != null && input.reason.length > 0 && input.reason.length < REASON_MIN) {
      throw new BadRequestException(`reason minLength ${REASON_MIN}`);
    }
  }

  private async findAudit(idempotencyKey: string) {
    const r = await this.db.query<{ id: string }>(
      `SELECT id FROM public.withdraw_credentials_audit
        WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    return r.rows[0] ?? null;
  }

  private async insertAudit(input: {
    userId: string;
    adminId: string;
    action: "withdraw_pin.reset" | "webauthn.revoke";
    idempotencyKey: string;
    detail: Record<string, unknown>;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO public.withdraw_credentials_audit (
         user_id, action, admin_id, idempotency_key, detail
       ) VALUES ($1::uuid, $2, $3::uuid, $4, $5::jsonb)`,
      [
        input.userId,
        input.action,
        input.adminId,
        input.idempotencyKey,
        JSON.stringify(input.detail),
      ],
    );
  }
}
