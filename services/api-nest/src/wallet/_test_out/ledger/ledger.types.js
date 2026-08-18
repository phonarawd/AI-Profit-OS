"use strict";
/** Money §11 · §43.5 · §49 — ledger posting contracts */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRACTICE_FORBIDDEN_JOURNAL_TYPES = exports.CREDIT_NORMAL_KINDS = exports.DEBIT_NORMAL_KINDS = exports.SYSTEM_ACCOUNT_CODES = exports.JOURNAL_TYPES = exports.USER_BUCKETS = void 0;
exports.USER_BUCKETS = ["principal", "profit", "locked", "practice"];
exports.JOURNAL_TYPES = [
    "deposit_usdt",
    "deposit_krw",
    "withdraw",
    "withdraw_refund",
    "participate_lock",
    "participate_unlock",
    "settlement",
    "merge_profit_to_principal",
    "admin_adjust",
    "referral_reward",
    "referral_clawback",
    "practice_grant",
    "practice_expire",
    "mission_reward",
    "mission_clawback",
    "fee",
    "other",
];
exports.SYSTEM_ACCOUNT_CODES = {
    OPPORTUNITY_POOL: "SYS:OPPORTUNITY_POOL",
    OPS_POOL: "SYS:OPS_POOL",
    /** Engine §0.0.4.3 · S2 input · ops.platform_reserve_usdt */
    PLATFORM_RESERVE: "ops.platform_reserve_usdt",
    PROMO_POOL: "SYS:PROMO_POOL",
    TREASURY: "SYS:TREASURY",
    FEE_REVENUE: "SYS:FEE_REVENUE",
    FX_CLEARING: "SYS:FX_CLEARING",
    SUSPENSE: "SYS:SUSPENSE",
};
/** Account kinds where debit increases balance_usdt (asset/clearing). */
exports.DEBIT_NORMAL_KINDS = new Set([
    "ops_pool",
    "treasury",
    "fx_clearing",
    "suspense",
]);
/** Account kinds where credit increases balance_usdt (liability/revenue). */
exports.CREDIT_NORMAL_KINDS = new Set([
    "user_bucket",
    "opportunity_pool",
    "promo_pool",
    "fee_revenue",
]);
/** Journal types that must never touch practice bucket (§49). */
exports.PRACTICE_FORBIDDEN_JOURNAL_TYPES = new Set([
    "deposit_usdt",
    "deposit_krw",
    "withdraw",
    "withdraw_refund",
    "participate_lock",
    "participate_unlock",
    "settlement",
    "merge_profit_to_principal",
    "fee",
    "referral_reward",
    "referral_clawback",
]);
