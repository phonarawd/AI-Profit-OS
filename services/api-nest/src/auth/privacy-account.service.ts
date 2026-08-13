/**
 * §51.9 delete-account — privacy purge / anonymize / tombstone orchestration.
 *
 * A focused lifecycle service instead of folding transactional deletion into
 * auth.service.ts. Table operations are grouped by policy so the classification
 * itself stays reviewable:
 *
 *  - PURGE     — DELETE, non-retention personal/state data (§20/§21 approved set)
 *  - ANONYMIZE — UPDATE user_id = NULL, row survives (schema's own SET NULL intent)
 *  - RETAIN    — untouched (KYC / ledger / accounting / admin audit trail)
 *
 * public.users is never hard-deleted — it becomes a tombstone (§19). Everything
 * runs inside ONE transaction (PostgresService.withTransaction): any failure
 * rolls the whole purge back, so a half-deleted account can never be observed.
 *
 * Guard evaluation (locked balance / pending withdraw) happens BEFORE this
 * transaction opens (AuthService§deleteAccount), so a blocked delete never
 * mutates anything — the strongest possible form of "no partial deletion".
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import type { PoolClient } from "pg";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { PostgresService } from "../db/postgres";
import type { DeleteAccountGuardSnapshot } from "./auth.stage";

/** Terminal withdraw_intents states — everything else counts as "pending". */
const WITHDRAW_TERMINAL_STATUSES = [
  "completed",
  "rejected",
  "failed_refund_buckets",
] as const;

/**
 * PURGE — DELETE, in FK-dependency order (children before the parents/rows
 * other purge-set tables reference). Every entry here maps to an approved
 * non-retention class from §20/§21.
 */
const PURGE_TABLES: readonly [table: string, column: string][] = [
  // participate/trade — participate_requests.trade_id -> trade_executions
  ["participate_requests", "user_id"],
  ["trade_executions", "user_id"],
  // practice + mission accrual (explicit §21 purge set)
  ["practice_grants", "user_id"],
  ["mission_accruals", "user_id"],
  // AI memory/profile — memory_embeddings.memory_id -> ai_memory (child first)
  ["memory_embeddings", "user_id"],
  ["ai_memory", "user_id"],
  ["ai_user_profile", "user_id"],
  // admin-authored content about/to this user (not an audit-of-admin-decision table)
  ["tendency_memos", "user_id"],
  ["ops_inbox_messages", "user_id"],
  // per-user override/business-config/risk-state — only meaningful for an active account
  ["user_opportunity_overrides", "user_id"],
  ["user_match_policy_overrides", "user_id"],
  ["user_membership", "user_id"],
  ["user_risk_state", "user_id"],
  // marketing attribution / profile / notification / ux preference state
  ["user_attributions", "user_id"],
  ["notification_prefs", "user_id"],
  ["user_profiles", "user_id"],
  ["user_ux_prefs", "user_id"],
  // referral spam-counter (pure usage state, zero financial value)
  ["referral_share_daily", "user_id"],
  // auth/security material — meaningless once the account is gone
  ["auth_oauth_identities", "user_id"],
  ["auth_passkeys", "user_id"],
  ["user_capability", "user_id"],
  ["withdraw_pin_verifiers", "user_id"],
  ["withdraw_recovery_codes", "user_id"],
  ["withdraw_stepup_challenges", "user_id"],
  // sessions last — nothing above depends on a live session row
  ["auth_sessions", "user_id"],
];

/**
 * ANONYMIZE — UPDATE user_id = NULL, row kept. These four tables already
 * declare `ON DELETE SET NULL` in the schema (the schema author's own intent
 * to detach identity rather than delete the row); we apply that detachment
 * explicitly here because we never hard-delete the parent `users` row, so the
 * FK action itself would never fire.
 */
const ANONYMIZE_TABLES: readonly string[] = [
  "ai_events",
  "ai_feedback",
  "ai_logs",
  "ai_pick_scores",
];

/**
 * RETAIN (documented, not enforced by code — listed for the audit trail):
 * kyc_status, kyc_submissions, kyc_decision_audit (KYC retention, §42.2.1),
 * ledger_accounts/ledger_journals/ledger_entries (accounting),
 * krw_deposit_requests, usdt_deposit_events, withdraw_intents, deposit_disputes,
 * user_deposit_addresses (financial/AML transaction trail),
 * withdraw_credentials_audit, risk_signals, risk_signal_actions,
 * user_membership_audit, user_opportunity_override_audit,
 * user_match_policy_override_audit (admin-action audit trail — proves what an
 * admin did, independent of whether the user's account still exists),
 * referral_payout_queue (financial payout ledger),
 * referral_edges (retained — see REFERRAL_EDGES_RETAINED_REASON),
 * support_tickets (retained, de-referenced from purged trade_executions below).
 */
export const REFERRAL_EDGES_RETAINED_REASON =
  "referral_edges cannot be purged: referral_payout_queue (financial, retained) " +
  "references it via a NO ACTION foreign key, and referrer_user_id/referee_user_id " +
  "are NOT NULL with no approved migration to relax them in this wave. Hard-deleting " +
  "would either violate referential integrity once a payout exists, or silently " +
  "cascade-delete retained financial payout history — neither is authorized. Only " +
  "referral_share_daily (a pure per-day share counter, zero financial value, no " +
  "downstream FK) is purged, matching the approved 'referral data' intent as closely " +
  "as the current schema allows without a new migration.";

export type PrivacyPurgeResult = {
  ok: true;
  status: "deleted";
  purged: Record<string, number>;
  anonymized: Record<string, number>;
  retainedNote: string;
};

@Injectable()
export class PrivacyAccountService {
  constructor(
    private readonly db: PostgresService,
    private readonly buckets: LedgerBucketsService,
  ) {}

  /** Real server-side balance/pending-withdraw snapshot — never trust a client-supplied one. */
  async loadGuardSnapshot(userId: string): Promise<DeleteAccountGuardSnapshot> {
    const view = await this.buckets.getUserBuckets(userId);
    const pendingWithdrawCount = await this.countPendingWithdraws(userId);
    return {
      lockedUsdt: Number(view.lockedUsdt),
      pendingWithdrawCount,
      principalUsdt: Number(view.principalUsdt),
      profitUsdt: Number(view.profitUsdt),
      practiceUsdt: Number(view.practiceUsdt),
    };
  }

  private async countPendingWithdraws(userId: string): Promise<number> {
    const r = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM public.withdraw_intents
        WHERE user_id = $1::uuid
          AND status NOT IN (${WITHDRAW_TERMINAL_STATUSES.map((_, i) => `$${i + 2}`).join(", ")})`,
      [userId, ...WITHDRAW_TERMINAL_STATUSES],
    );
    return Number(r.rows[0]?.count ?? 0);
  }

  /**
   * Atomic purge. Assumes the caller already evaluated
   * `evaluateDeleteAccountGuards` against a real snapshot and confirmed the
   * double-confirm phrase — this method performs the mutation only.
   */
  async purgeAccount(userId: string): Promise<PrivacyPurgeResult> {
    return this.db.withTransaction(async (client) => {
      await this.dereferenceRetainedRows(client, userId);

      const purged: Record<string, number> = {};
      for (const [table, column] of PURGE_TABLES) {
        const r = await client.query(
          `DELETE FROM public.${table} WHERE ${column} = $1::uuid`,
          [userId],
        );
        purged[table] = r.rowCount ?? 0;
      }

      const anonymized: Record<string, number> = {};
      for (const table of ANONYMIZE_TABLES) {
        const r = await client.query(
          `UPDATE public.${table} SET user_id = NULL WHERE user_id = $1::uuid`,
          [userId],
        );
        anonymized[table] = r.rowCount ?? 0;
      }

      const tomb = await client.query(
        `UPDATE public.users
            SET status = 'deleted',
                email = NULL,
                phone_e164 = NULL,
                password_hash = NULL,
                referral_code = NULL,
                anonymized_at = now(),
                deleted_reason = 'user_requested',
                updated_at = now()
          WHERE id = $1::uuid
          RETURNING id`,
        [userId],
      );
      if (!tomb.rows[0]) {
        throw new NotFoundException("user not found");
      }

      return {
        ok: true as const,
        status: "deleted" as const,
        purged,
        anonymized,
        retainedNote:
          "KYC/ledger/accounting/admin-audit-trail/financial-transaction-history retained per §20/§21",
      };
    });
  }

  /**
   * Retained rows that point at soon-to-be-purged rows must be de-referenced
   * first, or the DELETE below would violate a NO ACTION foreign key.
   * support_tickets.linked_trade_id -> trade_executions is the only such edge
   * (verified against every purge-target table; see privacy-purge.cjs).
   */
  private async dereferenceRetainedRows(
    client: PoolClient,
    userId: string,
  ): Promise<void> {
    await client.query(
      `UPDATE public.support_tickets
          SET linked_trade_id = NULL
        WHERE user_id = $1::uuid
          AND linked_trade_id IS NOT NULL`,
      [userId],
    );
  }
}
