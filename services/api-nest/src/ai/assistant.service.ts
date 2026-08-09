/**
 * Personal AI assistant pipeline — Twin → Memory → Fact → Guard → route
 * LLM Adapter = later todo · here: P/G/S router + Fact freshness + Twin separation
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { AiLogsAdminService } from "./ai-logs.admin.service";
import {
  assertNoTwinMoneyKeys,
  buildFactCard,
  classifyLane,
  guardAnswer,
  routeAssistant,
} from "./ai.engine";
import { MemoryService } from "./memory.service";
import { UserTwinService } from "./user-twin.service";

@Injectable()
export class AssistantService {
  constructor(
    private readonly twin: UserTwinService,
    private readonly memory: MemoryService,
    private readonly logs: AiLogsAdminService,
  ) {}

  /** Intent → lane only (no side effects) */
  classify(text: string) {
    return { lane: classifyLane(text), text: String(text || "") };
  }

  /**
   * Route + optional Fact cards (caller supplies Fact payloads from ledger/opp).
   * Twin is loaded for personalization but NEVER used for money numbers.
   */
  async route(
    userId: string,
    input: {
      text: string;
      facts?: Array<{
        source: string;
        payload?: Record<string, unknown>;
        captured_at?: string;
        expires_at?: string;
        confidence?: number;
        ttlSec?: number;
      }>;
      template?: boolean;
      rag?: boolean;
      llm?: boolean;
      persistTrace?: boolean;
    },
  ) {
    if (!userId) throw new BadRequestException("userId_required");
    const text = String(input?.text || "").trim();
    if (!text) throw new BadRequestException("text_required");

    const twin = await this.twin.get(userId);
    if (twin) {
      try {
        assertNoTwinMoneyKeys(twin as unknown as Record<string, unknown>);
      } catch (e) {
        throw new BadRequestException(
          e instanceof Error ? e.message : "TWIN_MONEY_CACHE_FORBIDDEN",
        );
      }
    }

    const facts = (input.facts || []).map((f) => buildFactCard(f));
    const memories = await this.memory.listRecent(userId, 5);
    const memoryIds = memories
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));

    const route = routeAssistant({
      text,
      twin,
      facts,
      template: input.template,
      rag: input.rag,
      llm: input.llm,
    });

    const guard = guardAnswer({
      lane: route.lane,
      toolsCalled: [...route.tools_called],
      factsUsed: facts,
      twin,
      userText: text,
      usedTwinForMoney: false,
    });

    const answerPath =
      route.lane === "S"
        ? "refuse_s"
        : guard.status === "reroute_p"
          ? "fact"
          : route.answer_path;

    const lane =
      guard.status === "reroute_p" ? "P" : route.lane;

    const result = {
      ...route,
      lane,
      answer_path: answerPath,
      guard_result: guard,
      memory_ids: memoryIds,
      facts_used: facts,
      twin_snapshot_id: twin?.twinSnapshotId ?? null,
      provider_id: "none" as const,
    };

    if (input.persistTrace !== false) {
      await this.logs.append(
        {
          intent: result.intent,
          lane: result.lane,
          twin_snapshot_id: result.twin_snapshot_id,
          memory_ids: result.memory_ids,
          facts_used: result.facts_used,
          tools_called: [...result.tools_called],
          provider_id: result.provider_id,
          answer_path: result.answer_path,
          guard_result: {
            status: result.guard_result.status,
            reason: result.guard_result.reason,
          },
        },
        userId,
      );
    }

    return result;
  }
}
