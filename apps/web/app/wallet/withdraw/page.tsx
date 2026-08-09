"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PrincipalConfirmSheet } from "@aipo/ui/components/wallet/PrincipalConfirmSheet";
import {
  WithdrawModeCards,
  type WithdrawModeValue,
} from "@aipo/ui/components/wallet/WithdrawModeCards";
import { T } from "@aipo/ui/copy/ko";
import { useWithdrawKycGate } from "../../../lib/use-withdraw-kyc-gate";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

function resolveMode(raw: string | null): WithdrawModeValue {
  if (raw === "principal" || raw === "combined") return raw;
  return "profit";
}

/**
 * Money §49.4 — default mode=profit · PrincipalConfirmSheet for principal|combined.
 * §42 KYC gate on entry.
 */
function WithdrawContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = useMemo(
    () => resolveMode(searchParams.get("mode")),
    [searchParams],
  );

  const gate = useWithdrawKycGate({
    userId: null,
    returnPath: "/wallet/withdraw",
  });

  const [sheetOpen, setSheetOpen] = useState(mode !== "profit");
  const [principalConfirmToken, setPrincipalConfirmToken] = useState<
    string | null
  >(null);

  const setMode = useCallback(
    (next: WithdrawModeValue) => {
      const q = new URLSearchParams(searchParams.toString());
      q.set("mode", next);
      router.replace(`/wallet/withdraw?${q.toString()}`);
      setSheetOpen(next !== "profit");
      if (next === "profit") setPrincipalConfirmToken(null);
    },
    [router, searchParams],
  );

  const requirePrincipalConfirm = mode === "principal" || mode === "combined";

  return (
    <main
      className="p-6 text-lux-text"
      data-withdraw-default-mode="profit"
      data-withdraw-mode={mode}
    >
      <h1 className="text-xl font-semibold">{T.withdrawMode.pageTitle}</h1>
      {gate.toastMessage ? (
        <p
          className="mt-3 text-sm"
          data-toast-code={gate.toastCode ?? undefined}
          role="status"
        >
          {gate.toastMessage}
        </p>
      ) : null}
      {gate.pendingReview ? (
        <p className="mt-2 text-sm text-lux-text-muted">
          {T.kyc.pendingInline}
        </p>
      ) : null}

      <WithdrawModeCards mode={mode} onModeChange={setMode} />

      <p className="mt-4 text-sm text-lux-text-muted">
        {T.withdrawMode.amountLabel}
      </p>
      <p className="mt-1 text-xs text-lux-text-muted">
        {T.withdrawMode.feeHint}
      </p>

      {gate.allowWithdrawForm || !gate.toastMessage ? (
        <button
          type="button"
          data-testid="withdraw-primary-cta"
          data-mode={mode}
          className="mt-6 w-full rounded-lux-md bg-lux-accent px-4 py-3 text-sm font-semibold text-lux-bg"
          onClick={() => {
            if (requirePrincipalConfirm && !principalConfirmToken) {
              setSheetOpen(true);
              return;
            }
            // Intent submit = withdraw-auth wiring · mode+token locked here
          }}
        >
          {mode === "profit"
            ? T.withdrawMode.ctaProfitWithdraw
            : T.withdrawMode.ctaStillPrincipal}
        </button>
      ) : null}

      {principalConfirmToken ? (
        <p
          className="mt-2 hidden"
          data-testid="principal-confirm-token-ready"
          data-token-len={principalConfirmToken.length}
        />
      ) : null}

      <PrincipalConfirmSheet
        open={sheetOpen && requirePrincipalConfirm}
        onChooseProfitOnly={() => setMode("profit")}
        onConfirmPrincipal={(token) => {
          setPrincipalConfirmToken(token);
          setSheetOpen(false);
        }}
      />
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <WithdrawContent />
    </SearchParamsBoundary>
  );
}
