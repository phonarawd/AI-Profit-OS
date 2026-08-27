/**
 * Money §42 — session-owned withdraw KYC gate.
 * Fail closed until authoritative /api/v1/compliance/kyc/status is loaded.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";

export type ClientKycStatus = "none" | "pending" | "approved" | "rejected";
export type KycAuthorityView =
  | "loading"
  | "ready"
  | "unauthorized"
  | "unavailable";

export type WithdrawKycGateState = {
  authority: KycAuthorityView;
  kycStatus: ClientKycStatus | null;
  allowWithdrawForm: boolean;
  pendingReview: boolean;
  toastMessage: string | null;
  toastCode: "KYC_WITHDRAW_REQUIRED" | "KYC_PENDING" | null;
};

const REDIRECT_MS = 800;
const KYC_STATUS_PATH = "/api/v1/compliance/kyc/status";
const KYC_STATUSES = new Set<ClientKycStatus>([
  "none",
  "pending",
  "approved",
  "rejected",
]);
const KYC_STATUS_KEYS = new Set([
  "userId",
  "kycStatus",
  "submissionId",
  "decidedAt",
  "rejectReason",
]);

class KycStatusLoadError extends Error {
  constructor(readonly kind: "unauthorized" | "unavailable") {
    super(kind);
    this.name = "KycStatusLoadError";
  }
}

export function shouldRedirectToKyc(status: ClientKycStatus): boolean {
  return status === "none" || status === "rejected";
}

function parseKycStatus(raw: unknown): ClientKycStatus {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new KycStatusLoadError("unavailable");
  }
  const value = raw as Record<string, unknown>;
  if (Object.keys(value).some((key) => !KYC_STATUS_KEYS.has(key))) {
    throw new KycStatusLoadError("unavailable");
  }
  if (typeof value.userId !== "string" || !value.userId.trim()) {
    throw new KycStatusLoadError("unavailable");
  }
  if (
    typeof value.kycStatus !== "string" ||
    !KYC_STATUSES.has(value.kycStatus as ClientKycStatus)
  ) {
    throw new KycStatusLoadError("unavailable");
  }
  for (const key of ["submissionId", "decidedAt", "rejectReason"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      throw new KycStatusLoadError("unavailable");
    }
  }
  return value.kycStatus as ClientKycStatus;
}

export type KycStatusFetcher = (signal?: AbortSignal) => Promise<unknown>;

async function fetchSessionKycStatus(signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(KYC_STATUS_PATH, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (err) {
    if (
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }
    throw new KycStatusLoadError("unavailable");
  }
  if (res.status === 401 || res.status === 403) {
    throw new KycStatusLoadError("unauthorized");
  }
  if (!res.ok) throw new KycStatusLoadError("unavailable");
  try {
    return await res.json();
  } catch {
    throw new KycStatusLoadError("unavailable");
  }
}

export function useWithdrawKycGate(opts: {
  fetchStatus?: KycStatusFetcher;
  returnPath?: string;
}): WithdrawKycGateState & { dismissToast: () => void } {
  const router = useRouter();
  const returnPath = opts.returnPath ?? "/wallet/withdraw";
  const [authority, setAuthority] = useState<KycAuthorityView>("loading");
  const [kycStatus, setKycStatus] = useState<ClientKycStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastCode, setToastCode] =
    useState<WithdrawKycGateState["toastCode"]>(null);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
    setToastCode(null);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    let redirectTimer: ReturnType<typeof window.setTimeout> | null = null;
    setAuthority("loading");
    setKycStatus(null);
    setToastMessage(null);
    setToastCode(null);

    void (async () => {
      try {
        const raw = await (opts.fetchStatus ?? fetchSessionKycStatus)(ac.signal);
        if (ac.signal.aborted) return;
        const status = parseKycStatus(raw);
        setKycStatus(status);
        setAuthority("ready");

        if (shouldRedirectToKyc(status)) {
          setToastCode("KYC_WITHDRAW_REQUIRED");
          setToastMessage(T.kyc.withdrawRequired);
          redirectTimer = window.setTimeout(() => {
            router.push(`/me/kyc?return=${encodeURIComponent(returnPath)}`);
          }, REDIRECT_MS);
          return;
        }
        if (status === "pending") {
          setToastCode("KYC_PENDING");
          setToastMessage(T.kyc.pending);
        }
      } catch (err) {
        if (ac.signal.aborted) return;
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        setKycStatus(null);
        setToastMessage(null);
        setToastCode(null);
        setAuthority(
          err instanceof KycStatusLoadError ? err.kind : "unavailable",
        );
      }
    })();

    return () => {
      ac.abort();
      if (redirectTimer !== null) window.clearTimeout(redirectTimer);
    };
  }, [opts.fetchStatus, returnPath, router]);

  return {
    authority,
    kycStatus,
    allowWithdrawForm: authority === "ready" && kycStatus === "approved",
    pendingReview: authority === "ready" && kycStatus === "pending",
    toastMessage,
    toastCode,
    dismissToast,
  };
}
