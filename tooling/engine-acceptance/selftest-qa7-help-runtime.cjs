"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { ROOT } = require("./lib/hash-scope.cjs");
const {
  classifyCanonicalChatHttp,
  reproduceUncaughtHelpAsHttp500,
  observeSuccessfulHelpRuntime,
  mapHelpRowsFailClosed,
} = require("./lib/p-help-runtime-contract.cjs");

const ai = require(path.join(ROOT, "services/ai-platform/src/index.cjs"));

function run() {
  const fails = [];
  const check = (name, fn) => {
    try {
      fn();
      console.log("  PASS " + name);
    } catch (e) {
      fails.push(name + ": " + (e instanceof Error ? e.message : e));
      console.log("  FAIL " + name + ": " + (e instanceof Error ? e.message : e));
    }
  };

  console.log("[selftest-qa7-help-runtime] start");

  check("p_help_routes_to_searchHelp", () => {
    assert.deepEqual(ai.defaultToolsForText("FAQ"), ["searchHelp"]);
  });

  check("invalid_help_chunk_kind_throws_old_behavior", () => {
    assert.throws(
      () => ai.buildHelpChunk({ kind: "wiki", text: "bad kind must throw" }),
      /HELP_CHUNK_KIND_INVALID/,
    );
  });

  check("uncaught_help_throw_classifies_as_blocked_http_500", () => {
    const blocked = reproduceUncaughtHelpAsHttp500();
    assert.equal(blocked.status, "BLOCKED");
    assert.equal(blocked.blockCode, "BLOCKED_HTTP_ERROR");
    assert.equal(blocked.runtime_trace, false);
    assert.equal(blocked.trace_id, null);
    assert.notEqual(blocked.status, "PASS");
  });

  check("http_500_never_rewritten_to_pass", () => {
    const out = classifyCanonicalChatHttp({ ok: false, status: 500, body: {} });
    assert.equal(out.status, "BLOCKED");
    assert.equal(out.blockCode, "BLOCKED_HTTP_ERROR");
  });

  check("bad_db_row_does_not_throw_after_fail_closed", () => {
    const seed = [
      ai.buildHelpChunk({
        id: "help-lane",
        kind: "faq",
        text: "seed fqa text for help search",
        tags: ["FAQ"],
      }),
    ];
    const rows = [
      { id: "bad", content: "x", metadata: { kind: "wiki" } },
      {
        id: "ok",
        content: "faq help text from db",
        metadata: { kind: "faq", tags: ["FAQ"] },
      },
    ];
    const out = mapHelpRowsFailClosed(rows, seed, "FAQ", 3, {
      buildHelpChunk: ai.buildHelpChunk,
      rankHelpChunks: ai.rankHelpChunks,
    });
    assert.ok(Array.isArray(out));
    assert.ok(out.length >= 1);
    assert.ok(out.every((c) => c.kind !== "wiki"));
  });

  check("help_fact_renders_and_logs_without_throw", () => {
    const fact = ai.buildFactCard({
      source: "other",
      ttlSec: 300,
      payload: { helpText: "help text from searchHelp", summary: "FAQ" },
    });
    const text = ai.renderFactAnswer([fact], {});
    assert.ok(String(text).includes("help text"));
    const messages = ai.buildCoachMessages({
      lane: "P",
      userText: "FAQ",
      facts: [fact],
    });
    assert.equal(messages[0].role, "system");
    const rec = ai.buildAiLogRecord({
      intent: "platform_help",
      lane: "P",
      facts_used: [fact],
      tools_called: ["searchHelp"],
      provider_id: "none",
      answer_path: "fact",
      guard_result: {status: "pass"},
      answer_preview: text,
    });
    assert.deepEqual([...rec.tools_called], ["searchHelp"]);
  });

  check("success_runtime_uuid_is_canonical_http", () => {
    const out = observeSuccessfulHelpRuntime("2f1a0c4e-7b91-4d2a-9c33-0a1b2c3d4e5f");
    assert.equal(out.status, "OBSERVED");
    assert.equal(out.canonical_http, true);
    assert.equal(out.runtime_trace, true);
    assert.equal(out.trace_id, "2f1a0c4e-7b91-4d2a-9c33-0a1b2c3d4e5f");
  });

  if (fails.length) {
    console.error("[selftest-qa7-help-runtime] FAIL");
    for (const f of fails) console.error("  - " + f);
    process.exit(1);
  }
  console.log("[selftest-qa7-help-runtime] PASS");
}

if (require.main === module) {
  run();
}

module.exports = { run };
