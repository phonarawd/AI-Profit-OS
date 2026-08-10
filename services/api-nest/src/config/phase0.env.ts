/**
 * Phase0 host env SSOT (Infra §51.13 / §15)
 * Secrets stay in process.env / .env — never hardcode.
 */

export type LlmProviderId =
  | "ollama"
  | "groq"
  | "gemini_free"
  | "openai"
  | "none";

export type Phase0Env = {
  nodeEnv: string;
  port: number;
  rootDomain: string;
  appHost: string;
  opsHost: string;
  apiHost: string;
  databaseUrl: string | null;
  redisUrl: string | null;
  supabaseUrl: string | null;
  supabaseRegion: string | null;
  supabaseProjectRef: string | null;
  jwtUserSecret: string | null;
  jwtAdminSecret: string | null;
  oauthKakaoClientId: string | null;
  oauthKakaoClientSecret: string | null;
  oauthGoogleClientId: string | null;
  oauthGoogleClientSecret: string | null;
  r2KycBucket: string;
  r2AssetImagesBucket: string;
  r2AssetImagesPublicBase: string | null;
  r2AccountId: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2KycEncryptionKey: string | null;
  /** Money §43.6 Day-1 SMTP SSOT = Resend */
  resendApiKey: string | null;
  resendFromEmail: string | null;
  /** Engine §47.13 LLM Adapter — Nest only · NEXT_PUBLIC 0 */
  llmProvider: LlmProviderId;
  llmApiKey: string | null;
  geminiApiKey: string | null;
  geminiModel: string;
  openaiModel: string;
  groqModel: string;
  ollamaModel: string;
  llmBaseUrl: string | null;
  llmQuotaSoftRpm: number;
  llmQuotaSoftRpd: number;
  /** Phase1 CF workers → Nest ingest (header x-adapter-token) */
  adapterIngestToken: string | null;
  /** Money practice expire tick · fail-closed machine-auth (header x-internal-wallet-token) */
  internalWalletTickToken: string | null;
  phase: 0;
  bus: "in-process";
};

function read(key: string): string | null {
  const v = process.env[key];
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function readInt(key: string, fallback: number): number {
  const raw = read(key);
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const LLM_PROVIDERS = [
  "ollama",
  "groq",
  "gemini_free",
  "openai",
  "none",
] as const;

function readLlmProvider(): LlmProviderId {
  const raw = read("LLM_PROVIDER") ?? "none";
  return (LLM_PROVIDERS as readonly string[]).includes(raw)
    ? (raw as LlmProviderId)
    : "none";
}

export function loadPhase0Env(): Phase0Env {
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
    adapterIngestToken: read("ADAPTER_INGEST_TOKEN"),
    internalWalletTickToken: read("INTERNAL_WALLET_TICK_TOKEN"),
    phase: 0,
    bus: "in-process",
  };
}

export function oauthConfigured(
  env: Phase0Env,
  provider: "kakao" | "google",
): boolean {
  if (provider === "kakao") {
    return Boolean(env.oauthKakaoClientId && env.oauthKakaoClientSecret);
  }
  return Boolean(env.oauthGoogleClientId && env.oauthGoogleClientSecret);
}

/** Seoul lock — warn only (CI may lack .env) */
export function assertSupabaseRegionOrWarn(env: Phase0Env): string | null {
  if (!env.supabaseRegion) return null;
  if (env.supabaseRegion !== "ap-northeast-2") {
    return `SUPABASE_REGION must be ap-northeast-2 (Seoul), got ${env.supabaseRegion}`;
  }
  return null;
}
