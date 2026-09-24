import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { PostgresService } from "../db/postgres";
import { KillSwitchService } from "../kill-switch/kill-switch.service";
import {
  addAmount,
  assertAmountUsdt,
  cmpAmount,
} from "../ledger/ledger.money";
import { LedgerPostingService } from "../ledger/ledger.posting.service";
import { LedgerProvisionService } from "../ledger/ledger.provision.service";
import { SYSTEM_ACCOUNT_CODES } from "../ledger/ledger.types";
import { MiningProfitEngineService } from "./mining-profit-engine.service";

const TRIAL_GRANT_KEY = "trial_grant_welcome";
const TRIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

type AdminActor = { adminId: string; role: string };

type TrialConfigRow = {
  id: number;
  welcome_krw: number;
  profit_cap_krw: number;
  default_max_participations: number;
  required_capital_krw_min: number;
  required_capital_krw_max: number;
  updated_at: string | Date;
};

type TrialGrantRow = {
  id: string;
  user_id: string;
  grant_key: string;
  status: "active" | "failed_fx";
  amount_usdt: string | null;
  amount_krw: number | null;
  fx_snapshot_id: string | null;
  grant_journal_id: string | null;
  fail_reason: string | null;
  idempotency_key: string;
  granted_at: string | Date;
};

type TrialSessionRow = {
  id: string;
  user_id: string;
  mine_id: string;
  status: "NOT_STARTED" | "ACTIVE" | "COMPLETED" | "EXPIRED";
  principal_usdt: string;
  accrued_profit_usdt: string;
  idempotency_key: string;
  trial_grant_id: string | null;
  lock_journal_id: string | null;
  unlock_journal_id: string | null;
  started_at: string | Date | null;
  completed_at: string | Date | null;
  expires_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
  mine_code?: string;
  mine_name?: string;
};

type TrialStateRow = {
  max_participations: number;
  participations_used: number;
};

type AuditRow = {
  action: string;
  target_id: string;
  payload: { fingerprint?: string; resourceId?: string } | null;
};

type RatePoint = {
  daily_rate: string;
  effective_micros: string;
};

function iso(value: string | Date | null): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function requestKey(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 200) {
    throw new BadRequestException("요청 키가 필요합니다.");
  }
  return value;
}

function reason(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (value.length < 8 || value.length > 500) {
    throw new BadRequestException("사유를 확인해 주세요.");
  }
  return value;
}

function integerInRange(raw: unknown, label: string, min: number, max: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequestException(`${label} 값을 확인해 주세요.`);
  }
  return value;
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function micros(value: string | Date): bigint {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new ServiceUnavailableException("체험 시간을 확인할 수 없습니다.");
  return BigInt(date.getTime()) * 1_000n;
}

@Injectable()
export class MiningTrialService {
  constructor(
    private readonly db: PostgresService,
    private readonly ledger: LedgerPostingService,
    private readonly provision: LedgerProvisionService,
    private readonly engine: MiningProfitEngineService,
    private readonly killSwitch: KillSwitchService,
  ) {}

  async getStatus(userId: string) {
    const active = await this.latestActiveSession(userId);
    if (active?.expires_at && new Date(active.expires_at).getTime() <= Date.now()) {
      await this.completeSession(active.id, userId);
    }

    const [sessionResult, grantResult, stateResult, config] = await Promise.all([
      this.db.query<TrialSessionRow>(
        `SELECT s.id::text,s.user_id::text,s.mine_id::text,s.status,
                s.principal_usdt::text,s.accrued_profit_usdt::text,s.idempotency_key,
                s.trial_grant_id::text,s.lock_journal_id::text,s.unlock_journal_id::text,
                s.started_at,s.completed_at,s.expires_at,s.created_at,s.updated_at,
                m.code AS mine_code,m.display_name AS mine_name
           FROM public.mine_trial_sessions s
           JOIN public.mines m ON m.id=s.mine_id
          WHERE s.user_id=$1::uuid
          ORDER BY s.created_at DESC LIMIT 1`,
        [userId],
      ),
      this.db.query<TrialGrantRow>(
        `SELECT id::text,user_id::text,grant_key,status,amount_usdt::text,amount_krw,
                fx_snapshot_id,grant_journal_id::text,fail_reason,idempotency_key,granted_at
           FROM public.trial_grants
          WHERE user_id=$1::uuid AND grant_key=$2`,
        [userId, TRIAL_GRANT_KEY],
      ),
      this.db.query<TrialStateRow>(
        `SELECT max_participations,participations_used
           FROM public.trial_user_state WHERE user_id=$1::uuid`,
        [userId],
      ),
      this.getConfigRow(),
    ]);

    const session = sessionResult.rows[0] ?? null;
    const grant = grantResult.rows[0] ?? null;
    const state = stateResult.rows[0] ?? null;
    const maxParticipations = state?.max_participations ?? config.default_max_participations;
    const participationsUsed = state?.participations_used ?? 0;

    return {
      status: session?.status ?? "NOT_STARTED",
      trialSessionId: session?.id ?? null,
      mineId: session?.mine_id ?? null,
      mineCode: session?.mine_code ?? null,
      mineName: session?.mine_name ?? null,
      principalAmount: session?.principal_usdt ?? grant?.amount_usdt ?? null,
      accruedProfitAmount: session?.accrued_profit_usdt ?? "0",
      startedAt: iso(session?.started_at ?? null),
      completesAt: iso(session?.expires_at ?? null),
      completedAt: iso(session?.completed_at ?? null),
      grant: grant
        ? {
            status: grant.status,
            amountKrw: grant.amount_krw,
            amountUsdt: grant.amount_usdt,
            fxSnapshotId: grant.fx_snapshot_id,
            grantedAt: iso(grant.granted_at),
          }
        : null,
      maxParticipations,
      participationsUsed,
      remainingParticipations: Math.max(maxParticipations - participationsUsed, 0),
    };
  }

  async startTrial(input: {
    userId: string;
    mineId: string;
    idempotencyKey: unknown;
  }) {
    await this.killSwitch.assertPath("mining_new_positions");
    const idem = requestKey(input.idempotencyKey);
    const mineId = String(input.mineId ?? "").trim();
    if (!mineId) throw new BadRequestException("광산을 확인해 주세요.");

    const existingByKey = await this.sessionByIdempotency(idem);
    if (existingByKey) {
      this.assertSessionReplay(existingByKey, input.userId, mineId);
      if (existingByKey.status === "NOT_STARTED") {
        await this.activateSession(existingByKey);
      }
      return this.getStatus(input.userId);
    }

    const active = await this.latestActiveSession(input.userId);
    if (active) {
      if (active.expires_at && new Date(active.expires_at).getTime() <= Date.now()) {
        await this.completeSession(active.id, input.userId);
      } else {
        throw new ConflictException("이미 진행 중인 체험 채굴이 있습니다.");
      }
    }

    await this.assertTrialMine(mineId);
    const config = await this.getConfigRow();
    const grant = await this.ensureWelcomeGrant(input.userId, config.welcome_krw);
    if (!grant.amount_usdt || cmpAmount(grant.amount_usdt, "0") <= 0) {
      throw new ServiceUnavailableException("체험 원금을 준비할 수 없습니다.");
    }
    await this.provision.provisionUserBucketAccounts(input.userId);

    const created = await this.db.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [idem]);
      await this.ensureTrialState(client, input.userId, config.default_max_participations);
      const state = await client.query<TrialStateRow>(
        `SELECT max_participations,participations_used
           FROM public.trial_user_state WHERE user_id=$1::uuid FOR UPDATE`,
        [input.userId],
      );
      const current = state.rows[0];
      if (!current) throw new ServiceUnavailableException("체험 상태를 준비할 수 없습니다.");
      if (current.participations_used >= current.max_participations) {
        throw new ConflictException("사용 가능한 체험 채굴 횟수를 모두 사용했습니다.");
      }

      const another = await client.query<{ id: string }>(
        `SELECT id::text FROM public.mine_trial_sessions
          WHERE user_id=$1::uuid AND status='ACTIVE' LIMIT 1 FOR UPDATE`,
        [input.userId],
      );
      if (another.rows[0]) throw new ConflictException("이미 진행 중인 체험 채굴이 있습니다.");

      const inserted = await client.query<TrialSessionRow>(
        `INSERT INTO public.mine_trial_sessions (
           user_id,mine_id,status,principal_usdt,accrued_profit_usdt,
           idempotency_key,trial_grant_id
         ) VALUES ($1::uuid,$2::uuid,'NOT_STARTED',$3::numeric,0,$4,$5::uuid)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id::text,user_id::text,mine_id::text,status,principal_usdt::text,
                   accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
                   lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
                   expires_at,created_at,updated_at`,
        [input.userId, mineId, grant.amount_usdt, idem, grant.id],
      );
      if (inserted.rows[0]) return inserted.rows[0];

      const replay = await client.query<TrialSessionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
                accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
                lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
                expires_at,created_at,updated_at
           FROM public.mine_trial_sessions WHERE idempotency_key=$1 FOR UPDATE`,
        [idem],
      );
      const row = replay.rows[0];
      if (!row) throw new ConflictException("체험 채굴 요청을 확인할 수 없습니다.");
      this.assertSessionReplay(row, input.userId, mineId);
      return row;
    });

    await this.activateSession(created);
    return this.getStatus(input.userId);
  }

  async getTrialConfig() {
    return this.publicConfig(await this.getConfigRow());
  }

  async updateTrialConfig(input: {
    actor: AdminActor;
    idempotencyKey: unknown;
    body: Record<string, unknown>;
  }) {
    const idem = requestKey(input.idempotencyKey);
    const why = reason(input.body.reason);
    const current = await this.getConfigRow();
    const next = {
      welcomeKrw:
        input.body.welcomeKrw === undefined
          ? current.welcome_krw
          : integerInRange(input.body.welcomeKrw, "체험 지급액", 1, 100_000_000),
      profitCapKrw:
        input.body.profitCapKrw === undefined
          ? current.profit_cap_krw
          : integerInRange(input.body.profitCapKrw, "체험 수익 상한", 0, 100_000_000),
      defaultMaxParticipations:
        input.body.defaultMaxParticipations === undefined
          ? current.default_max_participations
          : integerInRange(input.body.defaultMaxParticipations, "기본 체험 횟수", 1, 3),
      requiredCapitalKrwMin:
        input.body.requiredCapitalKrwMin === undefined
          ? current.required_capital_krw_min
          : integerInRange(input.body.requiredCapitalKrwMin, "최소 체험원금", 1, 100_000_000),
      requiredCapitalKrwMax:
        input.body.requiredCapitalKrwMax === undefined
          ? current.required_capital_krw_max
          : integerInRange(input.body.requiredCapitalKrwMax, "최대 체험원금", 1, 100_000_000),
    };
    if (next.requiredCapitalKrwMin > next.requiredCapitalKrwMax) {
      throw new BadRequestException("최소 체험원금이 최대 체험원금보다 클 수 없습니다.");
    }
    const fp = fingerprint(["updateTrialConfig", next]);

    return this.db.withTransaction(async (client) => {
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [idem]);
      const prior = await client.query<AuditRow>(
        `SELECT action,target_id,payload FROM public.admin_audit_events WHERE idempotency_key=$1`,
        [idem],
      );
      if (prior.rows[0]) {
        const row = prior.rows[0];
        if (
          row.action !== "MiningAdminController.updateTrialConfig" ||
          row.payload?.fingerprint !== fp
        ) {
          throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
        }
        const replay = await this.getConfigRowWith(client);
        return this.publicConfig(replay);
      }

      const updated = await client.query<TrialConfigRow>(
        `UPDATE public.trial_program_config
            SET welcome_krw=$1,profit_cap_krw=$2,default_max_participations=$3,
                required_capital_krw_min=$4,required_capital_krw_max=$5,updated_at=now()
          WHERE id=1
          RETURNING id,welcome_krw,profit_cap_krw,default_max_participations,
                    required_capital_krw_min,required_capital_krw_max,updated_at`,
        [
          next.welcomeKrw,
          next.profitCapKrw,
          next.defaultMaxParticipations,
          next.requiredCapitalKrwMin,
          next.requiredCapitalKrwMax,
        ],
      );
      const row = updated.rows[0];
      if (!row) throw new ServiceUnavailableException("체험 설정을 저장할 수 없습니다.");
      await client.query(
        `INSERT INTO public.admin_audit_events (
           actor_key,actor_id,role,action,target_type,target_id,occurred_at,
           mode,result,reason,idempotency_key,payload
         ) VALUES ($1::uuid::text,$1::uuid,$2,'MiningAdminController.updateTrialConfig',
                   'trial_program_config','1',now(),'LIVE','applied',$3,$4,$5::jsonb)`,
        [
          input.actor.adminId,
          input.actor.role,
          why,
          idem,
          JSON.stringify({ fingerprint: fp, resourceId: "1" }),
        ],
      );
      return this.publicConfig(row);
    });
  }

  private async ensureWelcomeGrant(userId: string, welcomeKrw: number): Promise<TrialGrantRow> {
    const grantIdem = `trial:${TRIAL_GRANT_KEY}:${userId}`;
    const existing = await this.db.query<TrialGrantRow>(
      `SELECT id::text,user_id::text,grant_key,status,amount_usdt::text,amount_krw,
              fx_snapshot_id,grant_journal_id::text,fail_reason,idempotency_key,granted_at
         FROM public.trial_grants WHERE user_id=$1::uuid AND grant_key=$2`,
      [userId, TRIAL_GRANT_KEY],
    );
    if (existing.rows[0]?.status === "active") return existing.rows[0];

    const fx = await this.db.query<{ id: string; amount_usdt: string }>(
      `SELECT id,
              trunc($1::numeric / usd_krw,18)::text AS amount_usdt
         FROM public.fx_snapshots
        WHERE usd_krw > 0
        ORDER BY captured_at DESC
        LIMIT 1`,
      [welcomeKrw],
    );
    const snapshot = fx.rows[0];
    if (!snapshot) {
      await this.db.query(
        `INSERT INTO public.trial_grants (
           user_id,grant_key,status,amount_krw,fail_reason,idempotency_key
         ) VALUES ($1::uuid,$2,'failed_fx',$3,'FX_SNAPSHOT_UNAVAILABLE',$4)
         ON CONFLICT (user_id,grant_key)
         DO UPDATE SET status='failed_fx',amount_krw=EXCLUDED.amount_krw,
                       fail_reason=EXCLUDED.fail_reason,updated_at=now()`,
        [userId, TRIAL_GRANT_KEY, welcomeKrw, grantIdem],
      );
      throw new ServiceUnavailableException("환율 정보를 확인할 수 없습니다.");
    }
    const amountUsdt = assertAmountUsdt(snapshot.amount_usdt, "trialWelcomeUsdt");
    if (cmpAmount(amountUsdt, "0") <= 0) {
      throw new ServiceUnavailableException("체험 원금을 계산할 수 없습니다.");
    }

    await this.provision.provisionUserBucketAccounts(userId);
    const journal = await this.ledger.postJournal({
      idempotencyKey: grantIdem,
      journalType: "trial_grant",
      referenceType: "trial_grant",
      referenceId: TRIAL_GRANT_KEY,
      memo: `trial welcome ~${welcomeKrw} KRW once`,
      fxSnapshotId: snapshot.id,
      createdBy: userId,
      lines: [
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.OPS_POOL },
          direction: "debit",
          amountUsdt,
        },
        {
          account: { userId, bucket: "trial_principal" },
          direction: "credit",
          amountUsdt,
        },
      ],
    });

    const upsert = await this.db.query<TrialGrantRow>(
      `INSERT INTO public.trial_grants (
         user_id,grant_key,status,amount_usdt,amount_krw,fx_snapshot_id,
         grant_journal_id,fail_reason,idempotency_key
       ) VALUES ($1::uuid,$2,'active',$3::numeric,$4,$5,$6::uuid,NULL,$7)
       ON CONFLICT (user_id,grant_key)
       DO UPDATE SET status='active',amount_usdt=EXCLUDED.amount_usdt,
                     amount_krw=EXCLUDED.amount_krw,fx_snapshot_id=EXCLUDED.fx_snapshot_id,
                     grant_journal_id=EXCLUDED.grant_journal_id,fail_reason=NULL,updated_at=now()
       RETURNING id::text,user_id::text,grant_key,status,amount_usdt::text,amount_krw,
                 fx_snapshot_id,grant_journal_id::text,fail_reason,idempotency_key,granted_at`,
      [userId, TRIAL_GRANT_KEY, amountUsdt, welcomeKrw, snapshot.id, journal.id, grantIdem],
    );
    const row = upsert.rows[0];
    if (!row) throw new ServiceUnavailableException("체험 원금을 저장할 수 없습니다.");
    return row;
  }

  private async activateSession(session: TrialSessionRow) {
    if (session.status === "ACTIVE" || session.status === "COMPLETED") return;
    if (session.status !== "NOT_STARTED") {
      throw new ConflictException("현재 시작할 수 없는 체험 상태입니다.");
    }
    await this.provision.provisionUserBucketAccounts(session.user_id);
    const journal = await this.ledger.postJournal({
      idempotencyKey: `mine:trial:lock:${session.id}`,
      journalType: "mine_position_lock",
      referenceType: "mine_trial_session",
      referenceId: session.id,
      memo: "mining trial principal lock",
      createdBy: session.user_id,
      lines: [
        {
          account: { userId: session.user_id, bucket: "trial_principal" },
          direction: "debit",
          amountUsdt: session.principal_usdt,
        },
        {
          account: { userId: session.user_id, bucket: "trial_locked" },
          direction: "credit",
          amountUsdt: session.principal_usdt,
        },
      ],
    });

    await this.db.withTransaction(async (client) => {
      const locked = await client.query<TrialSessionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
                accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
                lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
                expires_at,created_at,updated_at
           FROM public.mine_trial_sessions WHERE id=$1::uuid FOR UPDATE`,
        [session.id],
      );
      const row = locked.rows[0];
      if (!row) throw new NotFoundException("체험 채굴을 찾을 수 없습니다.");
      if (row.status === "ACTIVE") return;
      if (row.status !== "NOT_STARTED") {
        throw new ConflictException("현재 시작할 수 없는 체험 상태입니다.");
      }
      const startedAt = new Date();
      const expiresAt = new Date(startedAt.getTime() + TRIAL_WINDOW_MS);
      await client.query(
        `UPDATE public.mine_trial_sessions
            SET status='ACTIVE',lock_journal_id=$2::uuid,started_at=$3::timestamptz,
                expires_at=$4::timestamptz
          WHERE id=$1::uuid`,
        [session.id, journal.id, startedAt.toISOString(), expiresAt.toISOString()],
      );
      await client.query(
        `UPDATE public.trial_user_state
            SET participations_used=participations_used+1,updated_at=now()
          WHERE user_id=$1::uuid`,
        [session.user_id],
      );
    });
  }

  private async completeSession(sessionId: string, userId: string) {
    const loaded = await this.db.query<TrialSessionRow>(
      `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
              accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
              lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
              expires_at,created_at,updated_at
         FROM public.mine_trial_sessions WHERE id=$1::uuid AND user_id=$2::uuid`,
      [sessionId, userId],
    );
    const session = loaded.rows[0];
    if (!session) throw new NotFoundException("체험 채굴을 찾을 수 없습니다.");
    if (session.status === "COMPLETED") return;
    if (session.status !== "ACTIVE" || !session.started_at || !session.expires_at) {
      throw new ConflictException("현재 완료할 수 없는 체험 상태입니다.");
    }
    if (new Date(session.expires_at).getTime() > Date.now()) return;

    const profit = await this.calculateTrialProfit(session);
    const lines = [
      {
        account: { userId: session.user_id, bucket: "trial_locked" as const },
        direction: "debit" as const,
        amountUsdt: session.principal_usdt,
      },
      {
        account: { userId: session.user_id, bucket: "trial_principal" as const },
        direction: "credit" as const,
        amountUsdt: session.principal_usdt,
      },
    ];
    // Trial completion is one idempotent ledger journal: unlock the trial principal,
    // and when profit exists, debit the mining pool and credit withdrawable user profit.
    const journalType = cmpAmount(profit, "0") > 0 ? "mine_profit_settlement" as const : "mine_position_unlock" as const;
    if (cmpAmount(profit, "0") > 0) {
      lines.push(
        {
          account: { systemCode: SYSTEM_ACCOUNT_CODES.MINING_POOL },
          direction: "debit",
          amountUsdt: profit,
        },
        {
          account: { userId: session.user_id, bucket: "profit" as const },
          direction: "credit",
          amountUsdt: profit,
        },
      );
    }
    const journal = await this.ledger.postJournal({
      idempotencyKey: `mine:trial:unlock:${session.id}`,
      journalType,
      referenceType: "mine_trial_session",
      referenceId: session.id,
      memo: cmpAmount(profit, "0") > 0
        ? "mining trial principal unlock and profit settlement"
        : "mining trial principal unlock",
      createdBy: session.user_id,
      lines,
    });

    await this.db.withTransaction(async (client) => {
      const current = await client.query<TrialSessionRow>(
        `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
                accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
                lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
                expires_at,created_at,updated_at
           FROM public.mine_trial_sessions WHERE id=$1::uuid FOR UPDATE`,
        [session.id],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException("체험 채굴을 찾을 수 없습니다.");
      if (row.status === "COMPLETED") return;
      if (row.status !== "ACTIVE") {
        throw new ConflictException("현재 완료할 수 없는 체험 상태입니다.");
      }
      await client.query(
        `UPDATE public.mine_trial_sessions
            SET status='COMPLETED',accrued_profit_usdt=$2::numeric,
                unlock_journal_id=$3::uuid,completed_at=now()
          WHERE id=$1::uuid`,
        [session.id, profit, journal.id],
      );
    });
  }

  private async calculateTrialProfit(session: TrialSessionRow): Promise<string> {
    if (!session.started_at || !session.expires_at) {
      throw new ServiceUnavailableException("체험 시간을 확인할 수 없습니다.");
    }
    const start = micros(session.started_at);
    const end = micros(session.expires_at);
    const rates = await this.db.query<RatePoint>(
      `SELECT daily_rate::text,
              trunc(extract(epoch from effective_at) * 1000000)::numeric(30,0)::text AS effective_micros
         FROM public.mine_rate_versions
        WHERE mine_id=$1::uuid
          AND approved_at IS NOT NULL
          AND effective_at IS NOT NULL
          AND effective_at < $2::timestamptz
        ORDER BY effective_at ASC`,
      [session.mine_id, iso(session.expires_at)],
    );
    const points = rates.rows.map((row) => ({
      dailyRate: row.daily_rate,
      at: BigInt(row.effective_micros),
    }));
    let current = [...points].reverse().find((point) => point.at <= start);
    if (!current) throw new ServiceUnavailableException("체험 수익률을 확인할 수 없습니다.");

    let cursor = start;
    let total = "0";
    for (const point of points) {
      if (point.at <= start || point.at >= end) continue;
      const segment = await this.engine.calculate({
        principalUsdt: session.principal_usdt,
        dailyRate: current.dailyRate,
        periodStartMicros: cursor,
        periodEndMicros: point.at,
      });
      total = addAmount(total, segment);
      cursor = point.at;
      current = point;
    }
    if (cursor < end) {
      total = addAmount(
        total,
        await this.engine.calculate({
          principalUsdt: session.principal_usdt,
          dailyRate: current.dailyRate,
          periodStartMicros: cursor,
          periodEndMicros: end,
        }),
      );
    }

    const cap = await this.db.query<{ cap_usdt: string }>(
      `SELECT trunc(c.profit_cap_krw::numeric / f.usd_krw,18)::text AS cap_usdt
         FROM public.trial_program_config c
         JOIN public.trial_grants g ON g.id=$1::uuid
         JOIN public.fx_snapshots f ON f.id=g.fx_snapshot_id
        WHERE c.id=1 AND f.usd_krw > 0`,
      [session.trial_grant_id],
    );
    const capUsdt = cap.rows[0]?.cap_usdt;
    if (capUsdt == null) throw new ServiceUnavailableException("체험 수익 상한을 확인할 수 없습니다.");
    return cmpAmount(total, capUsdt) > 0 ? capUsdt : total;
  }

  private async assertTrialMine(mineId: string) {
    const mine = await this.db.query<{ id: string; rate_id: string | null }>(
      `SELECT m.id::text,
              (SELECT r.id::text
                 FROM public.mine_rate_versions r
                WHERE r.mine_id=m.id AND r.approved_at IS NOT NULL
                  AND r.effective_at IS NOT NULL AND r.effective_at <= now()
                ORDER BY r.effective_at DESC LIMIT 1) AS rate_id
         FROM public.mines m
        WHERE m.id=$1::uuid AND m.published_at IS NOT NULL AND m.status='ACTIVE'`,
      [mineId],
    );
    const row = mine.rows[0];
    if (!row) throw new NotFoundException("체험할 광산을 찾을 수 없습니다.");
    if (!row.rate_id) throw new ConflictException("현재 체험 가능한 수익률이 없습니다.");
  }

  private async latestActiveSession(userId: string): Promise<TrialSessionRow | null> {
    const result = await this.db.query<TrialSessionRow>(
      `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
              accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
              lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
              expires_at,created_at,updated_at
         FROM public.mine_trial_sessions
        WHERE user_id=$1::uuid AND status='ACTIVE'
        ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  private async sessionByIdempotency(key: string): Promise<TrialSessionRow | null> {
    const result = await this.db.query<TrialSessionRow>(
      `SELECT id::text,user_id::text,mine_id::text,status,principal_usdt::text,
              accrued_profit_usdt::text,idempotency_key,trial_grant_id::text,
              lock_journal_id::text,unlock_journal_id::text,started_at,completed_at,
              expires_at,created_at,updated_at
         FROM public.mine_trial_sessions WHERE idempotency_key=$1`,
      [key],
    );
    return result.rows[0] ?? null;
  }

  private assertSessionReplay(session: TrialSessionRow, userId: string, mineId: string) {
    if (session.user_id !== userId || session.mine_id !== mineId) {
      throw new ConflictException("같은 요청 키를 다른 내용으로 사용할 수 없습니다.");
    }
  }

  private async ensureTrialState(client: PoolClient, userId: string, max: number) {
    await client.query(
      `INSERT INTO public.trial_user_state (user_id,max_participations,participations_used)
       VALUES ($1::uuid,$2,0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, max],
    );
  }

  private async getConfigRow(): Promise<TrialConfigRow> {
    return this.getConfigRowWith(this.db);
  }

  private async getConfigRowWith(q: { query: PostgresService["query"] }): Promise<TrialConfigRow> {
    const result = await q.query<TrialConfigRow>(
      `SELECT id,welcome_krw,profit_cap_krw,default_max_participations,
              required_capital_krw_min,required_capital_krw_max,updated_at
         FROM public.trial_program_config WHERE id=1`,
    );
    const row = result.rows[0];
    if (!row) throw new ServiceUnavailableException("체험 설정을 찾을 수 없습니다.");
    return row;
  }

  private publicConfig(row: TrialConfigRow) {
    return {
      welcomeKrw: row.welcome_krw,
      profitCapKrw: row.profit_cap_krw,
      defaultMaxParticipations: row.default_max_participations,
      requiredCapitalKrwMin: row.required_capital_krw_min,
      requiredCapitalKrwMax: row.required_capital_krw_max,
      updatedAt: iso(row.updated_at),
    };
  }
}
