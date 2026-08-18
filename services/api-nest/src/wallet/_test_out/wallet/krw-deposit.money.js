"use strict";
/**
 * Deposit KRW→USDT conversion — ledger credit precision.
 * creditedUsdt = trunc18(payableKrw / usdtKrw)
 * usdtKrw = fx_snapshots.usd_krw = KRW per 1 USDT.
 * Home current-FX (round-half-up) 와 별개. 새 곱셈/환산 단계 없음.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.krwToUsdt = krwToUsdt;
const common_1 = require("@nestjs/common");
const ledger_money_1 = require("../ledger/ledger.money");
const SCALE = 18n;
function krwToUsdt(payableKrw, usdtKrw) {
    if (!Number.isInteger(payableKrw) || payableKrw < 1) {
        throw new common_1.BadRequestException("payableAmountKrw invalid");
    }
    const rate = (0, ledger_money_1.parseAmount)(usdtKrw);
    if (rate <= 0n)
        throw new common_1.BadRequestException("usd_krw must be > 0");
    const pow = 10n ** SCALE;
    const numer = BigInt(payableKrw) * pow * pow;
    const usdt = numer / rate;
    if (usdt <= 0n)
        throw new common_1.BadRequestException("converted amountUsdt ≤ 0");
    return (0, ledger_money_1.formatAmount)(usdt);
}
