/** Engine §47 Memory + pgvector L1 helpers */

export const MEMORY_KINDS: readonly [
  "session_summary",
  "long_term",
  "help_chunk",
  "other",
];
export const FORBIDDEN_MEMORY_MONEY_KEYS: readonly [
  "balanceUsdt",
  "expectedProfitUsdt",
  "liveQuote",
];
export const EMBEDDING_DIM: 768;
export const DEFAULT_MODEL_ID: "gemini-embedding-001";

export type MemoryRecord = {
  readonly schema: "ai-memory.v1";
  readonly id: string | null;
  readonly userId: string | null;
  readonly kind: string;
  readonly content: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export function assertNoMemoryMoneyKeys(
  obj: Record<string, unknown> | null | undefined,
): void;
export function buildMemoryRecord(input?: object): MemoryRecord;
export function memoryRecentRedisKey(userId: string): string;
export function assertEmbedding(vec: unknown): number[];
export function cosineSimilarity(a: number[], b: number[]): number;
export function rankByCosine(
  query: number[],
  candidates: { id: string; embedding: number[] }[],
  limit?: number,
): { id: string; score: number }[];
export function toPgVectorLiteral(vec: number[]): string;
