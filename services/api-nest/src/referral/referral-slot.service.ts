/**
 * Invite opportunity slot. Not cash. Separate from ReferralLadderService.
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { ReferralEdgeService } from "./referral.edge.service";

@Injectable()
export class ReferralSlotService {
  constructor(
    private readonly db: PostgresService,
    private readonly edges: ReferralEdgeService,
  ) {}

  /**
   * After referee work ends (success or safe stop).
   * Requires referrer own deposit + referee own deposit. Trial-only friend = 0.
   */
  async tryGrantOnWorkDone(refereeUserId: string): Promise<{ granted: boolean }> {
    const edge = await this.edges.getByReferee(refereeUserId);
    if (!edge) return { granted: false };
    if (edge.status === "clawed_back" || edge.status === "held_risk") {
      return { granted: false };
    }

    const existing = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.referral_slot_grants
        WHERE user_id = $1::uuid`,
      [refereeUserId],
    );
    if (existing.rows[0]) return { granted: false };

    const referrerOk = await this.hasOwnDeposit(edge.referrerUserId);
    const refereeOk = await this.hasOwnDeposit(refereeUserId);
    if (!referrerOk || !refereeOk) return { granted: false };

    await this.db.query(
      `INSERT INTO public.referral_slot_grants (
         user_id, referrer_user_id, edge_id
       ) VALUES ($1::uuid, $2::uuid, $3::uuid)
       ON CONFLICT (user_id) DO NOTHING`,
      [refereeUserId, edge.referrerUserId, edge.id],
    );
    return { granted: true };
  }

  private async hasOwnDeposit(userId: string): Promise<boolean> {
    const r = await this.db.query<{ ok: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM public.ledger_journals j
           JOIN public.ledger_entries e ON e.journal_id = j.id
           JOIN public.ledger_accounts a ON a.id = e.account_id
          WHERE a.owner_user_id = $1::uuid
            AND a.bucket = 'principal'
            AND e.direction = 'credit'
            AND j.journal_type IN ('deposit_usdt', 'deposit_krw')
       ) AS ok`,
      [userId],
    );
    return r.rows[0]?.ok === true;
  }
}
