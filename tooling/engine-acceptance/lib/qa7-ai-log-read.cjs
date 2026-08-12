/**
 * QA7 — read-only fetch of runtime ai_logs row by id (trace_id)
 * Approved observation path for HTTP canonical capture.
 * No field invention · no expectation fill.
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

/**
 * @param {string} databaseUrl
 * @param {string} traceId
 * @returns {Promise<object|null>}
 */
async function fetchAiLogById(databaseUrl, traceId) {
  if (!databaseUrl || !traceId) return null;
  let pg;
  try {
    pg = require(require.resolve("pg", {
      paths: [path.join(ROOT, "services/api-nest"), ROOT],
    }));
  } catch {
    const err = new Error("BLOCKED_NO_PG_CLIENT: pg module unresolved");
    err.code = "BLOCKED_NO_PG_CLIENT";
    throw err;
  }
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 8000,
    statement_timeout: 8000,
  });
  await client.connect();
  try {
    const res = await client.query(
      `SELECT id::text, user_id::text, intent, lane, twin_snapshot_id,
              memory_ids, facts_used, tools_called, provider_id, answer_path,
              guard_result, answer_preview, created_at
         FROM public.ai_logs
        WHERE id = $1::uuid`,
      [traceId],
    );
    return res.rows[0] || null;
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Map DB row → ai-answer-trace body fields (observation only)
 * @param {object} row
 */
function aiLogRowToTraceBody(row) {
  if (!row || typeof row !== "object") {
    return { ok: false, missing: ["ai_log_row"], body: null };
  }
  /** @type {string[]} */
  const missing = [];
  for (const k of [
    "intent",
    "lane",
    "facts_used",
    "tools_called",
    "provider_id",
    "answer_path",
    "guard_result",
  ]) {
    if (row[k] === undefined || row[k] === null) missing.push(k);
  }
  if (missing.length) {
    return { ok: false, missing, body: null };
  }
  return {
    ok: true,
    missing: [],
    body: {
      schema: "ai-answer-trace.v1",
      intent: String(row.intent),
      lane: String(row.lane),
      twin_snapshot_id: row.twin_snapshot_id || null,
      memory_ids: Array.isArray(row.memory_ids) ? [...row.memory_ids] : [],
      facts_used: Array.isArray(row.facts_used) ? [...row.facts_used] : row.facts_used,
      tools_called: Array.isArray(row.tools_called)
        ? [...row.tools_called]
        : row.tools_called,
      provider_id: String(row.provider_id),
      answer_path: String(row.answer_path),
      guard_result:
        typeof row.guard_result === "object"
          ? row.guard_result
          : { status: String(row.guard_result) },
      answer_preview:
        row.answer_preview != null ? String(row.answer_preview) : null,
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : new Date().toISOString(),
    },
  };
}

module.exports = {
  fetchAiLogById,
  aiLogRowToTraceBody,
};
