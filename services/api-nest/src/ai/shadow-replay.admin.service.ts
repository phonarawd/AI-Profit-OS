/**
 * Shadow replay Admin — offline golden replay · 24h · drift 0.000%.
 * Engine §47.16.6 — failAction="block_settlement" persisted (compat);
 * driftAdvisoryOnly/contractLabel clarify advisory-only (settlement NOT gated).
 */

import { Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { SHADOW_REPLAY_EVENTS } from "./ai.events";
import {
  ADVISORY_LABEL,
  DRIFT_ADVISORY_ONLY,
  FAIL_ACTION,
  HORIZON_HOURS,
  MAX_DRIFT_PCT,
  runAiPickShadowReplay,
} from "./ai.engine";
import type { ShadowReplayRunRequest } from "./ai.types";

@Injectable()
export class ShadowReplayAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async run(input: ShadowReplayRunRequest = {}) {
    const report = runAiPickShadowReplay({
      runId: input.runId,
    });

    const saved = await this.db.query(
      `INSERT INTO public.shadow_replay_runs (
         run_id, as_of, horizon_hours, report, drift_pct, pass, fail_action,
         drift_advisory_only, contract_label,
         created_by_admin_id
       ) VALUES (
         $1, $2::timestamptz, $3, $4::jsonb, $5, $6, $7,
         $8, $9,
         $10::uuid
       )
       RETURNING id::text, run_id, as_of, drift_pct::float8 AS drift_pct,
                 pass, fail_action, drift_advisory_only, contract_label,
                 created_at`,
      [
        report.runId,
        report.asOf,
        HORIZON_HOURS,
        JSON.stringify(report),
        report.driftPct,
        report.pass,
        report.failAction,
        DRIFT_ADVISORY_ONLY,
        ADVISORY_LABEL,
        input.createdByAdminId || null,
      ],
    );

    const payload = {
      ...report,
      id: saved.rows[0].id,
      maxDriftPct: MAX_DRIFT_PCT,
      /** Compat field — name retained; does NOT wire settlement engine. */
      settlementBlocked:
        report.pass === false && report.failAction === FAIL_ACTION,
      /** §47.16.6 additive — explicit advisory contract */
      driftAdvisoryOnly: DRIFT_ADVISORY_ONLY,
      contractLabel: ADVISORY_LABEL,
    };

    if (report.pass) {
      this.bus.emit(SHADOW_REPLAY_EVENTS.completed, payload);
    } else {
      this.bus.emit(SHADOW_REPLAY_EVENTS.failed, payload);
    }
    return payload;
  }

  async latest() {
    const res = await this.db.query(
      `SELECT id::text, run_id, as_of, horizon_hours, report,
              drift_pct::float8 AS drift_pct, pass, fail_action,
              drift_advisory_only, contract_label,
              created_by_admin_id::text, created_at
         FROM public.shadow_replay_runs
        ORDER BY as_of DESC
        LIMIT 1`,
    );
    if (!res.rows[0]) {
      return {
        latest: null,
        maxDriftPct: MAX_DRIFT_PCT,
        failAction: FAIL_ACTION,
        driftAdvisoryOnly: DRIFT_ADVISORY_ONLY,
        contractLabel: ADVISORY_LABEL,
      };
    }
    const row = res.rows[0] as {
      pass: boolean;
      fail_action: string | null;
      drift_advisory_only?: boolean;
      contract_label?: string | null;
    };
    return {
      latest: res.rows[0],
      maxDriftPct: MAX_DRIFT_PCT,
      failAction: FAIL_ACTION,
      settlementBlocked:
        row.pass === false && row.fail_action === FAIL_ACTION,
      driftAdvisoryOnly:
        row.drift_advisory_only != null
          ? Boolean(row.drift_advisory_only)
          : DRIFT_ADVISORY_ONLY,
      contractLabel: row.contract_label || ADVISORY_LABEL,
    };
  }
}
