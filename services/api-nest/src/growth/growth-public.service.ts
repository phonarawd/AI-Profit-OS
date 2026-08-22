/**
 * GET growth/public-surface — UI PART9g
 * ticker_mode/counter_mode from growth_ticker_config · ledgerTotal=settlement.completed only
 * PII 0 · events masking Owns=본 서비스
 * Admin PATCH Owns=동일 테이블 (평행 엔진 0)
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";

export type GrowthPublicSurfaceDto = {
  tickerMode: "off" | "live" | "demo" | "hybrid";
  counterMode: "off" | "ledger" | "demo" | "blended";
  /** settlement.completed(success) today count as display total driver */
  ledgerTotal: number;
  events: Array<{
    id: string;
    displayLabel: string;
    amountKrwText: string;
    templateKey: "just_settled" | "just_reflected" | "participant_amt";
    at: string;
  }>;
  asOf: string;
};

export const TICKER_MODES = ["off", "live", "demo", "hybrid"] as const;
export type TickerMode = (typeof TICKER_MODES)[number];
export const COUNTER_MODES = ["off", "ledger", "demo", "blended"] as const;
export type CounterMode = (typeof COUNTER_MODES)[number];

function isTickerMode(v: unknown): v is TickerMode {
  return typeof v === "string" && (TICKER_MODES as readonly string[]).includes(v);
}
function isCounterMode(v: unknown): v is CounterMode {
  return typeof v === "string" && (COUNTER_MODES as readonly string[]).includes(v);
}

export type GrowthTickerConfigDto = {
  tickerMode: TickerMode;
  counterMode: CounterMode;
  updatedByAdminId: string | null;
  updatedAt: string | null;
  publicSurface: GrowthPublicSurfaceDto;
};

function maskLabel(raw: string): string {
  const t = (raw || "").trim();
  if (!t || t.includes("@") || /userId|email|legalName/i.test(t)) {
    return "회원";
  }
  // keep short · no full identity
  if (t.length <= 2) return `${t}*`;
  return `${t.slice(0, 1)}**`;
}

@Injectable()
export class GrowthPublicService {
  constructor(private readonly db: PostgresService) {}

  async getPublicSurface(): Promise<GrowthPublicSurfaceDto> {
    const empty: GrowthPublicSurfaceDto = {
      tickerMode: "off",
      counterMode: "off",
      ledgerTotal: 0,
      events: [],
      asOf: new Date().toISOString(),
    };

    if (!this.db.configured()) return empty;

    const cfg = await this.db.query<{
      ticker_mode: string;
      counter_mode: string;
    }>(
      `SELECT ticker_mode, counter_mode
         FROM public.growth_ticker_config
        WHERE id = 1`,
    );

    const tickerMode = (cfg.rows[0]?.ticker_mode ?? "off") as
      | "off"
      | "live"
      | "demo"
      | "hybrid";
    const counterMode = (cfg.rows[0]?.counter_mode ?? "off") as
      | "off"
      | "ledger"
      | "demo"
      | "blended";

    const settled = await this.db.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
         FROM public.trade_executions
        WHERE status = 'success'
          AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')
                AT TIME ZONE 'Asia/Seoul'`,
    );
    const ledgerTotal = Math.max(0, Number(settled.rows[0]?.n ?? 0) || 0);

    // live events: masked labels only · never email/userId
    let events: GrowthPublicSurfaceDto["events"] = [];
    if (tickerMode === "live" || tickerMode === "hybrid") {
      const rows = await this.db.query<{
        id: string;
        created_at: Date;
      }>(
        `SELECT id::text AS id, created_at
           FROM public.trade_executions
          WHERE status = 'success'
          ORDER BY created_at DESC
          LIMIT 20`,
      );
      events = rows.rows.map((r, i) => ({
        id: r.id,
        displayLabel: maskLabel(`회원${(i % 9) + 1}`),
        amountKrwText: "—",
        templateKey: "just_settled" as const,
        at: new Date(r.created_at).toISOString(),
      }));
    }

    return {
      tickerMode,
      counterMode,
      ledgerTotal,
      events,
      asOf: new Date().toISOString(),
    };
  }

  async getTickerConfig(): Promise<GrowthTickerConfigDto> {
    const cfg = await this.db.query<{
      ticker_mode: string;
      counter_mode: string;
      updated_by_admin_id: string | null;
      updated_at: Date | null;
    }>(
      `SELECT ticker_mode, counter_mode,
              updated_by_admin_id::text, updated_at
         FROM public.growth_ticker_config
        WHERE id = 1`,
    );
    const row = cfg.rows[0];
    return {
      tickerMode: isTickerMode(row?.ticker_mode) ? row.ticker_mode : "off",
      counterMode: isCounterMode(row?.counter_mode) ? row.counter_mode : "off",
      updatedByAdminId: row?.updated_by_admin_id ?? null,
      updatedAt: row?.updated_at ? row.updated_at.toISOString() : null,
      publicSurface: await this.getPublicSurface(),
    };
  }

  async patchTickerConfig(input: {
    tickerMode: unknown;
    counterMode: unknown;
    updatedByAdminId: string;
    changeReason: string;
  }): Promise<GrowthTickerConfigDto> {
    if (!input.updatedByAdminId) {
      throw new BadRequestException("updatedByAdminId required");
    }
    if (!input.changeReason || input.changeReason.trim().length < 4) {
      throw new BadRequestException("changeReason minLength 4");
    }
    if (!isTickerMode(input.tickerMode)) {
      throw new BadRequestException("tickerMode must be off|live|demo|hybrid");
    }
    if (!isCounterMode(input.counterMode)) {
      throw new BadRequestException("counterMode must be off|ledger|demo|blended");
    }

    await this.db.query(
      `INSERT INTO public.growth_ticker_config
         (id, ticker_mode, counter_mode, updated_by_admin_id, updated_at)
       VALUES (1, $1, $2, $3::uuid, now())
       ON CONFLICT (id) DO UPDATE SET
         ticker_mode = EXCLUDED.ticker_mode,
         counter_mode = EXCLUDED.counter_mode,
         updated_by_admin_id = EXCLUDED.updated_by_admin_id,
         updated_at = now()`,
      [input.tickerMode, input.counterMode, input.updatedByAdminId],
    );
    return this.getTickerConfig();
  }
}
