/**
 * 공개 /health 응답. 내부 호스트·버킷·bus·원문 오류는 내보내지 않는다.
 */

export type PublicHealthWarning = { code: string };

export type PublicHealthBody = {
  ok: true;
  service: "api-nest";
  phase: 0;
  gitSha: string | null;
  gitShaSource: string | null;
  db: { configured: boolean; ok: boolean };
  redis: { configured: boolean; ok: boolean };
  warnings: PublicHealthWarning[];
};

export function publicHealthBody(input: {
  gitSha: string | null;
  gitShaSource: string | null;
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
