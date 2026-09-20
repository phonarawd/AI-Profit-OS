import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

type DueRate = {
  id: string;
  mine_id: string;
  effective_at: string | Date;
};

function iso(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid scheduled rate time");
  return date.toISOString();
}

@Injectable()
export class MiningRateActivationService {
  constructor(private readonly db: PostgresService) {}

  async activateDue(now = new Date()) {
    const due = await this.db.query<DueRate>(
      `SELECT id::text,mine_id::text,effective_at
         FROM public.mine_rate_versions
        WHERE status='SCHEDULED'
          AND approved_at IS NOT NULL
          AND effective_at IS NOT NULL
          AND effective_at <= $1::timestamptz
        ORDER BY mine_id,effective_at,id`,
      [now.toISOString()],
    );

    let activated = 0;
    for (const candidate of due.rows) {
      const changed = await this.db.withTransaction(async (client) => {
        await client.query(`SELECT id FROM public.mines WHERE id=$1::uuid FOR UPDATE`, [candidate.mine_id]);
        const current = await client.query<DueRate & { status: string; approved_at: string | Date | null }>(
          `SELECT id::text,mine_id::text,status,effective_at,approved_at
             FROM public.mine_rate_versions
            WHERE id=$1::uuid AND mine_id=$2::uuid
            FOR UPDATE`,
          [candidate.id, candidate.mine_id],
        );
        const row = current.rows[0];
        if (!row || row.status !== "SCHEDULED" || !row.approved_at) return false;
        const effective = iso(row.effective_at);
        if (Date.parse(effective) > now.getTime()) return false;

        await client.query(
          `UPDATE public.mine_rate_versions
              SET status='ENDED',ended_at=$3::timestamptz
            WHERE mine_id=$1::uuid
              AND status='ACTIVE'
              AND id <> $2::uuid`,
          [row.mine_id, row.id, effective],
        );
        await client.query(
          `UPDATE public.mine_rate_versions
              SET status='ACTIVE',ended_at=NULL
            WHERE id=$1::uuid AND mine_id=$2::uuid AND status='SCHEDULED'`,
          [row.id, row.mine_id],
        );
        return true;
      });
      if (changed) activated += 1;
    }

    return { checked: due.rows.length, activated, through: now.toISOString() };
  }
}
