/**
 * 공개 /health 응답. 내부 호스트·버킷·bus·원문 오류는 내보내지 않는다.
 */

export type PublicHealthWarning = { code: string };

export type PublicHealthEnvironment =
  | "production"
  | "staging"
  | "development"
  | "test";

export type PublicHealthBody = {
  ok: true;
  service: "api-nest";
  phase: 0;
  gitSha: string | null;
  gitShaSource: string | null;
  environment: PublicHealthEnvironment;
  version: string;
  buildTime: string | null;
  db: { configured: boolean; ok: boolean };
  redis: { configured: boolean; ok: boolean };
  warnings: PublicHealthWarning[];
};

const VERSION_RE = /^[A-Za-z0-9._-]{1,32}$/;
const BUILD_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export function sanitizeEnvironment(raw: unknown): PublicHealthEnvironment {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "production" || value === "staging" || value === "test") {
    return value;
  }
  return "development";
}

export function sanitizeVersion(raw: unknown): string {
  const value = String(raw ?? "").trim();
  return VERSION_RE.test(value) ? value : "0.0.0";
}

export function sanitizeBuildTime(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  return BUILD_TIME_RE.test(value) ? value : null;
}

export function publicHealthBody(input: {
  gitSha: string | null;
  gitShaSource: string | null;
  environment?: unknown;
  version?: unknown;
  buildTime?: unknown;
  dbConfigured: boolean;
  dbOk: boolean;
  redisConfigured: boolean;
  redisOk: boolean;
  regionUnsupported?: boolean;
}): PublicHealthBody {
  return {
    ok: true,
    service: "api-nest",
    phase: 0,
    gitSha: input.gitSha,
    gitShaSource: input.gitShaSource,
    environment: sanitizeEnvironment(input.environment),
    version: sanitizeVersion(input.version),
    buildTime: sanitizeBuildTime(input.buildTime),
    db: {
      configured: input.dbConfigured,
      ok: input.dbOk,
    },
    redis: {
      configured: input.redisConfigured,
      ok: input.redisOk,
    },
    warnings: input.regionUnsupported
      ? [{ code: "SUPABASE_REGION_UNSUPPORTED" }]
      : [],
  };
}

const FORBIDDEN_KEYS = [
  "bus",
  "hosts",
  "appHost",
  "opsHost",
  "apiHost",
  "rootDomain",
  "r2KycBucket",
  "provider",
  "region",
  "detail",
];

const FORBIDDEN_VALUES = ["ECONNREFUSED", "supabase.co"];

function collectKeys(value: unknown, acc: string[]): string[] {
  if (!value || typeof value !== "object") return acc;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
    return acc;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    acc.push(key);
    collectKeys(child, acc);
  }
  return acc;
}

export function assertPublicHealthSanitized(body: unknown): string[] {
  const leaks: string[] = [];
  for (const key of collectKeys(body, [])) {
    if (FORBIDDEN_KEYS.includes(key) && !leaks.includes(key)) leaks.push(key);
  }
  const raw = JSON.stringify(body);
  for (const needle of FORBIDDEN_VALUES) {
    if (raw.includes(needle)) leaks.push(needle);
  }
  return leaks;
}
