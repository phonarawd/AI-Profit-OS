/**
 * Phase0 host env SSOT (Infra §51.13 / §15)
 * Secrets stay in process.env / .env — never hardcode.
 */

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
  phase: 0;
  bus: "in-process";
};

function read(key: string): string | null {
  const v = process.env[key];
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
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
