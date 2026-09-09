/**
 * S3 / 3.4 퍼뜩 대화 이력. 서버 권위. JWT userId 만.
 * conversationId 단독 조회 금지.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import type { QueryResultRow } from "pg";
import { PostgresService } from "../db/postgres";
import {
  citationsFromFacts,
  titleFromUserText,
  type PeotteokCitation,
} from "./peotteok-citation";

export type PeotteokHistoryConversation = {
  id: string;
  title: string;
  updatedAt: string;
};

export type PeotteokHistoryMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  lane: string | null;
  deepLink: string | null;
  citations: PeotteokCitation[];
  createdAt: string;
};

@Injectable()
export class PeotteokHistoryService {
  private readonly db: PostgresService;
  constructor(db: PostgresService) {
    this.db = db;
  }

  async list(userId: string): Promise<PeotteokHistoryConversation[]> {
    const { rows } = await this.queryOptional<{
      id: string;
      title: string;
      updated_at: Date;
    }>(
      `SELECT id::text, title, updated_at
         FROM public.peotteok_conversations
        WHERE user_id = $1::uuid
        ORDER BY updated_at DESC
        LIMIT 50`,
      [userId],
    );
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  }

  async get(
    userId: string,
    conversationId: string,
  ): Promise<{
    conversation: PeotteokHistoryConversation;
    messages: PeotteokHistoryMessage[];
  }> {
    const conv = await this.queryOptional<{
      id: string;
      title: string;
      updated_at: Date;
    }>(
      `SELECT id::text, title, updated_at
         FROM public.peotteok_conversations
        WHERE id = $1::uuid AND user_id = $2::uuid`,
      [conversationId, userId],
    );
    if (!conv.rows[0]) {
      throw new NotFoundException("conversation not found");
    }
    const msgs = await this.queryOptional<{
      id: string;
      role: "user" | "assistant" | "system";
      body: string;
      lane: string | null;
      deep_link: string | null;
      citation: PeotteokCitation[] | null;
      created_at: Date;
    }>(
      `SELECT id::text, role, body, lane, deep_link, citation, created_at
         FROM public.peotteok_messages
        WHERE conversation_id = $1::uuid AND user_id = $2::uuid
        ORDER BY created_at ASC
        LIMIT 200`,
      [conversationId, userId],
    );
    return {
      conversation: {
        id: conv.rows[0].id,
        title: conv.rows[0].title,
        updatedAt: new Date(conv.rows[0].updated_at).toISOString(),
      },
      messages: msgs.rows.map((row) => ({
        id: row.id,
        role: row.role,
        text: row.body,
        lane: row.lane,
        deepLink: row.deep_link,
        citations: Array.isArray(row.citation) ? row.citation : [],
        createdAt: new Date(row.created_at).toISOString(),
      })),
    };
  }

  async rename(userId: string, conversationId: string, title: string) {
    const next = titleFromUserText(title);
    const { rows } = await this.queryOptional<{ id: string }>(
      `UPDATE public.peotteok_conversations
          SET title = $3, updated_at = now()
        WHERE id = $1::uuid AND user_id = $2::uuid
        RETURNING id::text`,
      [conversationId, userId, next],
    );
    if (!rows[0]) throw new NotFoundException("conversation not found");
    return { id: rows[0].id, title: next };
  }

  async remove(userId: string, conversationId: string) {
    const { rows } = await this.queryOptional<{ id: string }>(
      `DELETE FROM public.peotteok_conversations
        WHERE id = $1::uuid AND user_id = $2::uuid
        RETURNING id::text`,
      [conversationId, userId],
    );
    if (!rows[0]) throw new NotFoundException("conversation not found");
    return { ok: true as const };
  }

  async appendTurn(input: {
    userId: string;
    conversationId: string;
    userText: string;
    assistantText: string;
    lane: string | null;
    deepLink: string | null;
    facts: Array<{ source?: string; payload?: Record<string, unknown> }>;
    asOf?: string;
  }): Promise<void> {
    if (!this.db.configured()) return;
    const title = titleFromUserText(input.userText);
    const citations = citationsFromFacts(
      input.facts,
      input.asOf ?? new Date().toISOString(),
    );
    try {
      await this.db.query(
        `INSERT INTO public.peotteok_conversations (id, user_id, title)
         VALUES ($1::uuid, $2::uuid, $3)
         ON CONFLICT (id) DO UPDATE SET
           updated_at = now(),
           title = CASE
             WHEN peotteok_conversations.title = '새 대화' THEN EXCLUDED.title
             ELSE peotteok_conversations.title
           END
         WHERE peotteok_conversations.user_id = $2::uuid`,
        [input.conversationId, input.userId, title],
      );
      await this.db.query(
        `INSERT INTO public.peotteok_messages (
           conversation_id, user_id, role, body, lane, deep_link, citation
         ) VALUES
           ($1::uuid, $2::uuid, 'user', $3, $4, NULL, '[]'::jsonb),
           ($1::uuid, $2::uuid, 'assistant', $5, $4, $6, $7::jsonb)`,
        [
          input.conversationId,
          input.userId,
          input.userText,
          input.lane,
          input.assistantText,
          input.deepLink,
          JSON.stringify(citations),
        ],
      );
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
      if (code === "42P01") return;
      throw err;
    }
  }

  private async queryOptional<T extends QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    if (!this.db.configured()) return { rows: [] };
    try {
      return await this.db.query<T>(text, params);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: unknown }).code ?? "")
          : "";
      if (code === "42P01") return { rows: [] };
      throw err;
    }
  }
}
