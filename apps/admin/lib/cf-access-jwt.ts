/**
 * Cloudflare Access JWT 검증 (J0.17 · J0.20).
 * preview/production 에서는 CF_ACCESS_ENFORCE≠1 이라 통과한다.
 * 토큰 값을 로그·오류 본문에 넣지 않는다.
 */

export type AccessDecision =
  | { action: "next" }
  | { action: "deny"; status: 403 | 503; body: string };

const BODY_UNAVAILABLE = "unavailable";
const BODY_DENIED = "denied";

function bytesFromBase64Url(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? "" : "=".repeat(4 - (value.length % 4));
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJsonPart(part: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(bytesFromBase64Url(part))) as Record<
    string,
    unknown
  >;
}

export function normalizeTeamOrigin(raw: string): string {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

function audienceMatches(aud: unknown, expected: string): boolean {
  if (!expected) return false;
  if (typeof aud === "string") return aud === expected;
  if (Array.isArray(aud)) return aud.some((item) => item === expected);
  return false;
}

type JwksKey = JsonWebKey & { kid?: string };

let jwksCache: { origin: string; expiresAt: number; keys: JwksKey[] } | null = null;

async function loadJwks(teamOrigin: string): Promise<JwksKey[]> {
  const now = Date.now();
  if (jwksCache && jwksCache.origin === teamOrigin && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }
  const res = await fetch(`${teamOrigin}/cdn-cgi/access/certs`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error("jwks_unavailable");
  const body = (await res.json()) as { keys?: JwksKey[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  if (!keys.length) throw new Error("jwks_empty");
  jwksCache = { origin: teamOrigin, expiresAt: now + 10 * 60 * 1000, keys };
  return keys;
}

async function verifyRs256(
  signingInput: string,
  signature: Uint8Array,
  jwk: JwksKey,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature.buffer as ArrayBuffer,
    new TextEncoder().encode(signingInput),
  );
}

export async function verifyAccessJwt(
  token: string,
  teamOrigin: string,
  audience: string,
): Promise<boolean> {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return false;
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = decodeJsonPart(parts[0]);
    payload = decodeJsonPart(parts[1]);
  } catch {
    return false;
  }
  if (header.alg !== "RS256") return false;
  if (payload.iss !== teamOrigin) return false;
  if (!audienceMatches(payload.aud, audience)) return false;
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || exp * 1000 <= Date.now()) return false;

  try {
    const keys = await loadJwks(teamOrigin);
    const kid = typeof header.kid === "string" ? header.kid : "";
    const candidates = kid ? keys.filter((key) => key.kid === kid) : keys;
    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = bytesFromBase64Url(parts[2]);
    for (const jwk of candidates) {
      if (await verifyRs256(signingInput, signature, jwk)) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function decideCfAccess(request: {
  headers: { get(name: string): string | null };
}): Promise<AccessDecision> {
  if (process.env.CF_ACCESS_ENFORCE !== "1") return { action: "next" };

  const teamOrigin = normalizeTeamOrigin(process.env.CF_ACCESS_TEAM_DOMAIN || "");
  const audience = String(process.env.CF_ACCESS_AUD || "").trim();
  if (!teamOrigin || !audience) {
    return { action: "deny", status: 503, body: BODY_UNAVAILABLE };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return { action: "deny", status: 403, body: BODY_DENIED };

  const ok = await verifyAccessJwt(token, teamOrigin, audience);
  if (!ok) return { action: "deny", status: 403, body: BODY_DENIED };
  return { action: "next" };
}
