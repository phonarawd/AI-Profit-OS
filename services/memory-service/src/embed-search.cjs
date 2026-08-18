/**
 * pgvector L1 helpers — Day-1 dim=768 (gemini-embedding-001)
 * Nest runs SQL; this module validates + ranks for unit/CI
 */

"use strict";

const EMBEDDING_DIM = 768;
const DEFAULT_MODEL_ID = "gemini-embedding-001";

/**
 * @param {unknown} vec
 * @returns {number[]}
 */
function assertEmbedding(vec) {
  if (!Array.isArray(vec)) {
    throw new Error("EMBEDDING_MUST_BE_ARRAY");
  }
  if (vec.length !== EMBEDDING_DIM) {
    throw new Error(
      `EMBEDDING_DIM_MISMATCH:want_${EMBEDDING_DIM}_got_${vec.length}`,
    );
  }
  const out = [];
  for (let i = 0; i < vec.length; i++) {
    const n = Number(vec[i]);
    if (!Number.isFinite(n)) {
      throw new Error(`EMBEDDING_NON_FINITE_AT_${i}`);
    }
    out.push(n);
  }
  return out;
}

/**
 * Cosine similarity 0..1-ish (not distance)
 * @param {number[]} a
 * @param {number[]} b
 */
function cosineSimilarity(a, b) {
  const va = assertEmbedding(a);
  const vb = assertEmbedding(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    dot += va[i] * vb[i];
    na += va[i] * va[i];
    nb += vb[i] * vb[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Rank memory candidates by cosine similarity (desc)
 * @param {number[]} query
 * @param {{ id: string, embedding: number[] }[]} candidates
 * @param {number} [limit]
 */
function rankByCosine(query, candidates, limit = 5) {
  assertEmbedding(query);
  const scored = (Array.isArray(candidates) ? candidates : []).map((c) => ({
    id: String(c.id),
    score: cosineSimilarity(query, c.embedding),
  }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, Math.max(1, Number(limit) || 5));
}

/**
 * pgvector literal for parameterized insert (Nest prefers ::vector cast)
 * @param {number[]} vec
 */
function toPgVectorLiteral(vec) {
  const v = assertEmbedding(vec);
  return `[${v.join(",")}]`;
}

module.exports = {
  EMBEDDING_DIM,
  DEFAULT_MODEL_ID,
  assertEmbedding,
  cosineSimilarity,
  rankByCosine,
  toPgVectorLiteral,
};
