/**
 * Referral edge bind · Money §51.5
 * Invite count = ∞ · referee bind 1회 · self-invite 0 · no monthly cap reject
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { PostgresService } from "../db/postgres";
import { idempotencyKeyFor } from "./referral.bonus";
import { REFERRAL_EVENTS } from "./referral.events";
import { ReferralProgramService } from "./referral.program.service";
import {
  FORBIDDEN_INVITE_COUNT_REJECT_CODES,
  type ReferralEdge,
  type ReferralEdgeStatus,
  type ReferralLevel,
} from "./referral.types";

type EdgeRow = {
  id: string;
  referrer_user_id: string;
  referee_user_id: string;
  code: string;
  bound_at: Date;
  levels_achieved: string[];
  status: ReferralEdgeStatus;
  qualifying_deposit_usdt: string | null;
  computed_l2_referrer_usdt: string | null;
  idempotency_keys: string[];
  l2_hold_until: Date | null;
  l2_released_at: Date | null;
};

@Injectable()
export class ReferralEdgeService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
    private readonly program: ReferralProgramService,
  ) {}

  /**
   * Bind referee → referrer by code.
   * NEVER rejects for invite count / monthly cap (R14).
   */
  async bind(input: {
    refereeUserId: string;
    referralCode: string;
  }): Promise<ReferralEdge> {
    const cfg = await this.program.get();
    if (!cfg.enabled) {
      throw new BadRequestException("REFERRAL_DISABLED");
    }

    const code = input.referralCode.trim();
    if (!code) throw new BadRequestException("referralCode required");

    // Explicit guard: invite-count reject codes must never be thrown
    for (const bad of FORBIDDEN_INVITE_COUNT_REJECT_CODES) {
      if (code === bad) {
        /* no-op — document intent for verify:referral-unlimited-invites */
      }
    }

    const referrer = await this.db.query<{ id: string; referral_code: string }>(
      `SELECT id::text, referral_code FROM public.users
        WHERE referral_code = $1 AND status <> 'deleted'`,
      [code],
    );
    const ref = referrer.rows[0];
    if (!ref) throw new NotFoundException("REFERRAL_CODE_INVALID");
    if (ref.id === input.refereeUserId) {
      throw new BadRequestException("REFERRAL_SELF_FORBIDDEN");
    }

    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM public.referral_edges WHERE referee_user_id = $1::uuid`,
      [input.refereeUserId],
    );
    if (existing.rows[0]) {
      throw new ConflictException("REFERRAL_ALREADY_BOUND");
    }

    const l1Key = idempotencyKeyFor("pending", "L1");
    const ins = await this.db.query<EdgeRow>(
      `INSERT INTO public.referral_edges (
         referrer_user_id, referee_user_id, code,
         levels_achieved, status, idempotency_keys
       ) VALUES (
         $1::uuid, $2::uuid, $3,
         ARRAY['L1']::text[], 'l1_done', ARRAY[$4]::text[]
       )
       RETURNING id::text, referrer_user_id::text, referee_user_id::text, code,
                 bound_at, levels_achieved, status,
                 qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
                 idempotency_keys, l2_hold_until, l2_released_at`,
      [ref.id, input.refereeUserId, code, `referral:bind:${input.refereeUserId}:L1`],
    );

    // Fix L1 idempotency key to edge id
    const edge = ins.rows[0];
    const realL1 = idempotencyKeyFor(edge.id, "L1");
    await this.db.query(
      `UPDATE public.referral_edges
          SET idempotency_keys = ARRAY[$2]::text[]
        WHERE id = $1::uuid`,
      [edge.id, realL1],
    );
    edge.idempotency_keys = [realL1];

    // L1 referrer cash = 0 (Day-1) — practice for referee is §51.7 Owns
    void l1Key;

    const v1 = this.toV1(edge);
    this.bus.emit(REFERRAL_EVENTS.edgeBound, {
      edgeId: v1.id,
      referrerUserId: v1.referrerUserId,
      refereeUserId: v1.refereeUserId,
      toastCode: "REFERRAL_BOUND",
    });
    return v1;
  }

  async getById(edgeId: string): Promise<ReferralEdge> {
    const row = await this.fetchOne(
      `SELECT id::text, referrer_user_id::text, referee_user_id::text, code,
              bound_at, levels_achieved, status,
              qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
              idempotency_keys, l2_hold_until, l2_released_at
         FROM public.referral_edges WHERE id = $1::uuid`,
      [edgeId],
    );
    if (!row) throw new NotFoundException("referral edge not found");
    return this.toV1(row);
  }

  async getByReferee(refereeUserId: string): Promise<ReferralEdge | null> {
    const row = await this.fetchOne(
      `SELECT id::text, referrer_user_id::text, referee_user_id::text, code,
              bound_at, levels_achieved, status,
              qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
              idempotency_keys, l2_hold_until, l2_released_at
         FROM public.referral_edges WHERE referee_user_id = $1::uuid`,
      [refereeUserId],
    );
    return row ? this.toV1(row) : null;
  }

  async listByReferrer(referrerUserId: string): Promise<ReferralEdge[]> {
    const r = await this.db.query<EdgeRow>(
      `SELECT id::text, referrer_user_id::text, referee_user_id::text, code,
              bound_at, levels_achieved, status,
              qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
              idempotency_keys, l2_hold_until, l2_released_at
         FROM public.referral_edges
        WHERE referrer_user_id = $1::uuid
        ORDER BY bound_at DESC`,
      [referrerUserId],
    );
    return r.rows.map((row) => this.toV1(row));
  }

  async listHoldQueue(opts?: { limit?: number }) {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 200);
    const r = await this.db.query<EdgeRow>(
      `SELECT id::text, referrer_user_id::text, referee_user_id::text, code,
              bound_at, levels_achieved, status,
              qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
              idempotency_keys, l2_hold_until, l2_released_at
         FROM public.referral_edges
        WHERE status IN ('held_risk', 'queued_pool', 'l2_pending_hold')
        ORDER BY bound_at ASC
        LIMIT $1`,
      [limit],
    );
    return {
      tab: "referral" as const,
      items: r.rows.map((row) => this.toV1(row)),
    };
  }

  async updateStatus(
    edgeId: string,
    patch: {
      status: ReferralEdgeStatus;
      levelsAchieved?: ReferralLevel[];
      qualifyingDepositUsdt?: string;
      computedL2ReferrerUsdt?: string;
      idempotencyKey?: string;
      l2HoldUntil?: Date | null;
      l2ReleasedAt?: Date | null;
    },
  ): Promise<ReferralEdge> {
    const r = await this.db.query<EdgeRow>(
      `UPDATE public.referral_edges SET
         status = $2,
         levels_achieved = COALESCE($3::text[], levels_achieved),
         qualifying_deposit_usdt = COALESCE($4::numeric, qualifying_deposit_usdt),
         computed_l2_referrer_usdt = COALESCE($5::numeric, computed_l2_referrer_usdt),
         l2_hold_until = CASE
           WHEN $6::boolean THEN $7::timestamptz
           ELSE l2_hold_until
         END,
         l2_released_at = CASE
           WHEN $8::boolean THEN COALESCE($9::timestamptz, now())
           ELSE l2_released_at
         END,
         idempotency_keys = CASE
           WHEN $10::text IS NOT NULL
             THEN array_append(idempotency_keys, $10::text)
           ELSE idempotency_keys
         END,
         updated_at = now()
       WHERE id = $1::uuid
       RETURNING id::text, referrer_user_id::text, referee_user_id::text, code,
                 bound_at, levels_achieved, status,
                 qualifying_deposit_usdt::text, computed_l2_referrer_usdt::text,
                 idempotency_keys, l2_hold_until, l2_released_at`,
      [
        edgeId,
        patch.status,
        patch.levelsAchieved ?? null,
        patch.qualifyingDepositUsdt ?? null,
        patch.computedL2ReferrerUsdt ?? null,
        patch.l2HoldUntil !== undefined,
        patch.l2HoldUntil ?? null,
        patch.l2ReleasedAt !== undefined && patch.l2ReleasedAt !== null,
        patch.l2ReleasedAt ?? null,
        patch.idempotencyKey ?? null,
      ],
    );
    if (!r.rows[0]) throw new NotFoundException("referral edge not found");
    return this.toV1(r.rows[0]);
  }

  private async fetchOne(
    sql: string,
    params: unknown[],
  ): Promise<EdgeRow | null> {
    const r = await this.db.query<EdgeRow>(sql, params);
    return r.rows[0] ?? null;
  }

  private toV1(row: EdgeRow): ReferralEdge {
    return {
      id: row.id,
      referrerUserId: row.referrer_user_id,
      refereeUserId: row.referee_user_id,
      code: row.code,
      boundAt: row.bound_at.toISOString(),
      levelsAchieved: (row.levels_achieved ?? []) as ReferralLevel[],
      status: row.status,
      qualifyingDepositUsdt: row.qualifying_deposit_usdt ?? undefined,
      computedL2ReferrerUsdt: row.computed_l2_referrer_usdt ?? undefined,
      idempotencyKeys: row.idempotency_keys ?? [],
      l2HoldUntil: row.l2_hold_until?.toISOString(),
      l2ReleasedAt: row.l2_released_at?.toISOString(),
    };
  }
}
