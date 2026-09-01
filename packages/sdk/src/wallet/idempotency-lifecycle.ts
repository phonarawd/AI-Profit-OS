/**
 * 머니 제출 멱등 키 — 경제 intent fingerprint 당 1키.
 * 타임아웃/네트워크/응답 유실은 같은 키를 유지한다.
 */

export type IdempotencyDecision = "retain" | "retire";

export function mintMoneyIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function krwDepositFingerprint(
  requestedAmountKrw: number,
  depositorName: string,
): string {
  return `krw-deposit:${requestedAmountKrw}:${depositorName.trim()}`;
}

export function withdrawFingerprint(input: {
  mode: string;
  asset: string;
  amount: string;
  destination?: string;
  principalConfirm?: boolean;
  stepUpReady?: boolean;
}): string {
  return [
    "withdraw",
    input.mode,
    input.asset,
    input.amount.trim(),
    (input.destination ?? "").trim(),
    input.principalConfirm ? "1" : "0",
    input.stepUpReady ? "1" : "0",
  ].join(":");
}

export function classifyIdempotencyHttp(
  status: number | "network",
): IdempotencyDecision {
  if (status === "network") return "retain";
  if (!Number.isFinite(status) || status <= 0) return "retain";
  if (status >= 500 || status === 408 || status === 429) return "retain";
  return "retire";
}

export function statusFromWalletError(err: unknown): number | "network" {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/_(\d{3})\b/);
  if (match) return Number(match[1]);
  return "network";
}

export function createIdempotencyLifecycle(opts?: { mint?: () => string }) {
  let key: string | null = null;
  let fingerprint: string | null = null;
  let inFlight = false;

  function begin(
    nextFingerprint: string,
  ): { key: string } | { blocked: "in_flight" } {
    if (inFlight) return { blocked: "in_flight" };
    if (!key || fingerprint !== nextFingerprint) {
      key = opts?.mint ? opts.mint() : mintMoneyIdempotencyKey("idemp");
      fingerprint = nextFingerprint;
    }
    inFlight = true;
    return { key };
  }

  function retain(): void {
    inFlight = false;
  }

  function retire(): void {
    key = null;
    fingerprint = null;
    inFlight = false;
  }

  return {
    begin,
    retain,
    retire,
    peek: () => key,
    isInFlight: () => inFlight,
  };
}
