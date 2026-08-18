/**
 * Money §11.1 — USDT withdraw network fee quote + ledger lines.
 * Debit user bucket(s) / Credit SYS:FEE_REVENUE · toast WITHDRAW_FEE_HINT 필수.
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import {
  addAmount,
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
  subAmount,
} from "../ledger/ledger.money";
import {
  SYSTEM_ACCOUNT_CODES,
  type PostingLineInput,
  type UserBucket,
} from "../ledger/ledger.types";
import { DepositConfigService } from "./deposit-config.service";
import type {
  WithdrawAsset,
  WithdrawFeeQuote,
  WithdrawMode,
} from "./wallet.types";

const FEE_HINT_TOAST_KO = "💸 이체 수수료 {fee} USDT가 빠져요";

@Injectable()
export class WithdrawFeeService {
  constructor(private readonly depositConfig: DepositConfigService) {}

  async quote(input: {
    asset: WithdrawAsset;
    mode: WithdrawMode;
    debitProfitUsdt?: string;
    debitPrincipalUsdt?: string;
  }): Promise<WithdrawFeeQuote> {
    const cfg = await this.depositConfig.get();
    const krwWithdrawFeeKrw = cfg.krw.krwWithdrawFeeKrw;

    if (input.asset === "KRW") {
      return {
        asset: "KRW",
        mode: input.mode,
        withdrawFeeUsdt: "0",
        krwWithdrawFeeKrw,
        feeDebitProfitUsdt: "0",
        feeDebitPrincipalUsdt: "0",
        feeHintToastCode: "WITHDRAW_FEE_HINT",
        feeHintToastKo: FEE_HINT_TOAST_KO.replace("{fee}", "0"),
      };
    }

    const feeRaw = cfg.usdtOnchain.usdtWithdrawNetworkFeeUsdt;
    // Zero fee allowed (Admin may set 0) — use non-throwing parse
    if (!/^[0-9]+(\.[0-9]+)?$/.test(feeRaw)) {
      throw new BadRequestException("usdtWithdrawNetworkFeeUsdt invalid");
    }
    const withdrawFeeUsdt =
      parseAmount(feeRaw) === 0n ? "0" : assertAmountUsdt(feeRaw, "withdrawFeeUsdt");

    const split = this.splitFeeAcrossBuckets({
      mode: input.mode,
      feeUsdt: withdrawFeeUsdt,
      debitProfitUsdt: input.debitProfitUsdt ?? "0",
      debitPrincipalUsdt: input.debitPrincipalUsdt ?? "0",
    });

    return {
      asset: "USDT",
      mode: input.mode,
      withdrawFeeUsdt,
      krwWithdrawFeeKrw,
      feeDebitProfitUsdt: split.feeDebitProfitUsdt,
      feeDebitPrincipalUsdt: split.feeDebitPrincipalUsdt,
      feeHintToastCode: "WITHDRAW_FEE_HINT",
      feeHintToastKo: FEE_HINT_TOAST_KO.replace("{fee}", withdrawFeeUsdt),
    };
  }

  /**
   * Build double-entry lines for the fee journal (journalType=fee).
   * Caller posts via LedgerPostingService — never UPDATE balance directly.
   */
  buildFeePostingLines(input: {
    userId: string;
    feeDebitProfitUsdt: string;
    feeDebitPrincipalUsdt: string;
  }): PostingLineInput[] {
    const lines: PostingLineInput[] = [];
    let creditTotal = "0";

    if (cmpAmount(input.feeDebitProfitUsdt, "0") > 0) {
      const amt = assertAmountUsdt(input.feeDebitProfitUsdt, "feeDebitProfitUsdt");
      lines.push(this.userDebit(input.userId, "profit", amt));
      creditTotal = addAmount(creditTotal, amt);
    }
    if (cmpAmount(input.feeDebitPrincipalUsdt, "0") > 0) {
      const amt = assertAmountUsdt(
        input.feeDebitPrincipalUsdt,
        "feeDebitPrincipalUsdt",
      );
      lines.push(this.userDebit(input.userId, "principal", amt));
      creditTotal = addAmount(creditTotal, amt);
    }

    if (cmpAmount(creditTotal, "0") <= 0) {
      throw new BadRequestException("fee amount must be > 0 to post");
    }

    lines.push({
      // SYS:FEE_REVENUE — Money §11.1 credit leg (never mute fee in UX)
      account: { systemCode: SYSTEM_ACCOUNT_CODES.FEE_REVENUE },
      direction: "credit",
      amountUsdt: creditTotal,
    });
    return lines;
  }

  /** Allocate fee to buckets matching withdraw mode (§11.1). */
  splitFeeAcrossBuckets(input: {
    mode: WithdrawMode;
    feeUsdt: string;
    debitProfitUsdt: string;
    debitPrincipalUsdt: string;
  }): { feeDebitProfitUsdt: string; feeDebitPrincipalUsdt: string } {
    const fee = input.feeUsdt === "0" ? "0" : assertAmountUsdt(input.feeUsdt, "feeUsdt");
    if (fee === "0") {
      return { feeDebitProfitUsdt: "0", feeDebitPrincipalUsdt: "0" };
    }

    if (input.mode === "profit") {
      return { feeDebitProfitUsdt: fee, feeDebitPrincipalUsdt: "0" };
    }
    if (input.mode === "principal") {
      return { feeDebitProfitUsdt: "0", feeDebitPrincipalUsdt: fee };
    }

    // combined → 명세 분리 (proportional to debit split; remainder to principal)
    const profitPart =
      input.debitProfitUsdt === "0"
        ? 0n
        : parseAmount(assertAmountUsdt(input.debitProfitUsdt, "debitProfitUsdt"));
    const principalPart =
      input.debitPrincipalUsdt === "0"
        ? 0n
        : parseAmount(
            assertAmountUsdt(input.debitPrincipalUsdt, "debitPrincipalUsdt"),
          );
    const total = profitPart + principalPart;
    if (total <= 0n) {
      throw new BadRequestException(
        "combined withdraw requires debitProfitUsdt+debitPrincipalUsdt > 0",
      );
    }
    const feeN = parseAmount(fee);
    const feeProfit = (feeN * profitPart) / total;
    const feePrincipal = feeN - feeProfit;
    return {
      feeDebitProfitUsdt: formatAmount(feeProfit),
      feeDebitPrincipalUsdt: formatAmount(feePrincipal),
    };
  }

  /** Ensure quote always exposes non-hidden fee hint (verify:withdraw-fee-ledger). */
  assertFeeVisible(quote: WithdrawFeeQuote): void {
    if (quote.feeHintToastCode !== "WITHDRAW_FEE_HINT") {
      throw new BadRequestException("WITHDRAW_FEE_HINT required");
    }
    if (!quote.feeHintToastKo.includes("이체 수수료")) {
      throw new BadRequestException("fee hint must show 이체 수수료");
    }
    if (!quote.feeHintToastKo.includes(quote.withdrawFeeUsdt)) {
      throw new BadRequestException("fee hint must include withdrawFeeUsdt");
    }
  }

  private userDebit(
    userId: string,
    bucket: UserBucket,
    amountUsdt: string,
  ): PostingLineInput {
    return {
      account: { userId, bucket },
      direction: "debit",
      amountUsdt,
    };
  }
}

/** Exported for unit-style verify without Nest DI */
export function remainingAfterFee(
  amountUsdt: string,
  feeUsdt: string,
): string {
  return subAmount(amountUsdt, feeUsdt);
}
