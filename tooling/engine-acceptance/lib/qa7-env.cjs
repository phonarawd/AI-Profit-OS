/**
 * QA7 — load local .env keys without printing secret values
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { ROOT } = require("./hash-scope.cjs");

/** Fixed synthetic persona UUID — never a production customer identity */
const QA7_DEFAULT_SYNTH_USER_ID =
  "11111111-1111-4111-8111-111111111111";

const DEFAULT_LOCAL_CHAT_URL =
  "http://127.0.0.1:4000/api/v1/me/peotteok/chat";

function parseEnvFile(abs) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!fs.existsSync(abs)) return out;
  const text = fs.readFileSync(abs, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/**
 * Mint short-lived peotteok-user JWT (tooling-only · value never logged)
 * @param {string} secret
 * @param {string} userId
 */
function mintSyntheticBearer(secret, userId) {
  const jwtCore = require(path.join(ROOT, "services/api-nest/jwt.core.cjs"));
  return jwtCore.sign({ sub: userId }, secret, {
    issuer: "ai-profit-os-nest",
    audience: "peotteok-user",
    expiresInSec: 60 * 60,
  });
}

function loadQa7Env() {
  const fileEnv = {
    ...parseEnvFile(path.join(ROOT, ".env")),
    ...parseEnvFile(path.join(ROOT, ".env.local")),
  };
  const get = (k) =>
    process.env[k] != null && String(process.env[k]).length
      ? String(process.env[k])
      : fileEnv[k] != null
        ? String(fileEnv[k])
        : "";

  const provider = (get("LLM_PROVIDER") || "none").trim() || "none";
  const geminiKey = get("GEMINI_API_KEY");
  const llmKey = get("LLM_API_KEY");
  const apiKey =
    provider === "gemini_free"
      ? geminiKey
      : provider === "openai" || provider === "groq"
        ? llmKey
        : provider === "ollama"
          ? "local"
          : "";

  const hasKey =
    provider === "none"
      ? false
      : provider === "ollama"
        ? Boolean(get("LLM_BASE_URL") || true)
        : Boolean(apiKey && apiKey.length > 0);

  const databaseUrl = get("DATABASE_URL");
  const jwtUserSecret = get("JWT_USER_SECRET");
  const synthUserId =
    get("QA7_SYNTH_USER_ID") || QA7_DEFAULT_SYNTH_USER_ID;

  let chatUrl = get("QA7_CHAT_URL");
  const localHttp =
    get("QA7_LOCAL_HTTP") === "1" ||
    get("QA7_LOCAL_HTTP") === "true" ||
    process.env.QA7_LOCAL_HTTP === "1";
  if (!chatUrl && localHttp) {
    chatUrl = DEFAULT_LOCAL_CHAT_URL;
  }

  let chatBearer = get("QA7_BEARER");
  let bearerSource = chatBearer ? "QA7_BEARER" : "none";
  if (!chatBearer && chatUrl && jwtUserSecret) {
    try {
      chatBearer = mintSyntheticBearer(jwtUserSecret, synthUserId);
      bearerSource = "minted_synthetic_jwt";
    } catch {
      chatBearer = "";
      bearerSource = "mint_failed";
    }
  }

  const httpSeamAvailable = Boolean(chatUrl && chatBearer);
  const aiLogReadAvailable = Boolean(databaseUrl);

  return {
    provider,
    hasProviderCredential: hasKey,
    geminiModel: get("GEMINI_MODEL") || "gemini-flash-lite-latest",
    openaiModel: get("OPENAI_MODEL") || "",
    groqModel: get("GROQ_MODEL") || "",
    ollamaModel: get("OLLAMA_MODEL") || "",
    llmBaseUrl: get("LLM_BASE_URL") || "",
    /** never expose raw key — only pass through to adapter when executing */
    _apiKey: apiKey,
    chatUrl,
    chatBearer,
    bearerSource,
    httpSeamAvailable,
    databaseUrl,
    aiLogReadAvailable,
    synthUserId,
    localHttp,
    defaultLocalChatUrl: DEFAULT_LOCAL_CHAT_URL,
  };
}

/**
 * @param {ReturnType<typeof loadQa7Env>} env
 */
function describeProviderPrereq(env) {
  if (env.httpSeamAvailable && env.aiLogReadAvailable) {
    return {
      ok: true,
      seam: "http_post_me_peotteok_chat",
      provider: env.provider,
      reason:
        "HTTP chat seam + DATABASE_URL ai_logs read available (secrets redacted)",
      bearer_source: env.bearerSource,
      ai_log_read: "database_url",
    };
  }
  if (env.httpSeamAvailable && !env.aiLogReadAvailable) {
    return {
      ok: false,
      seam: "http_post_me_peotteok_chat",
      provider: env.provider,
      reason:
        "HTTP seam present but DATABASE_URL missing — cannot observe ai_logs without invention",
      bearer_source: env.bearerSource,
      ai_log_read: "none",
    };
  }
  if (env.provider === "none") {
    return {
      ok: false,
      seam: "library_diagnostic_only",
      provider: "none",
      reason:
        "HTTP canonical seam unavailable; library seam is diagnostic-only (not canonical)",
      bearer_source: env.bearerSource,
      ai_log_read: env.aiLogReadAvailable ? "database_url" : "none",
    };
  }
  if (!env.hasProviderCredential) {
    return {
      ok: false,
      seam: "library_diagnostic_only",
      provider: env.provider,
      reason: `provider=${env.provider} credential missing; HTTP canonical preferred`,
      bearer_source: env.bearerSource,
      ai_log_read: env.aiLogReadAvailable ? "database_url" : "none",
    };
  }
  return {
    ok: false,
    seam: "library_diagnostic_only",
    provider: env.provider,
    reason:
      "library provider present but canonical QA7 requires HTTP+ai_logs observation",
    bearer_source: env.bearerSource,
    ai_log_read: env.aiLogReadAvailable ? "database_url" : "none",
  };
}

/**
 * READ-ONLY HTTP environment precheck (no secrets printed)
 * @param {ReturnType<typeof loadQa7Env>} [env]
 */
function describeHttpCanonicalPrecheck(env) {
  const e = env || loadQa7Env();
  return {
    nest_default_port: 4000,
    chat_route: "POST /api/v1/me/peotteok/chat",
    auth_mechanism: "Bearer JWT audience=peotteok-user issuer=ai-profit-os-nest",
    synthetic_persona: "QA7_SYNTH_USER_ID or fixed probe UUID (non-production)",
    QA7_CHAT_URL: e.chatUrl ? "SET" : "UNSET",
    QA7_BEARER: e.chatBearer ? "SET" : "UNSET",
    bearer_source: e.bearerSource,
    DATABASE_URL: e.databaseUrl ? "SET" : "UNSET",
    provider: e.provider,
    provider_credential: e.hasProviderCredential ? "SET" : "UNSET",
    http_seam_available: e.httpSeamAvailable,
    ai_log_read_available: e.aiLogReadAvailable,
    canonical_ready: Boolean(e.httpSeamAvailable && e.aiLogReadAvailable),
  };
}

module.exports = {
  loadQa7Env,
  describeProviderPrereq,
  describeHttpCanonicalPrecheck,
  mintSyntheticBearer,
  QA7_DEFAULT_SYNTH_USER_ID,
  DEFAULT_LOCAL_CHAT_URL,
};
