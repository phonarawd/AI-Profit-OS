/**
 * Money §42 — withdraw path KYC gate adapter.
 * withdraw-intent / USDT·KRW withdraw MUST call assertBeforeWithdraw.
 * participate / deposit — do NOT import this guard.
 */

import { Injectable } from "@nestjs/common";
import { KycService } from "../compliance/kyc.service";
import {
  assertWithdrawKyc,
  KYC_WITHDRAW_REQUIRED,
  participateGate,
} from "../compliance/kyc-gate";
import type { KycStatus } from "../compliance/compliance.types";

@Injectable()
export class WithdrawKycGuard {
  constructor(private readonly kyc: KycService) {}

  /** Withdraw only — 403 KYC_WITHDRAW_REQUIRED when not approved */
  async assertBeforeWithdraw(userId: string): Promise<void> {
    await this.kyc.assertWithdrawKycForUser(userId);
  }

  /**
   * Participate has NO kyc check (§42).
   * Returns 200-shaped ok regardless of kycStatus.
   */
  participateWithoutKyc(kycStatus: KycStatus) {
    return participateGate(kycStatus);
  }

  /** Pure mirror for unit/verify */
  check(kycStatus: KycStatus): null | typeof KYC_WITHDRAW_REQUIRED {
    return assertWithdrawKyc(kycStatus);
  }
}
