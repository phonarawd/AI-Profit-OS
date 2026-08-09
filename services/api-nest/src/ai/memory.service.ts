/**
 * Memory Nest store — PG ai_memory + memory_embeddings (pgvector L1)
 * Engine §47.9 · Day-1 dim=768
 */

import { BadRequestException, Injectable } from "@nestjs/common";
import { PostgresService } from "../db/postgres";
import { UpstashRedisService } from "../redis/upstash";
import {
  assertEmbedding,
  assertNoMemoryMoneyKeys,
  buildMemoryRecord,
  DEFAULT_MODEL_ID,
  EMBEDDING_DIM,
  memoryRecentRedisKey,
  toPgVectorLiteral,
} from "./ai.engine";

@Injectable()
export class MemoryService {
  constructor(
    private readonly db: PostgresService,
    private readonly redis: UpstashRedisService,
  ) {}

  async append(
    userId: string,
    input: {
      kind?: string;
      content: string;
      metadata?: Record<string, unknown>;
      embedding?: number[];
      modelId?: string;
    },
  ) {
    if (!userId) throw new BadRequestException("userId_required");
    let rec;
    try {
      if (input.metadata) assertNoMemoryMoneyKeys(input.metadata);
      rec = buildMemoryRecord({
        userId,
        kind: input.kind,
        content: input.content,
        metadata: input.metadata,
      });
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : "MEMORY_INVALID",
      );
    }

    const ins = await this.db.query(
      `INSERT INTO public.ai_memory (user_id, kind, content, metadata)
       VALUES ($1::uuid, $2, $3, $4::jsonb)
       RETURNING id::text, user_id::text, kind, content, metadata, created_at, updated_at`,
      [
        userId,
        rec.kind,
        rec.content,
        JSON.stringify(rec.metadata),
      ],
    );
    const row = ins.rows[0];

    if (Array.isArray(input.embedding)) {
      const vec = assertEmbedding(input.embedding);
      if (vec.length !== EMBEDDING_DIM) {
        throw new BadRequestException(`EMBEDDING_DIM_${EMBEDDING_DIM}`);
      }
      const literal = toPgVectorLiteral(vec);
      await this.db.query(
        `INSERT INTO public.memory_embeddings (memory_id, user_id, embedding, model_id)
         VALUES ($1::uuid, $2::uuid, $3::extensions.vector, $4)
         ON CONFLICT (memory_id) DO UPDATE SET
           embedding = EXCLUDED.embedding,
           model_id = EXCLUDED.model_id`,
        [
          row.id,
          userId,
          literal,
          input.modelId || DEFAULT_MODEL_ID,
        ],
      );
    }

    const recentKey = memoryRecentRedisKey(userId);
    const prev = await this.redis.get(recentKey);
    let ids: string[] = [];
    if (prev) {
      try {
        ids = JSON.parse(prev) as string[];
      } catch {
        ids = [];
      }
    }
    ids = [row.id, ...ids.filter((x) => x !== row.id)].slice(0, 20);
    await this.redis.set(recentKey, JSON.stringify(ids), 3600);

    return buildMemoryRecord({
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      content: row.content,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async listRecent(userId: string, limit = 20) {
    if (!userId) throw new BadRequestException("userId_required");
    const lim = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const res = await this.db.query(
      `SELECT id::text, user_id::text, kind, content, metadata, created_at, updated_at
         FROM public.ai_memory
        WHERE user_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT $2`,
      [userId, lim],
    );
    return res.rows.map((r) =>
      buildMemoryRecord({
        id: r.id,
        userId: r.user_id,
        kind: r.kind,
        content: r.content,
        metadata: r.metadata,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    );
  }

  /**
   * Cosine distance search via pgvector (`<=>`)
   */
  async searchByEmbedding(
    userId: string,
    embedding: number[],
    limit = 5,
  ) {
    if (!userId) throw new BadRequestException("userId_required");
    const vec = assertEmbedding(embedding);
    const lim = Math.min(Math.max(Number(limit) || 5, 1), 20);
    const literal = toPgVectorLiteral(vec);
    const res = await this.db.query(
      `SELECT m.id::text, m.user_id::text, m.kind, m.content, m.metadata,
              m.created_at, m.updated_at,
              (e.embedding <=> $2::extensions.vector) AS distance
         FROM public.memory_embeddings e
         JOIN public.ai_memory m ON m.id = e.memory_id
        WHERE e.user_id = $1::uuid
        ORDER BY e.embedding <=> $2::extensions.vector
        LIMIT $3`,
      [userId, literal, lim],
    );
    return res.rows.map((r) => ({
      memory: buildMemoryRecord({
        id: r.id,
        userId: r.user_id,
        kind: r.kind,
        content: r.content,
        metadata: r.metadata,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
      distance: Number(r.distance),
    }));
  }
}
