/**
 * verify:rel-305-bounded-memory — REL-305 conversation-state boundary
 * user isolation · secret redact · no unbounded persist
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];
const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));

function loadJsonl(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return [];
  }
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const rows = loadJsonl("eval/rel-305-bounded-memory.jsonl");
if (rows.length < 5) fails.push("rel-305-bounded-memory.jsonl must have >=5 cases");

for (const row of rows) {
  if (row.check === "redis_key_binds_user") {
    const a = ai.conversationStateRedisKey("u1", "c1");
    const b = ai.conversationStateRedisKey("u2", "c1");
    if (a === b) fails.push(`${row.id}: key must bind userId`);
    if (!a.includes("u1") || !a.includes("c1")) {
      fails.push(`${row.id}: key must include user+conversation`);
    }
  }

  if (row.check === "ownership_mismatch") {
    const state = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
    try {
      ai.assertStateOwnership(state, "u2");
      fails.push(`${row.id}: other-user context must fail-closed`);
    } catch (e) {
      if (e.code !== "CONV_STATE_OWNERSHIP_MISMATCH") {
        fails.push(`${row.id}: wrong ownership code`);
      }
    }
  }

  if (row.check === "max_turns") {
    let state = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
    for (let i = 0; i < 20; i++) {
      state = ai.appendTurn(state, {
        role: i % 2 === 0 ? "user" : "assistant",
        text: `turn-${i}`,
      });
    }
    if (state.turns.length > ai.MAX_TURNS) {
      fails.push(`${row.id}: unbounded memory created (${state.turns.length})`);
    }
  }

  if (row.check === "secret_redact") {
    let state = ai.buildConversationState({ userId: "u1", conversationId: "c1" });
    state = ai.appendTurn(state, {
      role: "user",
      text: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaa.bbbbbbbbbb and sk-abcdefghijklmnopqrstuvwxyz123456",
    });
    const text = state.turns[0].text;
    if (/Bearer\s+eyJ|sk-[A-Za-z0-9]{20,}/.test(text)) {
      fails.push(`${row.id}: secret/token persisted`);
    }
    if (!text.includes("[REDACTED]")) {
      fails.push(`${row.id}: secrets must be redacted`);
    }
    if (typeof ai.sanitizeTurnText !== "function") {
      fails.push(`${row.id}: sanitizeTurnText missing on existing owner`);
    }
  }

  if (row.check === "ttl_cap") {
    const created = new Date("2026-08-12T00:00:00.000Z").getTime();
    const old = ai.buildConversationState({
      userId: "u1",
      conversationId: "c1",
      createdAt: new Date(created).toISOString(),
    });
    if (ai.isWithinAbsoluteLifetime(old, created + 13 * 3600 * 1000, 43200)) {
      fails.push(`${row.id}: absolute lifetime must expire`);
    }
    if (ai.effectiveTtlSec(old, created + 13 * 3600 * 1000, 3600, 43200) !== 0) {
      fails.push(`${row.id}: TTL past cap must be 0`);
    }
  }

  if (row.check === "no_memory_append") {
    const svc = fs.readFileSync(
      path.join(root, "services/api-nest/src/ai/conversation-state.service.ts"),
      "utf8",
    );
    if (/this\.memory\.append/.test(svc) || /MemoryService/.test(svc)) {
      fails.push(`${row.id}: ConversationStateService must not own durable memory`);
    }
  }
}

const pkg = fs.readFileSync(path.join(root, "package.json"), "utf8");
if (!pkg.includes("verify:rel-305-bounded-memory")) {
  fails.push("package.json missing verify:rel-305-bounded-memory");
}

if (fails.length) {
  console.error("[verify:rel-305-bounded-memory] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log("[verify:rel-305-bounded-memory] PASS (isolation · redact · bound)");
