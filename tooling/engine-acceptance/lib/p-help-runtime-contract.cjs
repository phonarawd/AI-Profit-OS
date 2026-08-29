/**
 * p_help runtime-trace contract.
 *
 * HTTP 500 / missing trace_id stay BLOCKED — never rewritten to PASS.
 */
"use strict";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function classifyCanonicalChatHttp(res) {
  if (!res || res.ok !== true) {
    const status = res && res.status != null ? res.status : "fetch_failed";
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_HTTP_ERROR",
      canonical_http: false,
      runtime_trace: false,
      trace_id: null,
      reason: `HTTP ${status}`,
    };
  }
  const body = res.body && typeof res.body === "object" ? res.body : {};
  const traceId = body.trace_id != null ? String(body.trace_id) : "";
  if (!traceId) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_MISSING_RUNTIME_FIELD",
      canonical_http: true,
      runtime_trace: false,
      trace_id: null,
      reason: "HTTP response missing runtime trace_id",
    };
  }
  if (!UUID_RE.test(traceId)) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_MISSING_RUNTIME_FIELD",
      canonical_http: true,
      runtime_trace: false,
      trace_id: null,
      reason: "runtime trace_id is not a UUID",
    };
  }
  return {
    status: "OBSERVED",
    blockCode: null,
    canonical_http: true,
    runtime_trace: true,
    trace_id: traceId,
    reason: null,
  };
}

function reproduceUncaughtHelpAsHttp500() {
  return classifyCanonicalChatHttp({ ok: false, status: 500, body: null });
}

function observeSuccessfulHelpRuntime(traceId) {
  return classifyCanonicalChatHttp({
    ok: true,
    status: 200,
    body: {
      trace_id: traceId,
      tools_called: ["searchHelp"],
      lane: "P",
    },
  });
}

function mapHelpRowsFailClosed(rows, seed, query, limit, builders) {
  const buildHelpChunk = builders.buildHelpChunk;
  const rankHelpChunks = builders.rankHelpChunks;
  const q = String(query || "").trim();
  try {
    const chunks = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      try {
        chunks.push(
          buildHelpChunk({
            id: r.id,
            kind: (r.metadata && r.metadata.kind) || "guide",
            text: r.content,
            tags: Array.isArray(r.metadata && r.metadata.tags) ? r.metadata.tags : [],
          }),
        );
      } catch {
        /* skip bad row — do not fail the turn */
      }
    }
    if (chunks.length > 0) {
      return rankHelpChunks(q, chunks, limit);
    }
  } catch {
    /* seed */
  }
  return rankHelpChunks(q, seed, limit);
}

module.exports = {
  classifyCanonicalChatHttp,
  reproduceUncaughtHelpAsHttp500,
  observeSuccessfulHelpRuntime,
  mapHelpRowsFailClosed,
};
