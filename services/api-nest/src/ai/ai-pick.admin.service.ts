/**
 * AI PICK scoring — feature-platform → ai-platform L2
 * Admin override fields REJECTED
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { InProcessEventBus } from "../events/in-process.bus";
import { AI_EVENTS } from "./ai.events";
import {
  applyAiPickToCard,
  assertNoL3Money,
  scoreAiPick,
} from "./ai.engine";
import type { AiPickScoreRequest } from "./ai.types";

const FORBIDDEN_BODY_KEYS = [
  "adminOverride",
  "sellSuccessRate",
  "successRatePercent",
  "aiConfidenceScore",
] as const;

@Injectable()
export class AiPickAdminService {
  constructor(
    private readonly db: PostgresService,
    private readonly bus: InProcessEventBus,
  ) {}

  score(input: AiPickScoreRequest = {}, rawBody: Record<string, unknown> = {}) {
    for (const k of FORBIDDEN_BODY_KEYS) {
      if (Object.prototype.hasOwnProperty.call(rawBody, k)) {
        throw new BadRequestException(`AI_PICK_FORBIDDEN_FIELD:${k}`);
      }
      if (
        rawBody.opportunity &&
        typeof rawBody.opportunity === "object" &&
        Object.prototype.hasOwnProperty.call(
          rawBody.opportunity as object,
          k,
        )
      ) {
        throw new BadRequestException(`AI_PICK_FORBIDDEN_FIELD:${k}`);
      }
    }
    assertNoL3Money("ai_pick_score", "L2");

    const pick = scoreAiPick({
      user: input.user,
      market: input.market,
      opportunity: input.opportunity,
      now: input.now,
    });

    const card = applyAiPickToCard(
      {
        id: pick.opportunityId,
        tags: [],
      },
      pick,
    );

    const payload = { pick, cardProjection: card };
    this.bus.emit(AI_EVENTS.pickScored, payload);
    this.bus.emit(AI_EVENTS.analysis, payload);

    if (input.persist === true && pick.opportunityId) {
      void this.persist(pick);
    }

    return payload;
  }

  async recent(limit = 20) {
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const res = await this.db.query(
      `SELECT id::text, opportunity_id, user_id::text, feature_vector_hash,
              formula_id, ai_confidence_score::float8 AS ai_confidence_score,
              ranking_score::float8 AS ranking_score, is_ai_pick, level,
              components, created_at
         FROM public.ai_pick_scores
        ORDER BY created_at DESC
        LIMIT $1`,
      [lim],
    );
    return { items: res.rows };
  }

  private async persist(pick: {
    opportunityId: string | null;
    userId: string | null;
    featureVectorHash: string;
    formulaId: string;
    aiConfidenceScore: number;
    rankingScore: number;
    isAiPick: boolean;
    components: object;
  }) {
    if (!pick.opportunityId) return;
    await this.db.query(
      `INSERT INTO public.ai_pick_scores (
         opportunity_id, user_id, feature_vector_hash, formula_id,
         ai_confidence_score, ranking_score, is_ai_pick, level, components
       ) VALUES (
         $1, $2::uuid, $3, $4, $5, $6, $7, 'L2', $8::jsonb
       )`,
      [
        pick.opportunityId,
        pick.userId,
        pick.featureVectorHash,
        pick.formulaId,
        pick.aiConfidenceScore,
        pick.rankingScore,
        pick.isAiPick,
        JSON.stringify(pick.components),
      ],
    );
  }
}
