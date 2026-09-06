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
  migrationHead: string | null;
  db: { configured: boolean; ok: boolean };
  redis: { configured: boolean; ok: boolean };
  warnings: PublicHealthWarning[];
};

/** NODE_ENV 원문을 호스트/시크릿 없이 네 값만 공개한다. */
export function sanitizeEnvironment(raw: unknown): PublicHealthEnvironment {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "production" || value === "staging" || value === "test") {
    return value;
  }
  return "development";
}

/** supabase_migrations.version 만 허용. SQL/호스트는 버린다. */
export function sanitizeMigrationHead(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!/^[0-9]{8,14}(_[a-z0-9_]+)?$/.test(value)) return null;
  return value.slice(0, 80);
}

export function publicHealthBody(input: {
  gitSha: string | null;
  gitShaSource: string | null;
  environment?: unknown;
  migrationHead?: unknown;
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
    migrationHead: sanitizeMigrationHead(input.migrationHead),
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
