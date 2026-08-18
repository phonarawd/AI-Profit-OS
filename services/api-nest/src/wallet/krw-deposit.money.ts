/**
 * Deposit KRW→USDT conversion — ledger credit precision.
 * creditedUsdt = trunc18(payableKrw / usdtKrw)
 * usdtKrw = fx_snapshots.usd_krw = KRW per 1 USDT.
 * Home current-FX (round-half-up) 와 별개. 새 곱셈/환산 단계 없음.
 */

import { BadRequestException } from "@nestjs/common";
import { formatAmount, parseAmount } from "../ledger/ledger.money";

const SCALE = 18n;

export function krwToUsdt(payableKrw: number, usdtKrw: string): string {
  if (!Number.isInteger(payableKrw) || payableKrw < 1) {
    throw new BadRequestException("payableAmountKrw invalid");
  }
  const rate = parseAmount(usdtKrw);
  if (rate <= 0n) throw new BadRequestException("usd_krw must be > 0");
  const pow = 10n ** SCALE;
  const numer = BigInt(payableKrw) * pow * pow;
  const usdt = numer / rate;
  if (usdt <= 0n) throw new BadRequestException("converted amountUsdt ≤ 0");
  return formatAmount(usdt);
}
