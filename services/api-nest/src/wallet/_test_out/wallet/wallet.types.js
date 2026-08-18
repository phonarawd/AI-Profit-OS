"use strict";
/** Money §11.1 · §11.2 · §37 · §41 deposit-config / USDT+KRW contracts */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEPOSIT_DISPUTE_REASON_MIN = exports.DAY1_DEPOSIT_CONFIG_DEFAULTS = exports.PAYABLE_SUFFIX_ROLE = exports.KRW_REJECT_REASON_MIN = exports.KRW_DEPOSIT_TTL_MIN = void 0;
/** §43.3 Day-1 TTL for KRW unique payable amount */
exports.KRW_DEPOSIT_TTL_MIN = 120;
/** §41.3 reject reason min length */
exports.KRW_REJECT_REASON_MIN = 10;
/** Suffix is bank-transfer identification only — not fee/spread/revenue. */
exports.PAYABLE_SUFFIX_ROLE = "bank_transfer_identification";
/** Day-1 defaults (Money §11.1 · §11.2 · §43.2) */
exports.DAY1_DEPOSIT_CONFIG_DEFAULTS = {
    configVersion: 1,
    krw: {
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        noticeKo: "",
        krwWithdrawFeeKrw: 0,
    },
    usdtOnchain: {
        network: "TRC20",
        tronGridBaseUrl: "https://api.trongrid.io",
        chainWatcherMode: "event_stream",
        usdtUiConfirmations: 1,
        usdtLedgerConfirmations: 19,
        usdtContract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        hotWalletXpubRef: "secret:hot-wallet-xpub",
        treasuryHotAddressRef: "secret:treasury-hot",
        energyDelegateEnabled: true,
        usdtWithdrawNetworkFeeUsdt: "1",
        minTrxStakeForSweeper: "5000",
        sweeperPaused: false,
    },
    withdrawGuards: {
        minHoldingHours: 24,
    },
    pricingGuards: {
        priceStaleMaxSec: 3,
        requireMinProfitUsdt: true,
    },
};
/** Money §41.6 · §51.11 wrong-chain / 오입금 */
exports.DEPOSIT_DISPUTE_REASON_MIN = 10;
