/**
 * ConversationStateService — Engine §47.16.2
 * Redis-only working state · session-scoped.
 * resultRefs are hint-only snapshots (authorization NEVER).
 * Durable ai_memory preference append is owned by CoachOrchestrator
 * (reference-resolution), not this service.
 *
 * Security contract (PO-locked 2026-08-12):
 * - Redis key binds userId + conversationId — a conversationId alone can
 *   never read another user's state.
 * - Every load re-verifies `state.userId === req.user.userId` (fail-closed:
 *   any mismatch, parse failure, or absolute-lifetime expiry is treated as
 *   "no state found", never surfaced as an error to the caller).
 * - Sliding TTL (`aiConvStateTtlSec`) never extends a key past
 *   `createdAt + aiConvStateAbsoluteLifetimeSec`.
 */

import { Injectable } from "@nestjs/common";
import { loadPhase0Env } from "../config/phase0.env";
import { UpstashRedisService } from "../redis/upstash";
import {
  appendTurn,
  assertStateOwnership,
  buildConversationState,
  buildHistoryMessages,
  conversationStateRedisKey,
  effectiveTtlSec,
  isWithinAbsoluteLifetime,
  newConversationId,
  rememberResultRef,
  type ConversationResultRef,
  type ConversationState,
  type ConversationTurn,
  type ConversationTurnInput,
} from "./ai.engine";

export type {
  ConversationResultRef,
  ConversationState,
  ConversationTurn,
  ConversationTurnInput,
};

@Injectable()
export class ConversationStateService {
  constructor(private readonly redis: UpstashRedisService) {}

  /**
   * Loads state for (userId, conversationId). Fail-closed: ownership
   * mismatch, parse errors, and absolute-lifetime expiry all resolve to
   * `null` instead of throwing or exposing another user's data.
   */
  async load(
    userId: string,
    conversationId: string | null | undefined,
  ): Promise<ConversationState | null> {
    if (!userId || !conversationId) return null;
    let key: string;
    try {
      key = conversationStateRedisKey(userId, conversationId);
    } catch {
      return null;
    }
    const raw = await this.redis.get(key);
    if (!raw) return null;

    let parsed: ConversationState;
    try {
      parsed = JSON.parse(raw) as ConversationState;
    } catch {
      return null;
    }

    try {
      assertStateOwnership(parsed, userId);
    } catch {
      return null;
    }

    const env = loadPhase0Env();
    if (
      !isWithinAbsoluteLifetime(
        parsed,
        Date.now(),
        env.aiConvStateAbsoluteLifetimeSec,
      )
    ) {
      return null;
    }

    return parsed;
  }

  /**
   * Loads existing state when a valid conversationId is supplied, otherwise
   * (or when load fails/expires) starts a brand-new conversation.
   */
  async createOrLoad(
    userId: string,
    conversationId?: string | null,
  ): Promise<{ state: ConversationState; isNew: boolean }> {
    if (conversationId) {
      const existing = await this.load(userId, conversationId);
      if (existing) return { state: existing, isNew: false };
    }
    const state = buildConversationState({
      userId,
      conversationId: conversationId || newConversationId(),
    }) as ConversationState;
    return { state, isNew: true };
  }

  /**
   * Appends one or more turns (pure, in-memory) and persists once with a
   * sliding TTL that never exceeds the absolute lifetime cap.
   */
  async appendTurns(
    state: ConversationState,
    turns: ConversationTurnInput[],
  ): Promise<ConversationState> {
    let next = state;
    for (const turn of turns) {
      next = appendTurn(next, turn) as ConversationState;
    }
    await this.save(next);
    return next;
  }

  async save(state: ConversationState): Promise<void> {
    const env = loadPhase0Env();
    const ttl = effectiveTtlSec(
      state,
      Date.now(),
      env.aiConvStateTtlSec,
      env.aiConvStateAbsoluteLifetimeSec,
    );
    // Past the absolute lifetime cap — let it lapse instead of persisting.
    if (ttl <= 0) return;
    const key = conversationStateRedisKey(state.userId, state.conversationId);
    await this.redis.set(key, JSON.stringify(state), ttl);
  }

  /** Bounded recent-turn messages for LLM prompt assembly. */
  historyMessages(
    state: ConversationState | null,
    maxChars = 800,
  ): Array<{ role: string; content: string }> {
    if (!state) return [];
    return buildHistoryMessages(state, maxChars) as Array<{
      role: string;
      content: string;
    }>;
  }

  /**
   * Persist hint-only resultRef snapshot into working-state (not authorization).
   */
  async rememberResultRef(
    state: ConversationState,
    ref: { type: string; ids: string[]; aliases?: Record<string, string> },
  ): Promise<ConversationState> {
    const next = rememberResultRef(state, ref) as ConversationState;
    await this.save(next);
    return next;
  }
}
