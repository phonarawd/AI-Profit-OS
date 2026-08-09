/**
 * Help RAG chunks — Engine §47.6
 * guide/legal/glossary only · numeric Fact MUST stay in Fact tools
 */

"use strict";

const HELP_CHUNK_KINDS = Object.freeze([
  "guide",
  "legal",
  "glossary",
  "faq",
]);

/**
 * @param {object} input
 */
function buildHelpChunk(input = {}) {
  const kind = String(input.kind || "guide");
  if (!HELP_CHUNK_KINDS.includes(kind)) {
    throw new Error(`HELP_CHUNK_KIND_INVALID:${kind}`);
  }
  const text = String(input.text || "").trim();
  if (!text) throw new Error("HELP_CHUNK_TEXT_REQUIRED");

  // Help must not embed live money numbers as SoT
  if (
    Object.prototype.hasOwnProperty.call(input, "balanceUsdt") ||
    Object.prototype.hasOwnProperty.call(input, "expectedProfitUsdt")
  ) {
    throw new Error("HELP_RAG_MUST_NOT_HOLD_MONEY_FACT");
  }

  return Object.freeze({
    schema: "help-rag-chunk.v1",
    id: input.id != null ? String(input.id) : null,
    kind,
    text,
    tags: Object.freeze(
      Array.isArray(input.tags) ? input.tags.map(String) : [],
    ),
  });
}

/**
 * Trivial keyword rank (pgvector Nest path for prod)
 * @param {string} query
 * @param {ReturnType<typeof buildHelpChunk>[]} chunks
 * @param {number} [limit]
 */
function rankHelpChunks(query, chunks, limit = 3) {
  const q = String(query || "").toLowerCase();
  const list = Array.isArray(chunks) ? chunks : [];
  const scored = list.map((c) => {
    const hay = `${c.text} ${c.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const tok of q.split(/\s+/).filter(Boolean)) {
      if (hay.includes(tok)) score += 1;
    }
    return { chunk: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored
    .filter((s) => s.score > 0)
    .slice(0, Math.max(1, Number(limit) || 3))
    .map((s) => s.chunk);
}

module.exports = {
  HELP_CHUNK_KINDS,
  buildHelpChunk,
  rankHelpChunks,
};
