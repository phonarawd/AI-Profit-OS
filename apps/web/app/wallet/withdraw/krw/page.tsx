"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import { useWithdrawKycGate } from "../../../../lib/use-withdraw-kyc-gate";

/**
 * KRW withdraw entry — default mode=profit (§49.1 E2).
 * Principal path stays linked (E3).
 */
export default function Page() {
  const searchParams = useSearchParams();
  const mode = useMemo(() => {
    const raw = searchParams.get("mode");
    if (raw === "principal" || raw === "combined") return raw;
    return "profit";
  }, [searchParams]);

  const gate = useWithdrawKycGate({
    userId: null,
    returnPath: "/wallet/withdraw/krw",
  });

  return (
    <main
      className="p-6 text-lux-text"
      data-withdraw-default-mode="profit"
      data-withdraw-mode={mode}
    >
      <h1 className="text-xl font-semibold">원화 {T.withdrawMode.pageTitle}</h1>
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
      {gate.allowWithdrawForm ? (
        <p className="mt-2 text-sm text-lux-text-muted">
          {T.kyc.approved}
        </p>
      ) : null}
      <a
        href="/wallet/withdraw?mode=profit"
        data-testid="krw-withdraw-profit"
        data-default-mode="profit"
        className="mt-4 block text-sm text-lux-accent"
      >
        {T.withdrawMode.ctaProfitWithdraw}
      </a>
      <a
        href="/wallet/withdraw?mode=principal"
        data-testid="krw-withdraw-principal"
        data-principal-reachable="true"
        className="mt-2 block text-sm text-lux-text"
      >
        {T.withdrawMode.ctaOpenPrincipal}
      </a>
    </main>
  );
}
