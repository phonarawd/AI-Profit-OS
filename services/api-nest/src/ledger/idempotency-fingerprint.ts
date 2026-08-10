/**
 * Idempotency conflict detection — payload canonicalization (구현 선택).
 * Invariant: same key + semantic-different payload → conflict.
 * 해시 알고리즘은 계약이 아니다.
 */
import { ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";

export const IDEMPOTENCY_FINGERPRINT_VERSION = "v1";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
    .join(",")}}`;
}

export function fingerprintPayload(semantic: unknown): string {
  const canonical = `${IDEMPOTENCY_FINGERPRINT_VERSION}:${stableStringify(semantic)}`;
  return createHash("sha256").update(canonical).digest("hex");
}

export function ledgerJournalSemantic(input: {
  journalType: string;
  lines: Array<{
    accountCode?: string;
    accountId?: string;
    direction: string;
    amountUsdt: string;
  }>;
  referenceType?: string | null;
  referenceId?: string | null;
}): unknown {
  const lines = [...input.lines]
    .map((l) => ({
      account: l.accountCode ?? l.accountId ?? "",
      direction: l.direction,
      amountUsdt: l.amountUsdt,
    }))
    .sort((a, b) => {
      const ak = `${a.account}|${a.direction}|${a.amountUsdt}`;
      const bk = `${b.account}|${b.direction}|${b.amountUsdt}`;
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
  return {
    journalType: input.journalType,
    lines,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
  };
}

export function participateSemantic(input: {
  userId: string;
  opportunityId: string;
  pricingVersion: number;
  minProfitUsdt: string;
  amountUsdt: string;
}): unknown {
  return {
    userId: input.userId,
    opportunityId: input.opportunityId,
    pricingVersion: input.pricingVersion,
    minProfitUsdt: input.minProfitUsdt,
    amountUsdt: input.amountUsdt,
  };
}

/** stored empty/null → caller must supply reconstructed fingerprint as stored */
export function assertFingerprintMatch(opts: {
  stored: string | null | undefined;
  incoming: string;
  code?: string;
}): void {
  const stored = (opts.stored ?? "").trim();
  if (!stored) return;
  if (stored !== opts.incoming) {
    throw new ConflictException({
      code: opts.code ?? "IDEMPOTENCY_KEY_CONFLICT",
      toastCode: opts.code ?? "IDEMPOTENCY_KEY_CONFLICT",
      statusCode: 409,
      message: "idempotency key reused with different payload",
    });
  }
}
