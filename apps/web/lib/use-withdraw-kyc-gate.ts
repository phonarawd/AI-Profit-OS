/**
 * Money §42 — withdraw tap KYC intercept.
 * none|rejected → toast KYC_WITHDRAW_REQUIRED → /me/kyc within 1s (800ms)
 * pending → toast pending · hide form
 * approved → allow withdraw form (no second KYC prompt)
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";

export type ClientKycStatus = "none" | "pending" | "approved" | "rejected";

export type WithdrawKycGateState = {
  kycStatus: ClientKycStatus;
  allowWithdrawForm: boolean;
  pendingReview: boolean;
  toastMessage: string | null;
  toastCode:
    | "KYC_WITHDRAW_REQUIRED"
    | "KYC_PENDING"
    | null;
};

const REDIRECT_MS = 800; // within 1s · plan §42.2

export function shouldRedirectToKyc(status: ClientKycStatus): boolean {
  return status === "none" || status === "rejected";
}

/** Fetch adapter — replace with SDK when wallet client lands */
export type KycStatusFetcher = (userId: string) => Promise<{
  kycStatus: ClientKycStatus;
}>;

export function useWithdrawKycGate(opts: {
  userId: string | null | undefined;
  fetchStatus?: KycStatusFetcher;
  returnPath?: string;
}): WithdrawKycGateState & { dismissToast: () => void } {
  const router = useRouter();
  const returnPath = opts.returnPath ?? "/wallet/withdraw";
  const [kycStatus, setKycStatus] = useState<ClientKycStatus>("none");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastCode, setToastCode] =
    useState<WithdrawKycGateState["toastCode"]>(null);

  const dismissToast = useCallback(() => {
    setToastMessage(null);
    setToastCode(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!opts.userId) return;
      const fetcher =
        opts.fetchStatus ??
        (async () => ({ kycStatus: "none" as ClientKycStatus }));
      const res = await fetcher(opts.userId);
      if (cancelled) return;
      const status = res.kycStatus;
      setKycStatus(status);

      if (shouldRedirectToKyc(status)) {
        setToastCode("KYC_WITHDRAW_REQUIRED");
        setToastMessage(T.kyc.withdrawRequired);
        // toast → /me/kyc within 1s
        window.setTimeout(() => {
          router.push(`/me/kyc?return=${encodeURIComponent(returnPath)}`);
        }, REDIRECT_MS);
        return;
      }
      if (status === "pending") {
        setToastCode("KYC_PENDING");
        setToastMessage(T.kyc.pending);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [opts.userId, opts.fetchStatus, returnPath, router]);

  return {
    kycStatus,
    allowWithdrawForm: kycStatus === "approved",
    pendingReview: kycStatus === "pending",
    toastMessage,
    toastCode,
    dismissToast,
  };
}
