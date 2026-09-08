/**
 * 체험금 KRW↔USDT · 서버 FX만. 환율 발명 금지.
 */

import { formatAmount, parseAmount } from "./ledger.money";

const SCALE = 18n;
const POW = 10n ** SCALE;

export function krwToUsdt(payableKrw: number, usdKrw: string): string {
  if (!Number.isInteger(payableKrw) || payableKrw < 1) {
    throw new Error("trial krw must be integer ≥ 1");
  }
  const rate = parseAmount(usdKrw);
  if (rate <= 0n) throw new Error("usd_krw must be > 0");
  const usdt = (BigInt(payableKrw) * POW * POW) / rate;
  if (usdt <= 0n) throw new Error("converted amountUsdt ≤ 0");
  return formatAmount(usdt);
}

/** 내림 정수 원. 캡 비교용. */
export function usdtToKrwInt(amountUsdt: string, usdKrw: string): number {
  const usdt = parseAmount(amountUsdt);
  const rate = parseAmount(usdKrw);
  if (usdt <= 0n || rate <= 0n) return 0;
  const krwScaled = (usdt * rate) / POW;
  const krw = krwScaled / POW;
  if (krw > BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Number(krw);
}
