"use strict";
/**
 * Phase0 host env SSOT (Infra §51.13 / §15)
 * Secrets stay in process.env / .env — never hardcode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPhase0Env = loadPhase0Env;
exports.oauthConfigured = oauthConfigured;
exports.assertSupabaseRegionOrWarn = assertSupabaseRegionOrWarn;
function read(key) {
    const v = process.env[key];
    if (v == null)
        return null;
    const t = v.trim();
    return t.length ? t : null;
}
function readInt(key, fallback) {
    const raw = read(key);
    if (raw == null)
        return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
}
const LLM_PROVIDERS = [
    "ollama",
    "groq",
    "gemini_free",
    "openai",
    "none",
];
function readLlmProvider() {
    const raw = read("LLM_PROVIDER") ?? "none";
    return LLM_PROVIDERS.includes(raw)
        ? raw
        : "none";
}
function loadPhase0Env() {
    return {
        nodeEnv: read("NODE_ENV") ?? "development",
        port: Number(process.env.PORT || 4000),
        rootDomain: read("ROOT_DOMAIN") ?? "localhost",
        appHost: read("APP_HOST") ?? "localhost:3000",
        opsHost: read("OPS_HOST") ?? "localhost:3001",
        apiHost: read("API_HOST") ?? "localhost:4000",
        databaseUrl: read("DATABASE_URL"),
        redisUrl: read("REDIS_URL"),
        supabaseUrl: read("SUPABASE_URL"),
        supabaseRegion: read("SUPABASE_REGION"),
        supabaseProjectRef: read("SUPABASE_PROJECT_REF"),
        jwtUserSecret: read("JWT_USER_SECRET"),
        jwtAdminSecret: read("JWT_ADMIN_SECRET"),
        oauthKakaoClientId: read("OAUTH_KAKAO_CLIENT_ID"),
        oauthKakaoClientSecret: read("OAUTH_KAKAO_CLIENT_SECRET"),
        oauthGoogleClientId: read("OAUTH_GOOGLE_CLIENT_ID"),
        oauthGoogleClientSecret: read("OAUTH_GOOGLE_CLIENT_SECRET"),
        r2KycBucket: read("R2_KYC_BUCKET") ?? "kyc-docs",
        r2AssetImagesBucket: read("R2_ASSET_IMAGES_BUCKET") ?? "asset-images",
        r2AssetImagesPublicBase: read("R2_ASSET_IMAGES_PUBLIC_BASE"),
        r2AccountId: read("R2_ACCOUNT_ID"),
        r2AccessKeyId: read("R2_ACCESS_KEY_ID"),
        r2SecretAccessKey: read("R2_SECRET_ACCESS_KEY"),
        r2KycEncryptionKey: read("R2_KYC_ENCRYPTION_KEY"),
        resendApiKey: read("RESEND_API_KEY"),
        resendFromEmail: read("RESEND_FROM_EMAIL"),
        llmProvider: readLlmProvider(),
        llmApiKey: read("LLM_API_KEY"),
        geminiApiKey: read("GEMINI_API_KEY"),
        geminiModel: read("GEMINI_MODEL") ?? "gemini-flash-lite-latest",
        openaiModel: read("OPENAI_MODEL") ?? "gpt-4o-mini",
        groqModel: read("GROQ_MODEL") ?? "llama-3.1-8b-instant",
        ollamaModel: read("OLLAMA_MODEL") ?? "llama3.2",
        llmBaseUrl: read("LLM_BASE_URL"),
        llmQuotaSoftRpm: readInt("LLM_QUOTA_SOFT_RPM", 10),
        llmQuotaSoftRpd: readInt("LLM_QUOTA_SOFT_RPD", 200),
        // PO-locked 2026-08-12 (HARDENING V1 §47.16.2) — do not change without new PO decision
        aiConvStateTtlSec: readInt("AI_CONV_STATE_TTL_SEC", 3600),
        aiConvStateAbsoluteLifetimeSec: readInt("AI_CONV_STATE_ABSOLUTE_LIFETIME_SEC", 43200),
        adapterIngestToken: read("ADAPTER_INGEST_TOKEN"),
        internalWalletTickToken: read("INTERNAL_WALLET_TICK_TOKEN"),
        phase: 0,
        bus: "in-process",
    };
}
function oauthConfigured(env, provider) {
    if (provider === "kakao") {
        return Boolean(env.oauthKakaoClientId && env.oauthKakaoClientSecret);
    }
    return Boolean(env.oauthGoogleClientId && env.oauthGoogleClientSecret);
}
/** Seoul lock — warn only (CI may lack .env) */
function assertSupabaseRegionOrWarn(env) {
    if (!env.supabaseRegion)
        return null;
    if (env.supabaseRegion !== "ap-northeast-2") {
        return `SUPABASE_REGION must be ap-northeast-2 (Seoul), got ${env.supabaseRegion}`;
    }
    return null;
}
