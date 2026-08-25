import { Controller, Get, NotFoundException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DepositConfigService } from "./deposit-config.service";
import { WALLET_USER_ROUTES } from "./wallet.routes";

export type PublicKrwDepositInstructionsV1 = {
  configVersion: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  noticeKo: string;
  updatedAt: string;
};

/**
 * User-safe KRW deposit instructions.
 *
 * Important boundaries:
 * - Reads persisted Money-owned deposit_config only. Day-1 defaults are never
 *   presented to users as a real bank account.
 * - Response is an explicit allowlist; USDT secret/ref fields cannot escape.
 * - Login is required because this is part of the authenticated deposit flow.
 */
@Controller("wallet")
export class DepositConfigUserController {
  constructor(private readonly config: DepositConfigService) {}

  @UseGuards(JwtAuthGuard)
  @Get(WALLET_USER_ROUTES.krwDepositInstructions)
  async getKrwDepositInstructions(): Promise<PublicKrwDepositInstructionsV1> {
    const persisted = await this.config.requirePersisted();
    const bankName = persisted.krw.bankName.trim();
    const accountNumber = persisted.krw.accountNumber.trim();
    const accountHolder = persisted.krw.accountHolder.trim();
    const noticeKo = persisted.krw.noticeKo.trim();

    if (!bankName || !accountNumber || !accountHolder) {
      throw new NotFoundException("KRW_DEPOSIT_ACCOUNT_NOT_READY");
    }

    return {
      configVersion: persisted.configVersion,
      bankName,
      accountNumber,
      accountHolder,
      noticeKo,
      updatedAt: persisted.updatedAt,
    };
  }
}
