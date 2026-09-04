/**
 * 본인 초대 코드 SSOT — users.referral_code.
 * Production 백필/ensure write 금지.
 */

import { randomBytes } from "node:crypto";

export const PRODUCTION_SUPABASE_REF = "mgsytcetsiecllmhcyox";
export const REFERRAL_CODE_LEN = 8;
/** 32자 · 256의 약수라 바이트→인덱스 사상이 균일하다. 길이를 바꾸면 mint가 거절한다. */
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ALPHABET_MASK = 31;

export type ReferralCodePolicy = "ready" | "missing" | "banned" | "deleted";

export function mintReferralCode(bytes: Uint8Array = randomBytes(REFERRAL_CODE_LEN)): string {
  if (REFERRAL_CODE_ALPHABET.length !== 32) {
    throw new Error("referral alphabet must stay 32 chars so 256 maps uniformly");
  }
  if (bytes.length < REFERRAL_CODE_LEN) {
    throw new Error("referral mint requires 8 CSPRNG bytes");
  }
  let out = "";
  for (let i = 0; i < REFERRAL_CODE_LEN; i++) {
    out += REFERRAL_CODE_ALPHABET[bytes[i]! & ALPHABET_MASK];
  }
  return out;
}

export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isProductionDbTarget(blob: string): boolean {
  return blob.toLowerCase().includes(PRODUCTION_SUPABASE_REF);
}

export function allowsReferralCodeEnsure(env: {
  ensureFlag?: string | null;
  databaseUrl?: string | null;
  supabaseUrl?: string | null;
  supabaseProjectRef?: string | null;
}): boolean {
  if (env.ensureFlag !== "1") return false;
  const blob = [env.databaseUrl, env.supabaseUrl, env.supabaseProjectRef]
    .filter(Boolean)
    .join("\n");
  return !isProductionDbTarget(blob);
}

export function classifyOwnReferralCode(input: {
  status: string | null | undefined;
  referralCode: unknown;
}): { policy: ReferralCodePolicy; referralCode: string | null } {
  const status = String(input.status ?? "");
  if (status === "deleted") return { policy: "deleted", referralCode: null };
  if (status === "banned") return { policy: "banned", referralCode: null };
  const code = normalizeReferralCode(input.referralCode);
  if (!code) return { policy: "missing", referralCode: null };
  return { policy: "ready", referralCode: code };
}

export function uniqueViolationTarget(err: unknown): "referral_code" | "other" | null {
  if (!err || typeof err !== "object") return null;
  const rec = err as { code?: unknown; constraint?: unknown; detail?: unknown };
  if (String(rec.code ?? "") !== "23505") return null;
  const blob = `${String(rec.constraint ?? "")} ${String(rec.detail ?? "")}`;
  return /referral_code/i.test(blob) ? "referral_code" : "other";
}
