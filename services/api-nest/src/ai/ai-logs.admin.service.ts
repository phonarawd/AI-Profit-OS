/**
 * AI_LOG Admin read + Eval Gate
 * Coach deep UI = later todo · here: list/trace + eval status
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { AI_EVENTS } from "./ai.events";
import {
  AUTO_LEARNING_ENABLED,
  buildAiLogRecord,
  evaluateModelCandidate,
  FACT_CHIPS,
  FACT_TOOLS,
  promoteToProd,
  redactConversationPii,
  toAiLogsRow,
} from "./ai.engine";
import type { AiEvalRunRequest } from "./ai.types";

@Injectable()
export class AiLogsAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  async list(limit = 50) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const res = await this.db.query(
      `SELECT id::text, user_id::text, intent, lane, twin_snapshot_id,
              memory_ids, facts_used, tools_called, provider_id, answer_path,
              guard_result, answer_preview, created_at
         FROM public.ai_logs
        ORDER BY created_at DESC
        LIMIT $1`,
      [lim],
    );
    return {
      items: res.rows.map((row) => this.publicLogRow(row)),
      autoLearningEnabled: AUTO_LEARNING_ENABLED,
    };
  }

  async get(id: string) {
    const res = await this.db.query(
      `SELECT id::text, user_id::text, intent, lane, twin_snapshot_id,
              memory_ids, facts_used, tools_called, provider_id, answer_path,
              guard_result, answer_preview, created_at
         FROM public.ai_logs
        WHERE id = $1::uuid`,
      [id],
    );
    if (!res.rows[0]) throw new NotFoundException("AI_LOG_NOT_FOUND");
    return this.publicLogRow(res.rows[0]);
  }

  private publicLogRow(row: Record<string, unknown>) {
    const preview = row.answer_preview;
    return {
      ...row,
      answer_preview:
        preview == null ? null : redactConversationPii(String(preview)),
    };
  }

  /** Append trace (Nest internal / future coach) — aligned to ai_logs */
  async append(input: Record<string, unknown>, userId: string | null = null) {
    const rec = buildAiLogRecord(input);
    const row = toAiLogsRow(rec, userId);
    const ins = await this.db.query(
      `INSERT INTO public.ai_logs (
         user_id, intent, lane, twin_snapshot_id, memory_ids, facts_used,
         tools_called, provider_id, answer_path, guard_result, answer_preview
       ) VALUES (
         $1::uuid, $2, $3, $4, $5::uuid[], $6::jsonb, $7::text[], $8, $9,
         $10::jsonb, $11
       )
       RETURNING id::text, created_at`,
      [
        row.user_id,
        row.intent,
        row.lane,
        row.twin_snapshot_id,
        row.memory_ids,
        JSON.stringify(row.facts_used),
        row.tools_called,
        row.provider_id,
        row.answer_path,
        JSON.stringify(row.guard_result),
        row.answer_preview,
      ],
    );
    const payload = { id: ins.rows[0].id, ...rec };
    this.bus.emit(AI_EVENTS.logAppended, payload);
    return payload;
  }

  evalStatus() {
    return {
      autoLearningEnabled: AUTO_LEARNING_ENABLED,
      note: "Day-1 auto learning OFF · Eval PASS only → Registry→Prod",
    };
  }

  /** Admin /admin/ai-logs?tab=coach — catalog · eval set pointers · no score override */
  coachCatalog() {
    return {
      factTools: FACT_TOOLS,
      suggestionChips: FACT_CHIPS,
      toneBands: ["young", "mid", "senior"],
      evalSets: [
        "eval/p_fact.jsonl",
        "eval/g_no_money.jsonl",
        "eval/s_refuse.jsonl",
      ],
      answerTraceFields: ["lane", "provider_id", "answer_path", "guard_result"],
      moneyHallucinationRateMax: 0,
      autoLearningEnabled: AUTO_LEARNING_ENABLED,
      http: {
        chat: "POST /api/v1/me/peotteok/chat",
        chips: "GET /api/v1/me/peotteok/chips",
      },
    };
  }

  async evalRun(input: AiEvalRunRequest) {
    if (!input?.modelId || !input?.version) {
      throw new BadRequestException("modelId_and_version_required");
    }
    if (input.autoLearningRequested === true) {
      throw new BadRequestException("AUTO_LEARNING_FORBIDDEN");
    }

    const result = evaluateModelCandidate({
      accuracy: input.accuracy,
      piiLeakRate: input.piiLeakRate,
      moneyHallucinationRate: input.moneyHallucinationRate,
      l3MoneyActionRate: input.l3MoneyActionRate,
      autoLearningRequested: false,
    });

    let promotion: object | null = null;
    if (result.pass && input.promoteOnPass === true) {
      promotion = promoteToProd(result, {
        modelId: input.modelId,
        version: input.version,
      });
    }

    await this.db.query(
      `INSERT INTO public.ai_model_registry (
         model_id, version, status, eval_report, auto_learning, promoted_at
       ) VALUES (
         $1, $2, $3, $4::jsonb, false, $5::timestamptz
       )
       ON CONFLICT (model_id) DO UPDATE SET
         version = EXCLUDED.version,
         status = EXCLUDED.status,
         eval_report = EXCLUDED.eval_report,
         auto_learning = false,
         promoted_at = EXCLUDED.promoted_at`,
      [
        input.modelId,
        input.version,
        promotion ? "prod" : result.status,
        JSON.stringify({
          pass: result.pass,
          reasons: result.reasons,
          metrics: result.metrics,
        }),
        promotion ? (promotion as { promotedAt: string }).promotedAt : null,
      ],
    );

    const payload = { eval: result, promotion };
    this.bus.emit(AI_EVENTS.evalCompleted, payload);
    return payload;
  }
}
