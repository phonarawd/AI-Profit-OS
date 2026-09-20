import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { PostgresService, type DbQuerier } from "../db/postgres";
import {
  addAmount,
  assertAmountUsdt,
  cmpAmount,
  formatAmount,
  parseAmount,
  subAmount,
} from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { MiningProfitEngineService } from "./mining-profit-engine.service";

const CALC_VERSION = "mine-profit-v1";
const USER_MESSAGE = "요청을 처리할 수 없습니다.";
const SETTLEMENT_MESSAGE = "정산을 완료할 수 없습니다.";

type PositionRow = {
  id: string;
  user_id: string;
  mine_id: string;
  status: string;
  requested_principal_usdt: string;
  principal_usdt: string;
  start_idempotency_key: string;
  started_at: string | Date | null;
  ended_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type SettlementRow = {
  id: string;
  position_id: string;
  user_id: string;
  mine_id: string;
  status: string;
  period_start: string | Date;
  period_end: string | Date;
  calculated_profit_usdt: string;
  credited_profit_usdt: string;
  idempotency_key: string;
  ledger_journal_id: string | null;
  attempt_count: number;
  failure_code: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type EventSegmentRow = {
  event_type: string;
  principal_after_usdt: string;
  effective_at: string;
  effective_micros: string;
};

type RateSegmentRow = {
  id: string;
  daily_rate: string;
  effective_at: string;
  effective_micros: string;
  ended_at: string | null;
  ended_micros: string | null;
};

type CalculatedSegment = {
  rateVersionId: string;
  periodStart: string;
  periodEnd: string;
  principalUsdt: string;
  dailyRate: string;
  accruedProfitUsdt: string;
  calcFingerprint: string;
};

function iso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("invalid timestamp");
  return date.toISOString();
}

function positiveAmount(raw: unknown, field: string): string {
  try {
    return assertAmountUsdt(String(raw ?? ""), field);
  } catch {
    throw new BadRequestException("금액을 확인해 주세요.");
  }
}

function requestKey(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 200) {
    throw new BadRequestException("요청 키가 필요합니다.");
  }
  return value;
}

function hash(parts: readonly string[]): string {
  return createHash("sha256").update(parts.join("\u001f"), "utf8").digest("hex");
}

function microsFromIso(value: string): bigint {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error("invalid timestamp");
  return BigInt(ms) * 1_000n;
}

function compareBigint(a: bigint, b: bigint): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

@Injectable()
export class MiningService {
  constructor(
    private readonly db: PostgresService,
    private readonly ledger: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly engine: MiningProfitEngineService,
  ) {}

  async listMines() {
    const res = await this.db.query<{
      id: string;
      code: string;
      display_name: string;
      description: string;
      asset_code: string;
      status: string;
      min_position_usdt: string | null;
      max_position_usdt: string | null;
      daily_rate: string | null;
      published_at: string | Date | null;
    }>(
      `SELECT m.id::text, m.code, m.display_name, m.description, m.asset_code, m.status,
              m.min_position_usdt::text, m.max_position_usdt::text, m.published_at,
              (SELECT r.daily_rate::text
                 FROM public.mine_rate_versions r
                WHERE r.mine_id = m.id
                  AND r.status = 'ACTIVE'
                  AND r.effective_at <= now()
                ORDER BY r.effective_at DESC
                LIMIT 1) AS daily_rate
         FROM public.mines m
        WHERE m.published_at IS NOT NULL
        ORDER BY m.display_order ASC, m.created_at ASC`,
    );
    return { items: res.rows.map((row) => this.minePublic(row)) };
  }

  async getMine(mineId: string) {
    const res = await this.db.query<{
      id: string;
      code: string;
      display_name: string;
      description: string;
      asset_code: string;
      status: string;
      min_position_usdt: string | null;
      max_position_usdt: string | null;
      daily_rate: string | null;
      published_at: string | Date | null;
    }>(
      `SELECT m.id::text, m.code, m.display_name, m.description, m.asset_code, m.status,
              m.min_position_usdt::text, m.max_position_usdt::text, m.published_at,
              (SELECT r.daily_rate::text
                 FROM public.mine_rate_versions r
                WHERE r.mine_id = m.id
                  AND r.status = 'ACTIVE'
                  AND r.effective_at <= now()
                ORDER BY r.effective_at DESC
                LIMIT 1) AS daily_rate
         FROM public.mines m
        WHERE m.id = $1::uuid AND m.published_at IS NOT NULL`,
      [mineId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException("광산을 찾을 수 없습니다.");
    return this.minePublic(row);
  }

  async getSummary(userId: string) {
    const [wallet, positions, settlements] = await Promise.all([
      this.db.query<{
        principal_usdt: string;
        profit_usdt: string;
        locked_usdt: string;
        real_liability_usdt: string;
      }>(
        `SELECT principal_usdt::text, profit_usdt::text, locked_usdt::text,
                real_liability_usdt::text
           FROM public.mining_wallet_liability
          WHERE user_id = $1::uuid`,
        [userId],
      ),
      this.db.query<{ active_count: string; active_principal: string }>(
        `SELECT count(*) FILTER (WHERE status = 'ACTIVE')::text AS active_count,
                COALESCE(sum(principal_usdt) FILTER (WHERE status = 'ACTIVE'), 0)::text AS active_principal
           FROM public.mine_positions
          WHERE user_id = $1::uuid`,
        [userId],
      ),
      this.db.query<{ credited: string; last_settled_at: string | Date | null }>(
        `SELECT COALESCE(sum(credited_profit_usdt) FILTER (WHERE status = 'LEDGER_POSTED'), 0)::text AS credited,
                max(period_end) FILTER (WHERE status IN ('LEDGER_POSTED','CALCULATED')) AS last_settled_at
           FROM public.mine_settlements
          WHERE user_id = $1::uuid`,
        [userId],
      ),
    ]);
    const w = wallet.rows[0];
    const p = positions.rows[0];
    const s = settlements.rows[0];
    return {
      wallet: {
        principalUsdt: w?.principal_usdt ?? "0",
        profitUsdt: w?.profit_usdt ?? "0",
        lockedUsdt: w?.locked_usdt ?? "0",
        realLiabilityUsdt: w?.real_liability_usdt ?? "0",
      },
      activePositionCount: Number(p?.active_count ?? 0),
      activePrincipalUsdt: p?.active_principal ?? "0",
      creditedMiningProfitUsdt: s?.credited ?? "0",
      lastSettledAt: iso(s?.last_settled_at ?? null),
    };
  }

  async listPositions(userId: string, limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const res = await this.db.query<PositionRow & { mine_code: string; mine_name: string }>(
      `SELECT p.id::text, p.user_id::text, p.mine_id::text, p.status,
              p.requested_principal_usdt::text, p.principal_usdt::text,
              p.start_idempotency_key, p.started_at, p.ended_at, p.created_at, p.updated_at,
              m.code AS mine_code, m.display_name AS mine_name
         FROM public.mine_positions p
         JOIN public.mines m ON m.id = p.mine_id
        WHERE p.user_id = $1::uuid
        ORDER BY p.created_at DESC
        LIMIT $2`,
      [userId, limit],
    );
    return { items: res.rows.map((row) => this.positionPublic(row)) };
  }

  async getPosition(userId: string, positionId: string) {
    const res = await this.db.query<PositionRow & { mine_code: string; mine_name: string }>(
      `SELECT p.id::text, p.user_id::text, p.mine_id::text, p.status,
              p.requested_principal_usdt::text, p.principal_usdt::text,
              p.start_idempotency_key, p.started_at, p.ended_at, p.created_at, p.updated_at,
              m.code AS mine_code, m.display_name AS mine_name
         FROM public.mine_positions p
         JOIN public.mines m ON m.id = p.mine_id
        WHERE p.id = $1::uuid AND p.user_id = $2::uuid`,
      [positionId, userId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    return this.positionPublic(row);
  }

  async listSettlements(userId: string, limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const res = await this.db.query<SettlementRow>(
      `SELECT id::text, position_id::text, user_id::text, mine_id::text, status,
              period_start, period_end, calculated_profit_usdt::text,
              credited_profit_usdt::text, idempotency_key, ledger_journal_id::text,
              attempt_count, failure_code, created_at, updated_at
         FROM public.mine_settlements
        WHERE user_id = $1::uuid
        ORDER BY period_end DESC
        LIMIT $2`,
      [userId, limit],
    );
    return { items: res.rows.map((row) => this.settlementPublic(row)) };
  }

  async startPosition(input: {
    userId: string;
    mineId: string;
    principalUsdt: unknown;
    idempotencyKey: unknown;
  }) {
    const principal = positiveAmount(input.principalUsdt, "principalUsdt");
    const idem = requestKey(input.idempotencyKey);
    const mine = await this.requireOpenMine(input.mineId);
    this.assertWithinMineLimits(principal, mine.min_position_usdt, mine.max_position_usdt);
    await this.provision.provisionUserBucketAccounts(input.userId);

    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO public.mine_positions (
         user_id, mine_id, status, requested_principal_usdt, principal_usdt, start_idempotency_key
       ) VALUES ($1::uuid,$2::uuid,'START_PENDING',$3::numeric,0,$4)
       ON CONFLICT (start_idempotency_key) DO NOTHING
       RETURNING id::text`,
      [input.userId, input.mineId, principal, idem],
    );
    const positionId = inserted.rows[0]?.id ?? (await this.positionIdByStartKey(idem));
    if (!positionId) throw new ConflictException(USER_MESSAGE);

    const current = await this.loadPosition(positionId);
    if (
      current.user_id !== input.userId ||
      current.mine_id !== input.mineId ||
      cmpAmount(current.requested_principal_usdt, principal) !== 0
    ) {
      throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
    }
    if (current.status === "ACTIVE") return this.getPosition(input.userId, positionId);
    if (current.status !== "START_PENDING") throw new ConflictException(USER_MESSAGE);

    const journal = await this.postUserMoneySafe({
      idempotencyKey: `mine:position:start:${positionId}`,
      journalType: "mine_position_lock",
      lines: [
        { account: { userId: input.userId, bucket: "principal" }, direction: "debit", amountUsdt: principal },
        { account: { userId: input.userId, bucket: "locked" }, direction: "credit", amountUsdt: principal },
      ],
      referenceType: "mine_position",
      referenceId: positionId,
      memo: "mining position start",
      createdBy: input.userId,
    });

    await this.db.withTransaction(async (client) => {
      const locked = await this.lockPosition(client, positionId, input.userId);
      if (locked.status === "ACTIVE") return;
      if (locked.status !== "START_PENDING") throw new ConflictException(USER_MESSAGE);
      const effectiveAt = new Date().toISOString();
      await client.query(
        `INSERT INTO public.mine_position_events (
           position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,
           effective_at,ledger_journal_id,idempotency_key
         ) VALUES ($1::uuid,'START',$2::numeric,0,$2::numeric,$3::timestamptz,$4::uuid,$5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [positionId, principal, effectiveAt, journal.id, `mine:event:start:${positionId}`],
      );
      await client.query(
        `UPDATE public.mine_positions
            SET status='ACTIVE', principal_usdt=$2::numeric, started_at=COALESCE(started_at,$3::timestamptz)
          WHERE id=$1::uuid`,
        [positionId, principal, effectiveAt],
      );
    });
    return this.getPosition(input.userId, positionId);
  }

  async increasePosition(input: {
    userId: string;
    positionId: string;
    amountUsdt: unknown;
    idempotencyKey: unknown;
  }) {
    const amount = positiveAmount(input.amountUsdt, "amountUsdt");
    const idem = requestKey(input.idempotencyKey);
    await this.settlePositionThrough(input.positionId, input.userId, new Date().toISOString());
    await this.provision.provisionUserBucketAccounts(input.userId);

    await this.db.withTransaction(async (client) => {
      const position = await this.lockPosition(client, input.positionId, input.userId);
      const eventKey = `mine:event:increase:${input.positionId}:${idem}`;
      if (await this.eventAlreadyApplied(client, eventKey, "INCREASE", amount)) return;
      if (position.status !== "ACTIVE") throw new ConflictException(USER_MESSAGE);
      const mine = await this.requireMineWithClient(client, position.mine_id);
      const after = addAmount(position.principal_usdt, amount);
      this.assertWithinMineLimits(after, mine.min_position_usdt, mine.max_position_usdt);
      const journal = await this.postUserMoneySafe({
        idempotencyKey: `mine:position:increase:${input.positionId}:${idem}`,
        journalType: "mine_position_lock",
        lines: [
          { account: { userId: input.userId, bucket: "principal" }, direction: "debit", amountUsdt: amount },
          { account: { userId: input.userId, bucket: "locked" }, direction: "credit", amountUsdt: amount },
        ],
        referenceType: "mine_position",
        referenceId: input.positionId,
        memo: "mining position increase",
        createdBy: input.userId,
      });
      const effectiveAt = new Date().toISOString();
      await client.query(
        `INSERT INTO public.mine_position_events (
           position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,
           effective_at,ledger_journal_id,idempotency_key
         ) VALUES ($1::uuid,'INCREASE',$2::numeric,$3::numeric,$4::numeric,$5::timestamptz,$6::uuid,$7)`,
        [input.positionId, amount, position.principal_usdt, after, effectiveAt, journal.id, eventKey],
      );
      await client.query(
        `UPDATE public.mine_positions SET principal_usdt=$2::numeric WHERE id=$1::uuid`,
        [input.positionId, after],
      );
    });
    return this.getPosition(input.userId, input.positionId);
  }

  async decreasePosition(input: {
    userId: string;
    positionId: string;
    amountUsdt: unknown;
    idempotencyKey: unknown;
  }) {
    const amount = positiveAmount(input.amountUsdt, "amountUsdt");
    const idem = requestKey(input.idempotencyKey);
    await this.settlePositionThrough(input.positionId, input.userId, new Date().toISOString());

    await this.db.withTransaction(async (client) => {
      const position = await this.lockPosition(client, input.positionId, input.userId);
      const eventKey = `mine:event:decrease:${input.positionId}:${idem}`;
      if (await this.eventAlreadyApplied(client, eventKey, "DECREASE", amount)) return;
      if (position.status !== "ACTIVE" || cmpAmount(position.principal_usdt, amount) <= 0) {
        throw new BadRequestException("감액 금액을 확인해 주세요.");
      }
      const mine = await this.requireMineWithClient(client, position.mine_id);
      const after = subAmount(position.principal_usdt, amount);
      if (mine.min_position_usdt && cmpAmount(after, mine.min_position_usdt) < 0) {
        throw new BadRequestException("최소 운용 금액보다 작게 감액할 수 없습니다.");
      }
      const journal = await this.postUserMoneySafe({
        idempotencyKey: `mine:position:decrease:${input.positionId}:${idem}`,
        journalType: "mine_position_unlock",
        lines: [
          { account: { userId: input.userId, bucket: "locked" }, direction: "debit", amountUsdt: amount },
          { account: { userId: input.userId, bucket: "principal" }, direction: "credit", amountUsdt: amount },
        ],
        referenceType: "mine_position",
        referenceId: input.positionId,
        memo: "mining position decrease",
        createdBy: input.userId,
      });
      const effectiveAt = new Date().toISOString();
      await client.query(
        `INSERT INTO public.mine_position_events (
           position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,
           effective_at,ledger_journal_id,idempotency_key
         ) VALUES ($1::uuid,'DECREASE',$2::numeric,$3::numeric,$4::numeric,$5::timestamptz,$6::uuid,$7)`,
        [input.positionId, amount, position.principal_usdt, after, effectiveAt, journal.id, eventKey],
      );
      await client.query(
        `UPDATE public.mine_positions SET principal_usdt=$2::numeric WHERE id=$1::uuid`,
        [input.positionId, after],
      );
    });
    return this.getPosition(input.userId, input.positionId);
  }

  async endPosition(input: {
    userId: string;
    positionId: string;
    idempotencyKey: unknown;
  }) {
    const idem = requestKey(input.idempotencyKey);
    await this.settlePositionThrough(input.positionId, input.userId, new Date().toISOString());

    await this.db.withTransaction(async (client) => {
      const position = await this.lockPosition(client, input.positionId, input.userId);
      const eventKey = `mine:event:end:${input.positionId}:${idem}`;
      const existing = await client.query<{ id: string }>(
        `SELECT id::text FROM public.mine_position_events WHERE idempotency_key=$1`,
        [eventKey],
      );
      if (existing.rows[0]) return;
      if (position.status === "ENDED") return;
      if (position.status !== "ACTIVE" || cmpAmount(position.principal_usdt, "0") <= 0) {
        throw new ConflictException(USER_MESSAGE);
      }
      const amount = position.principal_usdt;
      const journal = await this.postUserMoneySafe({
        idempotencyKey: `mine:position:end:${input.positionId}:${idem}`,
        journalType: "mine_position_unlock",
        lines: [
          { account: { userId: input.userId, bucket: "locked" }, direction: "debit", amountUsdt: amount },
          { account: { userId: input.userId, bucket: "principal" }, direction: "credit", amountUsdt: amount },
        ],
        referenceType: "mine_position",
        referenceId: input.positionId,
        memo: "mining position end",
        createdBy: input.userId,
      });
      const effectiveAt = new Date().toISOString();
      await client.query(
        `INSERT INTO public.mine_position_events (
           position_id,event_type,amount_usdt,principal_before_usdt,principal_after_usdt,
           effective_at,ledger_journal_id,idempotency_key
         ) VALUES ($1::uuid,'END',$2::numeric,$2::numeric,0,$3::timestamptz,$4::uuid,$5)`,
        [input.positionId, amount, effectiveAt, journal.id, eventKey],
      );
      await client.query(
        `UPDATE public.mine_positions
            SET status='ENDED', principal_usdt=0, ended_at=$2::timestamptz
          WHERE id=$1::uuid`,
        [input.positionId, effectiveAt],
      );
    });
    return this.getPosition(input.userId, input.positionId);
  }

  async settleDueDaily(now = new Date(), limitRaw = 100) {
    const limit = Math.min(Math.max(Number(limitRaw) || 100, 1), 500);
    const boundary = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const positions = await this.db.query<{ id: string; user_id: string }>(
      `SELECT id::text, user_id::text
         FROM public.mine_positions
        WHERE status='ACTIVE' AND started_at < $1::timestamptz
        ORDER BY started_at ASC
        LIMIT $2`,
      [boundary.toISOString(), limit],
    );
    let settled = 0;
    let failed = 0;
    for (const position of positions.rows) {
      try {
        const result = await this.settlePositionThrough(position.id, position.user_id, boundary.toISOString());
        if (result) settled += 1;
      } catch {
        failed += 1;
      }
    }
    return { checked: positions.rows.length, settled, failed, through: boundary.toISOString() };
  }

  async retrySettlement(settlementId: string) {
    const row = await this.loadSettlement(settlementId);
    return this.processSettlement(row.id);
  }

  async adminListSettlements(limitRaw?: number) {
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 200);
    const res = await this.db.query<SettlementRow>(
      `SELECT id::text, position_id::text, user_id::text, mine_id::text, status,
              period_start, period_end, calculated_profit_usdt::text,
              credited_profit_usdt::text, idempotency_key, ledger_journal_id::text,
              attempt_count, failure_code, created_at, updated_at
         FROM public.mine_settlements
        ORDER BY period_end DESC
        LIMIT $1`,
      [limit],
    );
    return { items: res.rows.map((row) => this.settlementAdmin(row)) };
  }

  async adminGetSettlement(settlementId: string) {
    return this.settlementAdmin(await this.loadSettlement(settlementId));
  }

  private async settlePositionThrough(positionId: string, userId: string, periodEnd: string) {
    const position = await this.loadPosition(positionId);
    if (position.user_id !== userId) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    if (!position.started_at) return null;

    let latest = await this.latestSettlement(positionId);
    if (latest && latest.status !== "LEDGER_POSTED") {
      if (latest.status !== "CALCULATED" || cmpAmount(latest.calculated_profit_usdt, "0") > 0) {
        await this.processSettlement(latest.id);
        latest = await this.latestSettlement(positionId);
      }
    }
    if (latest?.status === "REVIEW_REQUIRED" || latest?.status === "FAILED" || latest?.status === "CALC_PENDING") {
      throw new ServiceUnavailableException(SETTLEMENT_MESSAGE);
    }

    const periodStart = iso(latest?.period_end ?? position.started_at);
    const periodEndIso = iso(periodEnd);
    if (!periodStart || !periodEndIso) return null;
    if (microsFromIso(periodEndIso) <= microsFromIso(periodStart)) return null;

    const idem = `mine:settlement:${positionId}:${hash([periodStart, periodEndIso]).slice(0, 32)}`;
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO public.mine_settlements (
         position_id,user_id,mine_id,status,period_start,period_end,idempotency_key
       ) VALUES ($1::uuid,$2::uuid,$3::uuid,'CALC_PENDING',$4::timestamptz,$5::timestamptz,$6)
       ON CONFLICT (position_id,period_start,period_end) DO NOTHING
       RETURNING id::text`,
      [position.id, position.user_id, position.mine_id, periodStart, periodEndIso, idem],
    );
    const settlementId = inserted.rows[0]?.id ?? (await this.settlementIdByWindow(positionId, periodStart, periodEndIso));
    if (!settlementId) throw new ConflictException(SETTLEMENT_MESSAGE);
    return this.processSettlement(settlementId);
  }

  private async processSettlement(settlementId: string) {
    let settlement = await this.loadSettlement(settlementId);
    if (settlement.status === "LEDGER_POSTED") return this.settlementPublic(settlement);

    await this.db.query(
      `UPDATE public.mine_settlements SET attempt_count=attempt_count+1 WHERE id=$1::uuid`,
      [settlementId],
    );

    try {
      const assigned = await this.db.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.mine_settlement_accruals WHERE settlement_id=$1::uuid`,
        [settlementId],
      );
      if (Number(assigned.rows[0]?.count ?? 0) === 0) {
        await this.calculateAndPersistSettlement(settlement);
      }
      settlement = await this.loadSettlement(settlementId);
      const amount = formatAmount(parseAmount(settlement.calculated_profit_usdt));
      if (cmpAmount(amount, "0") === 0) {
        return this.settlementPublic(settlement);
      }

      await this.provision.provisionUserBucketAccounts(settlement.user_id);
      const journal = await this.ledger.postJournal({
        idempotencyKey: `mine:settlement:ledger:${settlement.id}`,
        journalType: "mine_profit_settlement",
        lines: [
          {
            account: { systemCode: SYSTEM_ACCOUNT_CODES.MINING_POOL },
            direction: "debit",
            amountUsdt: amount,
          },
          {
            account: { userId: settlement.user_id, bucket: "profit" },
            direction: "credit",
            amountUsdt: amount,
          },
        ],
        referenceType: "mine_settlement",
        referenceId: settlement.id,
        memo: "mining profit settlement",
        createdBy: settlement.user_id,
      });

      await this.db.query(
        `UPDATE public.mine_settlements
            SET status='LEDGER_POSTED', credited_profit_usdt=$2::numeric,
                ledger_journal_id=$3::uuid, failure_code=NULL
          WHERE id=$1::uuid AND status <> 'LEDGER_POSTED'`,
        [settlement.id, amount, journal.id],
      );
      return this.settlementPublic(await this.loadSettlement(settlement.id));
    } catch (error) {
      await this.db.query(
        `UPDATE public.mine_settlements
            SET status='FAILED', failure_code='SETTLEMENT_RETRYABLE'
          WHERE id=$1::uuid AND status <> 'LEDGER_POSTED'`,
        [settlementId],
      ).catch(() => undefined);
      if (error instanceof BadRequestException && String(error.message).includes("INSUFFICIENT_BALANCE")) {
        throw new ServiceUnavailableException(SETTLEMENT_MESSAGE);
      }
      throw new ServiceUnavailableException(SETTLEMENT_MESSAGE);
    }
  }

  private async calculateAndPersistSettlement(settlement: SettlementRow) {
    const startIso = iso(settlement.period_start);
    const endIso = iso(settlement.period_end);
    if (!startIso || !endIso) throw new Error("settlement window missing");
    const startMicros = microsFromIso(startIso);
    const endMicros = microsFromIso(endIso);

    const [events, rates] = await Promise.all([
      this.db.query<EventSegmentRow>(
        `SELECT event_type, principal_after_usdt::text,
                effective_at::text,
                floor(extract(epoch from effective_at) * 1000000)::bigint::text AS effective_micros
           FROM public.mine_position_events
          WHERE position_id=$1::uuid AND effective_at <= $2::timestamptz
          ORDER BY effective_at ASC, created_at ASC`,
        [settlement.position_id, endIso],
      ),
      this.db.query<RateSegmentRow>(
        `SELECT id::text, daily_rate::text, effective_at::text,
                floor(extract(epoch from effective_at) * 1000000)::bigint::text AS effective_micros,
                ended_at::text,
                CASE WHEN ended_at IS NULL THEN NULL
                     ELSE floor(extract(epoch from ended_at) * 1000000)::bigint::text END AS ended_micros
           FROM public.mine_rate_versions
          WHERE mine_id=$1::uuid
            AND status IN ('ACTIVE','ENDED')
            AND effective_at IS NOT NULL
            AND effective_at < $3::timestamptz
            AND (ended_at IS NULL OR ended_at > $2::timestamptz)
          ORDER BY effective_at ASC`,
        [settlement.mine_id, startIso, endIso],
      ),
    ]);
    if (events.rows.length === 0 || rates.rows.length === 0) throw new Error("segment source missing");

    const boundaryText = new Map<string, string>([
      [startMicros.toString(), startIso],
      [endMicros.toString(), endIso],
    ]);
    const boundaries = new Set<bigint>([startMicros, endMicros]);
    for (const event of events.rows) {
      const t = BigInt(event.effective_micros);
      if (t > startMicros && t < endMicros) {
        boundaries.add(t);
        boundaryText.set(t.toString(), event.effective_at);
      }
    }
    for (const rate of rates.rows) {
      const effective = BigInt(rate.effective_micros);
      if (effective > startMicros && effective < endMicros) {
        boundaries.add(effective);
        boundaryText.set(effective.toString(), rate.effective_at);
      }
      if (rate.ended_micros && rate.ended_at) {
        const ended = BigInt(rate.ended_micros);
        if (ended > startMicros && ended < endMicros) {
          boundaries.add(ended);
          boundaryText.set(ended.toString(), rate.ended_at);
        }
      }
    }

    const ordered = [...boundaries].sort(compareBigint);
    const segments: CalculatedSegment[] = [];
    let total = "0";
    for (let i = 0; i + 1 < ordered.length; i += 1) {
      const a = ordered[i]!;
      const b = ordered[i + 1]!;
      if (b <= a) continue;
      const event = [...events.rows]
        .reverse()
        .find((candidate) => BigInt(candidate.effective_micros) <= a);
      if (!event || cmpAmount(event.principal_after_usdt, "0") <= 0) continue;
      const rate = [...rates.rows]
        .reverse()
        .find((candidate) => {
          const effective = BigInt(candidate.effective_micros);
          const ended = candidate.ended_micros ? BigInt(candidate.ended_micros) : null;
          return effective <= a && (ended == null || ended > a);
        });
      if (!rate) throw new Error("rate gap");
      const profit = await this.engine.calculate({
        principalUsdt: event.principal_after_usdt,
        dailyRate: rate.daily_rate,
        periodStartMicros: a,
        periodEndMicros: b,
      });
      const periodStart = boundaryText.get(a.toString()) ?? startIso;
      const periodEnd = boundaryText.get(b.toString()) ?? endIso;
      const fingerprint = hash([
        settlement.position_id,
        rate.id,
        a.toString(),
        b.toString(),
        event.principal_after_usdt,
        rate.daily_rate,
        profit,
        CALC_VERSION,
        "half-even",
        "18",
      ]);
      segments.push({
        rateVersionId: rate.id,
        periodStart,
        periodEnd,
        principalUsdt: event.principal_after_usdt,
        dailyRate: rate.daily_rate,
        accruedProfitUsdt: profit,
        calcFingerprint: fingerprint,
      });
      total = addAmount(total, profit);
    }
    if (segments.length === 0) throw new Error("empty settlement segments");

    await this.db.withTransaction(async (client) => {
      for (const segment of segments) {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO public.mine_accruals (
             position_id,user_id,mine_id,rate_version_id,period_start,period_end,
             principal_usdt,daily_rate,accrued_profit_usdt,calc_version,calc_fingerprint
           ) VALUES (
             $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::timestamptz,$6::timestamptz,
             $7::numeric,$8::numeric,$9::numeric,$10,$11
           )
           ON CONFLICT (calc_fingerprint) DO NOTHING
           RETURNING id::text`,
          [
            settlement.position_id,
            settlement.user_id,
            settlement.mine_id,
            segment.rateVersionId,
            segment.periodStart,
            segment.periodEnd,
            segment.principalUsdt,
            segment.dailyRate,
            segment.accruedProfitUsdt,
            CALC_VERSION,
            segment.calcFingerprint,
          ],
        );
        let accrualId = inserted.rows[0]?.id;
        if (!accrualId) {
          const existing = await client.query<{ id: string }>(
            `SELECT id::text FROM public.mine_accruals WHERE calc_fingerprint=$1`,
            [segment.calcFingerprint],
          );
          accrualId = existing.rows[0]?.id;
        }
        if (!accrualId) throw new Error("accrual persistence failed");
        const assignment = await client.query<{ settlement_id: string }>(
          `INSERT INTO public.mine_settlement_accruals (settlement_id,accrual_id,position_id)
           VALUES ($1::uuid,$2::uuid,$3::uuid)
           ON CONFLICT (accrual_id) DO NOTHING
           RETURNING settlement_id::text`,
          [settlement.id, accrualId, settlement.position_id],
        );
        if (!assignment.rows[0]) {
          const existing = await client.query<{ settlement_id: string }>(
            `SELECT settlement_id::text FROM public.mine_settlement_accruals WHERE accrual_id=$1::uuid`,
            [accrualId],
          );
          if (existing.rows[0]?.settlement_id !== settlement.id) {
            throw new Error("accrual already assigned");
          }
        }
      }
      await client.query(
        `UPDATE public.mine_settlements
            SET status='CALCULATED', calculated_profit_usdt=$2::numeric, failure_code=NULL
          WHERE id=$1::uuid`,
        [settlement.id, total],
      );
    });
  }

  private async postUserMoneySafe(input: Parameters<LedgerPostingService["postJournal"]>[0]) {
    try {
      return await this.ledger.postJournal(input);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
      }
      if (error instanceof BadRequestException && String(error.message).includes("INSUFFICIENT_BALANCE")) {
        throw new BadRequestException("사용 가능한 잔액이 부족합니다.");
      }
      throw new ServiceUnavailableException("원장 처리를 완료할 수 없습니다.");
    }
  }

  private async eventAlreadyApplied(client: PoolClient, key: string, type: string, amount: string) {
    const res = await client.query<{ event_type: string; amount_usdt: string }>(
      `SELECT event_type, amount_usdt::text FROM public.mine_position_events WHERE idempotency_key=$1`,
      [key],
    );
    const row = res.rows[0];
    if (!row) return false;
    if (row.event_type !== type || cmpAmount(row.amount_usdt, amount) !== 0) {
      throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
    }
    return true;
  }

  private async lockPosition(client: PoolClient, positionId: string, userId: string): Promise<PositionRow> {
    const res = await client.query<PositionRow>(
      `SELECT id::text,user_id::text,mine_id::text,status,requested_principal_usdt::text,
              principal_usdt::text,start_idempotency_key,started_at,ended_at,created_at,updated_at
         FROM public.mine_positions
        WHERE id=$1::uuid AND user_id=$2::uuid
        FOR UPDATE`,
      [positionId, userId],
    );
    if (!res.rows[0]) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private async loadPosition(positionId: string): Promise<PositionRow> {
    const res = await this.db.query<PositionRow>(
      `SELECT id::text,user_id::text,mine_id::text,status,requested_principal_usdt::text,
              principal_usdt::text,start_idempotency_key,started_at,ended_at,created_at,updated_at
         FROM public.mine_positions WHERE id=$1::uuid`,
      [positionId],
    );
    if (!res.rows[0]) throw new NotFoundException("운용 내역을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private async positionIdByStartKey(key: string) {
    const res = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.mine_positions WHERE start_idempotency_key=$1`,
      [key],
    );
    return res.rows[0]?.id ?? null;
  }

  private async settlementIdByWindow(positionId: string, start: string, end: string) {
    const res = await this.db.query<{ id: string }>(
      `SELECT id::text FROM public.mine_settlements
        WHERE position_id=$1::uuid AND period_start=$2::timestamptz AND period_end=$3::timestamptz`,
      [positionId, start, end],
    );
    return res.rows[0]?.id ?? null;
  }

  private async latestSettlement(positionId: string): Promise<SettlementRow | null> {
    const res = await this.db.query<SettlementRow>(
      `SELECT id::text,position_id::text,user_id::text,mine_id::text,status,period_start,period_end,
              calculated_profit_usdt::text,credited_profit_usdt::text,idempotency_key,
              ledger_journal_id::text,attempt_count,failure_code,created_at,updated_at
         FROM public.mine_settlements
        WHERE position_id=$1::uuid
        ORDER BY period_end DESC
        LIMIT 1`,
      [positionId],
    );
    return res.rows[0] ?? null;
  }

  private async loadSettlement(settlementId: string): Promise<SettlementRow> {
    const res = await this.db.query<SettlementRow>(
      `SELECT id::text,position_id::text,user_id::text,mine_id::text,status,period_start,period_end,
              calculated_profit_usdt::text,credited_profit_usdt::text,idempotency_key,
              ledger_journal_id::text,attempt_count,failure_code,created_at,updated_at
         FROM public.mine_settlements WHERE id=$1::uuid`,
      [settlementId],
    );
    if (!res.rows[0]) throw new NotFoundException("정산 내역을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private async requireOpenMine(mineId: string) {
    const res = await this.db.query<{
      id: string;
      status: string;
      min_position_usdt: string | null;
      max_position_usdt: string | null;
    }>(
      `SELECT id::text,status,min_position_usdt::text,max_position_usdt::text
         FROM public.mines WHERE id=$1::uuid`,
      [mineId],
    );
    const row = res.rows[0];
    if (!row) throw new NotFoundException("광산을 찾을 수 없습니다.");
    if (row.status !== "ACTIVE") throw new ConflictException("현재 신규 운용을 시작할 수 없습니다.");
    return row;
  }

  private async requireMineWithClient(client: DbQuerier, mineId: string) {
    const res = await client.query<{
      id: string;
      min_position_usdt: string | null;
      max_position_usdt: string | null;
    }>(
      `SELECT id::text,min_position_usdt::text,max_position_usdt::text
         FROM public.mines WHERE id=$1::uuid`,
      [mineId],
    );
    if (!res.rows[0]) throw new NotFoundException("광산을 찾을 수 없습니다.");
    return res.rows[0];
  }

  private assertWithinMineLimits(amount: string, min: string | null, max: string | null) {
    if (min && cmpAmount(amount, min) < 0) throw new BadRequestException("최소 운용 금액을 확인해 주세요.");
    if (max && cmpAmount(amount, max) > 0) throw new BadRequestException("최대 운용 금액을 확인해 주세요.");
  }

  private minePublic(row: {
    id: string;
    code: string;
    display_name: string;
    description: string;
    asset_code: string;
    status: string;
    min_position_usdt: string | null;
    max_position_usdt: string | null;
    daily_rate: string | null;
    published_at: string | Date | null;
  }) {
    return {
      id: row.id,
      code: row.code,
      displayName: row.display_name,
      description: row.description,
      assetCode: row.asset_code,
      status: row.status,
      principalCurrency: "USDT",
      minPositionUsdt: row.min_position_usdt,
      maxPositionUsdt: row.max_position_usdt,
      dailyRate: row.daily_rate,
      publishedAt: iso(row.published_at),
    };
  }

  private positionPublic(row: PositionRow & { mine_code?: string; mine_name?: string }) {
    return {
      id: row.id,
      mineId: row.mine_id,
      mineCode: row.mine_code,
      mineName: row.mine_name,
      status: row.status,
      requestedPrincipalUsdt: row.requested_principal_usdt,
      principalUsdt: row.principal_usdt,
      startedAt: iso(row.started_at),
      endedAt: iso(row.ended_at),
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }

  private settlementPublic(row: SettlementRow) {
    return {
      id: row.id,
      positionId: row.position_id,
      mineId: row.mine_id,
      status: row.status,
      periodStart: iso(row.period_start),
      periodEnd: iso(row.period_end),
      calculatedProfitUsdt: row.calculated_profit_usdt,
      creditedProfitUsdt: row.credited_profit_usdt,
      createdAt: iso(row.created_at),
      updatedAt: iso(row.updated_at),
    };
  }

  private settlementAdmin(row: SettlementRow) {
    return {
      ...this.settlementPublic(row),
      userId: row.user_id,
      attemptCount: row.attempt_count,
      failureCode: row.failure_code,
      ledgerJournalId: row.ledger_journal_id,
    };
  }
}

export { requestKey as requireMiningIdempotencyKey };
