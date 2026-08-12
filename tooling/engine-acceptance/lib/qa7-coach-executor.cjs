/**
 * QA7 tooling-only coach executor
 *
 * CANONICAL seam (default):
 *   eval row.input → POST /api/v1/me/peotteok/chat → CoachOrchestrator
 *   → AiLogsAdminService.append → runtime trace_id → ai_logs read → grader
 *
 * LIBRARY seam (diagnostic / selftest only):
 *   ai-platform modules in-process · FIXTURE_ONLY · NEVER canonical
 *
 * STRICT: dataset expectation fields are NEVER read here.
 * Grader alone compares expected vs actual.
 */
"use strict";

const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");
const { buildQa7TraceArtifact } = require("./qa7-trace.cjs");
const {
  fetchAiLogById,
  aiLogRowToTraceBody,
} = require("./qa7-ai-log-read.cjs");

const ai = require(path.join(ROOT, "services/ai-platform/src/index.cjs"));

/**
 * FIXTURE_ONLY builders — library diagnostic seam only.
 * NEVER treat as canonical runtime FactToolService observation.
 */
const TOOL_FACT_BUILDERS = Object.freeze({
  getBalance: () =>
    ai.buildFactCard({
      source: "wallet",
      payload: {
        liabilityUsdt: "12.34",
        profitUsdt: "12.34",
        principalUsdt: "0",
      },
      ttlSec: 300,
    }),
  getBuckets: () =>
    ai.buildFactCard({
      source: "ledger",
      payload: {
        liabilityUsdt: "12.34",
        profitUsdt: "12.34",
        principalUsdt: "0",
      },
      ttlSec: 300,
    }),
  getDepositUsdt: () =>
    ai.buildFactCard({
      source: "wallet",
      payload: { guideText: "USDT 입금 주소는 지갑 화면에서 확인할 수 있어요." },
      ttlSec: 300,
    }),
  getKrwDeposit: () =>
    ai.buildFactCard({
      source: "wallet",
      payload: { guideText: "원화 입금 안내는 지갑 화면에서 확인하세요." },
      ttlSec: 300,
    }),
  getOpportunity: () =>
    ai.buildFactCard({
      source: "opportunity",
      payload: {
        opportunityId: "synth-opp-1",
        expectedProfitUsdt: "1.50",
        count: 1,
      },
      ttlSec: 300,
    }),
  getKyc: () =>
    ai.buildFactCard({
      source: "kyc",
      payload: { kycStatus: "approved" },
      ttlSec: 300,
    }),
  getBenefitsSummary: () =>
    ai.buildFactCard({
      source: "membership",
      payload: { claimableCount: 0, benefitsHref: "/me/benefits" },
      ttlSec: 300,
    }),
  getReferral: () =>
    ai.buildFactCard({
      source: "referral",
      payload: { summary: "친구 초대 혜택은 초대 화면에서 확인할 수 있어요." },
      ttlSec: 300,
    }),
  getExecution: () =>
    ai.buildFactCard({
      source: "other",
      payload: { kind: "execution", executionStatus: "none" },
      ttlSec: 300,
    }),
  getUsdtGuide: () =>
    ai.buildFactCard({
      source: "other",
      payload: { guideText: "테더 준비 가이드는 도움말에서 볼 수 있어요." },
      ttlSec: 300,
    }),
  getHelp: () =>
    ai.buildFactCard({
      source: "other",
      payload: { helpText: "이용 방법은 도움말에서 안내해요." },
      ttlSec: 300,
    }),
});

/** @deprecated alias — FIXTURE_ONLY */
function syntheticFactsForTools(tools) {
  const facts = [];
  const seen = new Set();
  for (const t of tools) {
    const builder = TOOL_FACT_BUILDERS[t];
    if (!builder) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    facts.push(builder());
  }
  return facts;
}

function adapterConfig(env) {
  return {
    apiKey: env._apiKey || null,
    geminiApiKey: env._apiKey || null,
    llmApiKey: env._apiKey || null,
    model: env.geminiModel || env.openaiModel || env.groqModel || env.ollamaModel,
    geminiModel: env.geminiModel,
    openaiModel: env.openaiModel,
    groqModel: env.groqModel,
    ollamaModel: env.ollamaModel,
    baseUrl: env.llmBaseUrl || undefined,
    llmBaseUrl: env.llmBaseUrl || undefined,
  };
}

/**
 * LIBRARY / DIAGNOSTIC seam — mirrors product guard flow honestly.
 * Does NOT lock answer_path to dataset expectations.
 * Results are NEVER canonical evidence.
 * @param {object} row — uses input only
 * @param {object} ctx
 */
async function executeViaAiPlatform(row, ctx) {
  const text = String(row.input || "").trim();
  const allowLlm = ctx.allowLlm !== false;
  const env = ctx.env;

  let route = ai.routeAssistant({
    text,
    twin: null,
    facts: [],
    llm: allowLlm,
  });

  let lane = route.lane;
  let toolsCalled = [...(route.tools_called || [])];
  let answerPath = route.answer_path;
  let factsUsed = [];
  let providerId = "none";
  let providerEffective = "none";
  let answerText = "";
  let modelExecuted = false;
  let degraded = false;
  /** @type {string|null} */
  let blockCode = null;
  let usedSyntheticFacts = false;

  if (lane === "S") {
    answerText = ai.shapeByTone(null, ai.S_REFUSE_TEMPLATE.text);
    answerPath = "refuse_s";
    toolsCalled = [];
    providerId = "none";
    providerEffective = "none";
  } else if (answerPath === "scope_redirect") {
    answerText = ai.shapeByTone(null, ai.SCOPE_REDIRECT_TEMPLATE.text);
    answerPath = "scope_redirect";
    toolsCalled = [];
    providerId = "none";
    providerEffective = "none";
  } else if (lane === "P") {
    factsUsed = syntheticFactsForTools(toolsCalled);
    usedSyntheticFacts = factsUsed.length > 0;
    route = ai.routeAssistant({
      text,
      twin: null,
      facts: factsUsed,
      llm: allowLlm,
    });
    lane = route.lane;
    answerPath = route.answer_path;

    if (factsUsed.length === 0) {
      answerText = ai.P_REFRESH_TEMPLATE.text;
      answerPath = "fact";
      providerId = "none";
      providerEffective = "none";
    } else if (
      allowLlm &&
      ai.shouldCallLlm(lane, "llm_p", false) &&
      env.provider !== "none" &&
      env.hasProviderCredential
    ) {
      const messages = ai.buildCoachMessages({
        lane: "P",
        userText: text,
        twin: null,
        facts: factsUsed,
        memories: [],
        history: [],
      });
      const adapter = ai.createLlmAdapter(env.provider, adapterConfig(env));
      const llmOut = await ai.llmAdapterChat(adapter, {
        messages: [...messages],
        tools: [],
        stream: false,
        lane: "P",
      });
      modelExecuted = true;
      providerId = String(llmOut.provider_id || env.provider);
      providerEffective = String(llmOut.provider_effective || "none");
      degraded = Boolean(llmOut.degraded);
      if (llmOut.degraded || !llmOut.text) {
        answerText = ai.renderFactAnswer(factsUsed, {});
        answerPath = "fact";
        providerId = "none";
        providerEffective = "none";
      } else {
        answerText = llmOut.text;
        answerPath = "llm_p";
      }
    } else {
      answerText = ai.renderFactAnswer(factsUsed, {});
      answerPath = answerPath === "rag" ? "rag" : "fact";
      providerId = "none";
      providerEffective = "none";
    }
  } else {
    toolsCalled = [];
    if (
      !allowLlm ||
      env.provider === "none" ||
      !env.hasProviderCredential
    ) {
      blockCode = "BLOCKED_NO_PROVIDER";
      return {
        status: "BLOCKED",
        blockCode,
        modelExecuted: false,
        invocation_seam: "ai_platform_coach_path",
        canonical_trace: false,
        fixture_only: true,
        reason: "G-lane requires configured provider credential",
      };
    }
    const messages = ai.buildCoachMessages({
      lane: "G",
      userText: text,
      twin: null,
      facts: [],
      memories: [],
      history: [],
    });
    const adapter = ai.createLlmAdapter(env.provider, adapterConfig(env));
    const llmOut = await ai.llmAdapterChat(adapter, {
      messages: [...messages],
      tools: [],
      stream: false,
      lane: "G",
    });
    modelExecuted = true;
    providerId = String(llmOut.provider_id || env.provider);
    providerEffective = String(llmOut.provider_effective || "none");
    degraded = Boolean(llmOut.degraded);
    if (llmOut.degraded || !llmOut.text) {
      answerText = llmOut.text || ai.G_BUSY_TEMPLATE;
      answerPath = "template";
      if (!llmOut.text && llmOut.reason === "missing_api_key") {
        blockCode = "BLOCKED_NO_PROVIDER";
        return {
          status: "BLOCKED",
          blockCode,
          modelExecuted: true,
          invocation_seam: "ai_platform_coach_path",
          canonical_trace: false,
          fixture_only: true,
          reason: "provider degraded: missing_api_key",
        };
      }
    } else {
      answerText = llmOut.text;
      answerPath = "llm_g";
    }
  }

  let guard = ai.guardAnswer({
    lane,
    toolsCalled,
    factsUsed,
    twin: null,
    userText: text,
    answerText,
    answerPath,
    usedTwinForMoney: false,
  });

  // Honest product mirror (CoachOrchestrator): reroute_p → P facts.
  // NO expectation lock — if scope_redirect becomes fact, preserve that FAIL.
  if (guard.status === "reroute_p") {
    lane = "P";
    toolsCalled = ["getBalance", "getBuckets", "getOpportunity"];
    factsUsed = syntheticFactsForTools(toolsCalled);
    usedSyntheticFacts = true;
    answerText = ai.renderFactAnswer(factsUsed, {});
    answerPath = "fact";
    providerId = "none";
    providerEffective = "none";
    guard = ai.guardAnswer({
      lane: "P",
      toolsCalled,
      factsUsed,
      twin: null,
      userText: text,
      answerText,
      answerPath: "fact",
      usedTwinForMoney: false,
    });
  }

  if (guard.status === "refresh") {
    answerText = ai.P_REFRESH_TEMPLATE.text;
    answerPath = "fact";
  }

  if (guard.status === "ungrounded") {
    answerText = ai.renderFactAnswer(factsUsed, {});
    answerPath = "fact";
    providerId = "none";
    providerEffective = "none";
    guard = ai.guardAnswer({
      lane: "P",
      toolsCalled,
      factsUsed,
      twin: null,
      userText: text,
      answerText,
      answerPath: "fact",
      usedTwinForMoney: false,
    });
  }

  if (guard.status === "block") {
    const metaHit = String(guard.reason || "").startsWith("meta_exposure");
    if (lane === "S") {
      answerText = ai.S_REFUSE_TEMPLATE.text;
      answerPath = "refuse_s";
    } else if (metaHit) {
      answerText = ai.SCOPE_REDIRECT_TEMPLATE.text;
      answerPath = "scope_redirect";
      toolsCalled = [];
      providerId = "none";
      providerEffective = "none";
    } else {
      answerText =
        "지금 그 답은 안전하게 안내할 수 없어요. 다른 질문을 해 주세요.";
      answerPath = "template";
    }
  }

  const aiLog = ai.buildAiLogRecord({
    intent: route.intent || ai.classifyLane(text),
    lane,
    twin_snapshot_id: null,
    memory_ids: [],
    facts_used: factsUsed,
    tools_called: toolsCalled,
    provider_id: providerEffective === "none" ? "none" : providerId,
    answer_path: answerPath,
    guard_result: { status: guard.status, reason: guard.reason },
    answer_preview: answerText,
  });

  return {
    status: "OK",
    blockCode: null,
    modelExecuted,
    degraded,
    invocation_seam: "ai_platform_coach_path",
    canonical_trace: false,
    fixture_only: true,
    used_synthetic_facts: usedSyntheticFacts,
    trace_id_provenance: "TOOLING",
    answerText,
    aiLog,
    provider_id: aiLog.provider_id,
    model_identity: `${providerId}:${env.geminiModel || env.provider}`,
    // library: no runtime trace_id
    trace_id: null,
  };
}

/**
 * CANONICAL Nest HTTP seam — observation only, no expectation fill.
 * @param {object} row — uses input only
 * @param {object} ctx
 */
async function executeViaHttp(row, ctx) {
  const env = ctx.env;
  if (!env.httpSeamAvailable) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_NO_HTTP_SEAM",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: "QA7_CHAT_URL + bearer unavailable",
    };
  }
  if (!env.aiLogReadAvailable) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_NO_AI_LOG_READ",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: "DATABASE_URL required to observe ai_logs without inventing fields",
    };
  }

  let res;
  try {
    res = await fetch(env.chatUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.chatBearer}`,
      },
      body: JSON.stringify({
        text: row.input,
        stream: false,
        llm: ctx.allowLlm !== false,
      }),
    });
  } catch (e) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_HTTP_ERROR",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: `HTTP fetch failed: ${e instanceof Error ? e.message : e}`,
    };
  }

  if (!res.ok) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_HTTP_ERROR",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: `HTTP ${res.status}`,
    };
  }

  /** @type {any} */
  let body;
  try {
    body = await res.json();
  } catch {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_HTTP_ERROR",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: "HTTP response not JSON",
    };
  }

  const runtimeTraceId =
    body.trace_id != null && String(body.trace_id).length
      ? String(body.trace_id)
      : null;

  if (!runtimeTraceId) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_MISSING_RUNTIME_FIELD",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      missing: ["trace_id"],
      observed_response_keys: Object.keys(body || {}),
      reason: "HTTP response missing runtime trace_id",
    };
  }

  let dbRow;
  try {
    dbRow = await fetchAiLogById(env.databaseUrl, runtimeTraceId);
  } catch (e) {
    return {
      status: "BLOCKED",
      blockCode: e && e.code ? e.code : "BLOCKED_AI_LOG_READ",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  if (!dbRow) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_MISSING_RUNTIME_FIELD",
      modelExecuted: Boolean(
        body.provider_effective && body.provider_effective !== "none",
      ),
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      missing: ["ai_logs_row"],
      runtime_trace_id: runtimeTraceId,
      reason: `ai_logs row not found for trace_id=${runtimeTraceId}`,
    };
  }

  const mapped = aiLogRowToTraceBody(dbRow);
  if (!mapped.ok) {
    return {
      status: "BLOCKED",
      blockCode: "BLOCKED_MISSING_RUNTIME_FIELD",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      missing: mapped.missing,
      runtime_trace_id: runtimeTraceId,
      observed_response_keys: Object.keys(body || {}),
      observed_db_keys: Object.keys(dbRow || {}),
      reason: `ai_logs missing required fields: ${mapped.missing.join(",")}`,
    };
  }

  // Validate through buildAiLogRecord (schema enums) using DB observation only
  let aiLog;
  try {
    aiLog = ai.buildAiLogRecord({
      intent: mapped.body.intent,
      lane: mapped.body.lane,
      twin_snapshot_id: mapped.body.twin_snapshot_id,
      memory_ids: mapped.body.memory_ids,
      facts_used: mapped.body.facts_used,
      tools_called: mapped.body.tools_called,
      provider_id: mapped.body.provider_id,
      answer_path: mapped.body.answer_path,
      guard_result: mapped.body.guard_result,
      answer_preview: mapped.body.answer_preview,
      createdAt: mapped.body.createdAt,
    });
  } catch (e) {
    return {
      status: "BLOCKED",
      blockCode: "TRACE_SCHEMA_REJECT",
      modelExecuted: false,
      invocation_seam: "http_post_me_peotteok_chat",
      canonical_trace: false,
      runtime_trace_id: runtimeTraceId,
      reason: e instanceof Error ? e.message : String(e),
    };
  }

  const answerText =
    body.answer_text != null
      ? String(body.answer_text)
      : mapped.body.answer_preview != null
        ? String(mapped.body.answer_preview)
        : "";

  const modelExecuted =
    String(aiLog.provider_id) !== "none" ||
    String(body.provider_effective || "") !== "none";

  return {
    status: "OK",
    blockCode: null,
    modelExecuted,
    invocation_seam: "http_post_me_peotteok_chat",
    canonical_trace: true,
    fixture_only: false,
    used_synthetic_facts: false,
    trace_id_provenance: "RUNTIME",
    answerText,
    aiLog,
    provider_id: aiLog.provider_id,
    model_identity: String(body.provider_id || aiLog.provider_id),
    trace_id: runtimeTraceId,
    http_observed: {
      lane: body.lane ?? null,
      answer_path: body.answer_path ?? null,
      tools_called: body.tools_called ?? null,
      guard_result: body.guard_result ?? null,
      provider_effective: body.provider_effective ?? null,
    },
  };
}

/**
 * @param {object} row
 * @param {object} ctx run context
 */
async function executeEvalCase(row, ctx) {
  // Canonical default = HTTP. Library only when explicitly requested.
  const forceLibrary = ctx.forceLibrary === true || ctx.seam === "library";
  const useHttp = !forceLibrary;

  const exec = useHttp
    ? await executeViaHttp(row, ctx)
    : await executeViaAiPlatform(row, ctx);

  if (exec.status !== "OK") {
    return exec;
  }

  try {
    const artifact = buildQa7TraceArtifact({
      run_id: ctx.run_id,
      baseline_id: ctx.baseline_id,
      case_id: row.id,
      dataset_file: row._dataset_file,
      eval_dataset_hash: ctx.eval_dataset_hash,
      prompt_hash: ctx.prompt_hash,
      provider_id: exec.provider_id,
      model_identity: exec.model_identity,
      ai_log: exec.aiLog,
      answer_text: exec.answerText,
      model_executed: exec.modelExecuted,
      invocation_seam: exec.invocation_seam,
      trace_id: exec.trace_id || undefined,
      canonical_trace: exec.canonical_trace === true,
      fixture_only: exec.fixture_only === true,
      trace_id_provenance: exec.trace_id_provenance || "TOOLING",
    });

    return {
      status: "OK",
      blockCode: null,
      modelExecuted: exec.modelExecuted,
      invocation_seam: exec.invocation_seam,
      canonical_trace: artifact.canonical_trace,
      fixture_only: artifact.fixture_only,
      trace_id_provenance: artifact.trace_id_provenance,
      artifact,
    };
  } catch (e) {
    return {
      status: "BLOCKED",
      blockCode: e && e.code ? e.code : "TRACE_BUILD_FAILED",
      modelExecuted: exec.modelExecuted,
      invocation_seam: exec.invocation_seam,
      canonical_trace: false,
      missing: e && e.missing ? e.missing : undefined,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

module.exports = {
  executeEvalCase,
  executeViaAiPlatform,
  executeViaHttp,
  syntheticFactsForTools,
};
