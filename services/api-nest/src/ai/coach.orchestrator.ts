/**
 * CoachOrchestrator — Engine §47.15
 * Twin → Memory(5) → classify → Facts → coach-prompt → LLM? → Guard → trace
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { InProcessEventBus } from "../events/in-process.bus";
import { AiLogsAdminService } from "./ai-logs.admin.service";
import {
  assertNoTwinMoneyKeys,
  buildCoachMessages,
  classifyLane,
  guardAnswer,
  G_BUSY_TEMPLATE,
  pickChips,
  P_REFRESH_TEMPLATE,
  renderFactAnswer,
  routeAssistant,
  S_REFUSE_TEMPLATE,
  shouldCallLlm,
  shapeByTone,
} from "./ai.engine";
import { AI_EVENTS } from "./ai.events";
import { ConversationStateService } from "./conversation-state.service";
import { FactToolService } from "./fact-tool.service";
import { LlmAdapterService } from "./llm.adapter.service";
import { MemoryService } from "./memory.service";
import { UserTwinService } from "./user-twin.service";

export type CoachChatInput = {
  text: string;
  stream?: boolean;
  llm?: boolean;
  /** Engine §47.16.2 — omit to start a new conversation (additive, backward-compatible) */
  conversationId?: string;
};

export type CoachSseEvent =
  | { event: "meta"; data: Record<string, unknown> }
  | { event: "chunk"; data: { text: string } }
  | { event: "done"; data: Record<string, unknown> }
  | { event: "error"; data: { message: string } };

@Injectable()
export class CoachOrchestrator {
  constructor(
    private readonly twin: UserTwinService,
    private readonly memory: MemoryService,
    private readonly facts: FactToolService,
    private readonly llm: LlmAdapterService,
    private readonly logs: AiLogsAdminService,
    private readonly bus: InProcessEventBus,
    private readonly convState: ConversationStateService,
  ) {}

  async chips(userId: string) {
    const twin = userId ? await this.twin.get(userId) : null;
    let needsKyc = false;
    let lowBalance = false;
    try {
      const loaded = await this.facts.loadTools(userId, [
        "getKyc",
        "getBalance",
      ]);
      for (const f of loaded.facts) {
        const p = f.payload || {};
        if (p.kycStatus && p.kycStatus !== "approved") needsKyc = true;
        if (p.liabilityUsdt != null && String(p.liabilityUsdt) === "0") {
          lowBalance = true;
        }
      }
    } catch {
      /* chips still work */
    }
    return {
      chips: pickChips({
        toneBand: twin?.toneBand,
        needsKyc,
        lowBalance,
      }),
      toneBand: twin?.toneBand ?? null,
    };
  }

  /**
   * Full coach turn — yields SSE-shaped events when stream=true
   */
  async *chat(
    userId: string,
    input: CoachChatInput,
  ): AsyncGenerator<CoachSseEvent> {
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

    const memories = await this.memory.listRecent(userId, 5);
    const memoryIds = memories
      .map((m) => m.id)
      .filter((id): id is string => Boolean(id));

    const { state: convState } = await this.convState.createOrLoad(
      userId,
      input.conversationId,
    );
    const history = this.convState.historyMessages(convState);

    let route = routeAssistant({
      text,
      twin,
      facts: [],
      llm: input.llm !== false,
    });

    let factsUsed: object[] = [];
    let toolsCalled: string[] = [...route.tools_called];
    let answerPath = route.answer_path;
    let lane = route.lane as "P" | "G" | "S";
    let providerId: string = this.llm.configuredProvider();
    let providerEffective: string = providerId;
    let answerText = "";
    let deepLink: string | null = null;
    let degraded = false;

    yield {
      event: "meta",
      data: {
        lane,
        intent: route.intent,
        answer_path: answerPath,
        tools_called: toolsCalled,
        conversation_id: convState.conversationId,
      },
    };

    if (lane === "S") {
      answerText = shapeByTone(twin?.toneBand, S_REFUSE_TEMPLATE.text);
      deepLink = S_REFUSE_TEMPLATE.deepLink;
      answerPath = "refuse_s";
      providerId = "none";
      providerEffective = "none";
      toolsCalled = [];
    } else if (lane === "P") {
      const loaded = await this.facts.loadTools(userId, toolsCalled, {
        query: text,
      });
      factsUsed = loaded.facts;
      toolsCalled = loaded.toolsCalled;

      route = routeAssistant({
        text,
        twin,
        facts: factsUsed,
        llm: input.llm !== false,
      });
      lane = route.lane;
      answerPath = route.answer_path;

      if (loaded.stale || factsUsed.length === 0) {
        answerText = P_REFRESH_TEMPLATE.text;
        answerPath = "fact";
        providerId = "none";
        providerEffective = "none";
      } else if (shouldCallLlm(lane, "llm_p", false) && input.llm !== false) {
        const messages = buildCoachMessages({
          lane: "P",
          userText: text,
          twin,
          facts: factsUsed,
          memories,
          history,
        });
        const llmOut = await this.llm.chat({
          messages: [...messages],
          tools: [],
          stream: false,
          lane: "P",
        });
        providerId = String(llmOut.provider_id);
        providerEffective = String(llmOut.provider_effective);
        degraded = llmOut.degraded;
        if (llmOut.degraded || !llmOut.text) {
          answerText = renderFactAnswer(factsUsed, {
            toneBand: twin?.toneBand,
          });
          answerPath = "fact";
        } else {
          answerText = llmOut.text;
          answerPath = "llm_p";
        }
      } else {
        answerText = renderFactAnswer(factsUsed, {
          toneBand: twin?.toneBand,
        });
        answerPath = answerPath === "rag" ? "rag" : "fact";
        providerId = "none";
        providerEffective = "none";
      }
    } else {
      // G lane
      toolsCalled = [];
      const messages = buildCoachMessages({
        lane: "G",
        userText: text,
        twin,
        facts: [],
        memories,
        history,
      });
      const llmOut = await this.llm.chat({
        messages: [...messages],
        tools: [],
        stream: Boolean(input.stream),
        lane: "G",
      });
      providerId = String(llmOut.provider_id);
      providerEffective = String(llmOut.provider_effective);
      degraded = llmOut.degraded;
      if (llmOut.degraded) {
        answerText = llmOut.text || G_BUSY_TEMPLATE;
        answerPath = "template";
      } else {
        answerText = llmOut.text;
        answerPath = "llm_g";
      }
    }

    let guard = guardAnswer({
      lane,
      toolsCalled,
      factsUsed,
      twin,
      userText: text,
      answerText,
      usedTwinForMoney: false,
    });

    if (guard.status === "reroute_p") {
      lane = "P";
      const loaded = await this.facts.loadTools(
        userId,
        ["getBalance", "getBuckets", "getOpportunity"],
        { query: text },
      );
      factsUsed = loaded.facts;
      toolsCalled = loaded.toolsCalled;
      answerText = loaded.stale
        ? P_REFRESH_TEMPLATE.text
        : renderFactAnswer(factsUsed, { toneBand: twin?.toneBand });
      answerPath = "fact";
      providerId = "none";
      providerEffective = "none";
      guard = guardAnswer({
        lane: "P",
        toolsCalled,
        factsUsed,
        twin,
        userText: text,
        answerText,
        usedTwinForMoney: false,
      });
    }

    if (guard.status === "refresh") {
      answerText = P_REFRESH_TEMPLATE.text;
      answerPath = "fact";
    }

    if (guard.status === "block") {
      answerText =
        lane === "S"
          ? S_REFUSE_TEMPLATE.text
          : "지금 그 답은 안전하게 안내할 수 없어요. 다른 질문을 해 주세요.";
      answerPath = lane === "S" ? "refuse_s" : "template";
    }

    // Stream chunks (simple word-ish split for SSE contract)
    if (input.stream !== false) {
      const parts = splitChunks(answerText);
      for (const part of parts) {
        yield { event: "chunk", data: { text: part } };
      }
    } else {
      yield { event: "chunk", data: { text: answerText } };
    }

    // Engine §47.16.2 — session-scoped working state only (Redis). This is
    // NOT durable memory: no ai_memory write happens here, and structured
    // deictic-reference resolution ("그중 첫 번째는") is intentionally out of
    // scope for this slice (tracked separately as the next queued todo).
    await this.convState.appendTurns(convState, [
      { role: "user", text, lane },
      { role: "assistant", text: answerText, lane },
    ]);

    const trace = await this.logs.append(
      {
        intent: route.intent || classifyLane(text),
        lane,
        twin_snapshot_id: twin?.twinSnapshotId ?? null,
        memory_ids: memoryIds,
        facts_used: factsUsed,
        tools_called: toolsCalled,
        provider_id: providerEffective === "none" ? "none" : providerId,
        answer_path: answerPath,
        guard_result: { status: guard.status, reason: guard.reason },
        answer_preview: answerText,
      },
      userId,
    );

    const done = {
      trace_id: trace.id,
      conversation_id: convState.conversationId,
      lane,
      answer_path: answerPath,
      provider_id: providerId,
      provider_effective: providerEffective,
      tools_called: toolsCalled,
      deep_link: deepLink,
      degraded,
      guard_result: guard,
      answer_text: answerText,
    };

    this.bus.emit(AI_EVENTS.coachAnswerCompleted, {
      userId,
      ...done,
    });

    yield { event: "done", data: done };
  }

  /** Non-stream convenience */
  async chatOnce(userId: string, input: CoachChatInput) {
    let done: Record<string, unknown> | null = null;
    let text = "";
    for await (const ev of this.chat(userId, { ...input, stream: false })) {
      if (ev.event === "chunk") text += ev.data.text;
      if (ev.event === "done") done = ev.data;
    }
    return { answer_text: text, ...(done || {}) };
  }
}

function splitChunks(text: string): string[] {
  const t = String(text || "");
  if (!t) return [""];
  if (t.length <= 40) return [t];
  const out: string[] = [];
  let i = 0;
  while (i < t.length) {
    out.push(t.slice(i, i + 48));
    i += 48;
  }
  return out;
}
