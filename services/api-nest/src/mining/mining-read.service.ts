import { Injectable, NotFoundException } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { addAmount, cmpAmount } from "../ledger/ledger.money";
import { MiningProfitEngineService } from "./mining-profit-engine.service";

type MineReadRow = {
  id: string;
  display_name: string;
  description: string;
  asset_code: string;
  status: string;
  min_position_usdt: string | null;
  max_position_usdt: string | null;
  current_daily_rate: string | null;
};

type PositionReadRow = {
  id: string;
  mine_id: string;
  status: string;
  principal_usdt: string;
  started_at: string | Date | null;
  ended_at: string | Date | null;
  asset_code: string;
  current_daily_rate: string | null;
  rate_effective_at: string | Date | null;
  last_complete_settlement_at: string | Date | null;
  last_event_at: string | Date | null;
};

type RateReadRow = {
  daily_rate: string;
  effective_at: string | Date;
  ended_at: string | Date | null;
};

type SettlementReadRow = {
  id: string;
  position_id: string;
  status: string;
  period_start: string | Date;
  period_end: string | Date;
  calculated_profit_usdt: string;
  credited_profit_usdt: string;
  ledger_journal_id: string | null;
  asset_code: string;
};

function toIso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function latestIso(values: Array<string | Date | null>): string | null {
  let latest: Date | null = null;
  for (const value of values) {
    const text = toIso(value);
    if (!text) continue;
    const date = new Date(text);
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  return latest?.toISOString() ?? null;
}

function nextUtcMidnight(now: Date): string {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
    ),
  ).toISOString();
}

@Injectable()
export class MiningReadService {
  constructor(
    private readonly db: PostgresService,
    private readonly engine: MiningProfitEngineService,
  ) {}

  async listMines() {
    const result = await this.db.query<MineReadRow>(
      `SELECT m.id::text, m.display_name, m.description, m.asset_code, m.status,
              m.min_position_usdt::text, m.max_position_usdt::text,
              (SELECT r.daily_rate::text
                 FROM public.mine_rate_versions r
                WHERE r.mine_id=m.id
                  AND (r.status='ACTIVE'
                       OR (r.status='SCHEDULED' AND r.approved_at IS NOT NULL))
                  AND r.effective_at <= now()
                ORDER BY r.effective_at DESC
                LIMIT 1) AS current_daily_rate
         FROM public.mines m
        WHERE m.published_at IS NOT NULL
          AND m.status IN ('ACTIVE','NEW_POSITIONS_PAUSED','PAUSED')
        ORDER BY m.display_order, m.id`,
    );
    return { items: result.rows.map((row) => this.minePublic(row)) };
  }

  async getMine(mineId: string) {
    const result = await this.db.query<MineReadRow>(
      `SELECT m.id::text, m.display_name, m.description, m.asset_code, m.status,
              m.min_position_usdt::text, m.max_position_usdt::text,
              (SELECT r.daily_rate::text
                 FROM public.mine_rate_versions r
                WHERE r.mine_id=m.id
                  AND (r.status='ACTIVE'
                       OR (r.status='SCHEDULED' AND r.approved_at IS NOT NULL))
                  AND r.effective_at <= now()
                ORDER BY r.effective_at DESC
                LIMIT 1) AS current_daily_rate
         FROM public.mines m
        WHERE m.id=$1::uuid AND m.published_at IS NOT NULL`,
      [mineId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("광산을 찾을 수 없습니다.");
    return this.minePublic(row);
  }

  async getSummary(userId: string) {
    const [wallet, positions, settlements] = await Promise.all([
      this.db.query<{
        principal_usdt: string;
        profit_usdt: string;
        locked_usdt: string;
      }>(
        `SELECT principal_usdt::text, profit_usdt::text, locked_usdt::text
           FROM public.mining_wallet_liability
          WHERE user_id=$1::uuid`,
        [userId],
      ),
      this.db.query<{ active_count: string; active_principal: string }>(
        `SELECT count(*) FILTER (WHERE status='ACTIVE')::text AS active_count,
                COALESCE(sum(principal_usdt) FILTER (WHERE status='ACTIVE'),0)::text AS active_principal
           FROM public.mine_positions
          WHERE user_id=$1::uuid`,
        [userId],
      ),
      this.db.query<{ settled_profit: string; last_settled_at: string | Date | null }>(
        `SELECT COALESCE(sum(credited_profit_usdt) FILTER (WHERE status='LEDGER_POSTED'),0)::text AS settled_profit,
                max(period_end) FILTER (WHERE status='LEDGER_POSTED') AS last_settled_at
           FROM public.mine_settlements
          WHERE user_id=$1::uuid`,
        [userId],
      ),
    ]);
    return {
      assetCode: "USDT",
      principalAmount: wallet.rows[0]?.principal_usdt ?? "0",
      profitAmount: wallet.rows[0]?.profit_usdt ?? "0",
      lockedPrincipalAmount: wallet.rows[0]?.locked_usdt ?? "0",
      activePrincipalAmount: positions.rows[0]?.active_principal ?? "0",
      activePositionCount: Number(positions.rows[0]?.active_count ?? 0),
      settledProfitAmount: settlements.rows[0]?.settled_profit ?? "0",
      lastSettledAt: toIso(settlements.rows[0]?.last_settled_at ?? null),
    };
  }

  async listPositions(userId: string, limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 20, 1), 50);
    const result = await this.db.query<PositionReadRow>(
      `${this.positionSelect()}
        WHERE p.user_id=$1::uuid
        ORDER BY p.created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
    const now = new Date();
    const items = [];
    for (const row of result.rows) items.push(await this.positionPublic(row, now));
    return { items };
  }

  async getPosition(userId: string, positionId: string) {
    const result = await this.db.query<PositionReadRow>(
      `${this.positionSelect()}
        WHERE p.id=$1::uuid AND p.user_id=$2::uuid`,
      [positionId, userId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    return this.positionPublic(row, new Date());
  }

  async listSettlements(userId: string, limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const result = await this.db.query<SettlementReadRow>(
      `SELECT s.id::text, s.position_id::text, s.status, s.period_start, s.period_end,
              s.calculated_profit_usdt::text, s.credited_profit_usdt::text,
              s.ledger_journal_id::text, m.asset_code
         FROM public.mine_settlements s
         JOIN public.mines m ON m.id=s.mine_id
        WHERE s.user_id=$1::uuid
        ORDER BY s.period_end DESC, s.id DESC
        LIMIT $2`,
      [userId, limit],
    );
    return { items: result.rows.map((row) => this.settlementPublic(row)) };
  }

  private positionSelect(): string {
    return `SELECT p.id::text, p.mine_id::text, p.status, p.principal_usdt::text,
                   p.started_at, p.ended_at, m.asset_code,
                   rate.daily_rate AS current_daily_rate,
                   rate.effective_at AS rate_effective_at,
                   settled.period_end AS last_complete_settlement_at,
                   event.effective_at AS last_event_at
              FROM public.mine_positions p
              JOIN public.mines m ON m.id=p.mine_id
              LEFT JOIN LATERAL (
                SELECT r.daily_rate::text AS daily_rate, r.effective_at
                  FROM public.mine_rate_versions r
                 WHERE r.mine_id=p.mine_id
                   AND (r.status='ACTIVE'
                        OR (r.status='SCHEDULED' AND r.approved_at IS NOT NULL))
                   AND r.effective_at <= now()
                 ORDER BY r.effective_at DESC
                 LIMIT 1
              ) rate ON true
              LEFT JOIN LATERAL (
                SELECT s.period_end
                  FROM public.mine_settlements s
                 WHERE s.position_id=p.id
                   AND (s.status='LEDGER_POSTED'
                        OR (s.status='CALCULATED' AND s.calculated_profit_usdt=0))
                 ORDER BY s.period_end DESC
                 LIMIT 1
              ) settled ON true
              LEFT JOIN LATERAL (
                SELECT e.effective_at
                  FROM public.mine_position_events e
                 WHERE e.position_id=p.id
                 ORDER BY e.effective_at DESC, e.created_at DESC
                 LIMIT 1
              ) event ON true`;
  }

  private minePublic(row: MineReadRow) {
    return {
      mineId: row.id,
      status: row.status,
      displayName: row.display_name,
      description: row.description,
      assetCode: row.asset_code,
      minPrincipalAmount: row.min_position_usdt,
      maxPrincipalAmount: row.max_position_usdt,
      currentDailyRate: row.current_daily_rate,
    };
  }

  private async positionPublic(row: PositionReadRow, now: Date) {
    const active = row.status === "ACTIVE" && cmpAmount(row.principal_usdt, "0") > 0;
    const baselineAt = latestIso([
      row.started_at,
      row.last_complete_settlement_at,
      row.last_event_at,
    ]);
    const accruedProfitAmount =
      active && baselineAt
        ? await this.calculateLiveAccrued(row.mine_id, row.principal_usdt, baselineAt, now)
        : "0";
    return {
      positionId: row.id,
      mineId: row.mine_id,
      status: row.status,
      principalAmount: row.principal_usdt,
      assetCode: row.asset_code,
      currentDailyRate: row.current_daily_rate,
      accruedProfitAmount,
      baselineAt,
      nextSettlementAt: active ? nextUtcMidnight(now) : null,
      endedAt: toIso(row.ended_at),
    };
  }

  private async calculateLiveAccrued(
    mineId: string,
    principalAmount: string,
    baselineAt: string,
    now: Date,
  ): Promise<string> {
    const startMs = Date.parse(baselineAt);
    const endMs = now.getTime();
    if (!Number.isFinite(startMs) || endMs <= startMs) return "0";

    const rates = await this.db.query<RateReadRow>(
      `SELECT daily_rate::text,effective_at,ended_at
         FROM public.mine_rate_versions
        WHERE mine_id=$1::uuid
          AND effective_at IS NOT NULL
          AND effective_at < $3::timestamptz
          AND (ended_at IS NULL OR ended_at > $2::timestamptz)
          AND (status IN ('ACTIVE','ENDED')
               OR (status='SCHEDULED' AND approved_at IS NOT NULL))
        ORDER BY effective_at ASC`,
      [mineId, baselineAt, now.toISOString()],
    );
    if (rates.rows.length === 0) return "0";

    const boundaries = new Set<number>([startMs, endMs]);
    for (const rate of rates.rows) {
      const effectiveMs = new Date(rate.effective_at).getTime();
      const endedMs = rate.ended_at ? new Date(rate.ended_at).getTime() : null;
      if (effectiveMs > startMs && effectiveMs < endMs) boundaries.add(effectiveMs);
      if (endedMs !== null && endedMs > startMs && endedMs < endMs) boundaries.add(endedMs);
    }

    const ordered = [...boundaries].sort((a, b) => a - b);
    let total = "0";
    for (let index = 0; index + 1 < ordered.length; index += 1) {
      const segmentStart = ordered[index]!;
      const segmentEnd = ordered[index + 1]!;
      if (segmentEnd <= segmentStart) continue;
      const rate = [...rates.rows]
        .reverse()
        .find((candidate) => {
          const effectiveMs = new Date(candidate.effective_at).getTime();
          const endedMs = candidate.ended_at
            ? new Date(candidate.ended_at).getTime()
            : null;
          return effectiveMs <= segmentStart && (endedMs === null || endedMs > segmentStart);
        });
      if (!rate) continue;
      const profit = await this.engine.calculate({
        principalUsdt: principalAmount,
        dailyRate: rate.daily_rate,
        periodStartMicros: BigInt(segmentStart) * 1_000n,
        periodEndMicros: BigInt(segmentEnd) * 1_000n,
      });
      total = addAmount(total, profit);
    }
    return total;
  }

  private settlementPublic(row: SettlementReadRow) {
    return {
      settlementId: row.id,
      positionId: row.position_id,
      status: row.status,
      periodStartAt: toIso(row.period_start),
      periodEndAt: toIso(row.period_end),
      profitAmount:
        row.status === "LEDGER_POSTED"
          ? row.credited_profit_usdt
          : row.calculated_profit_usdt,
      assetCode: row.asset_code,
      ledgerJournalId: row.ledger_journal_id,
    };
  }
}
