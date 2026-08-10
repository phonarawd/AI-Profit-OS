"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { WithdrawLiveForm } from "../../../../components/WithdrawLiveForm";
import { useWithdrawKycGate } from "../../../../lib/use-withdraw-kyc-gate";

/**
 * PART9f2 — USDT withdraw · WithdrawAmountPanel + step-up + POST withdraw
 */
function UsdtWithdrawContent() {
  const searchParams = useSearchParams();
  const mode = useMemo(() => {
    const raw = searchParams.get("mode");
    if (raw === "principal" || raw === "combined") return raw;
    return "profit";
  }, [searchParams]);

  const gate = useWithdrawKycGate({
    userId: null,
    returnPath: "/wallet/withdraw/usdt",
  });

  const requirePrincipalConfirm = mode === "principal" || mode === "combined";

  return (
    <main
      className="p-6 text-lux-text"
      data-withdraw-default-mode="profit"
      data-withdraw-mode={mode}
      data-testid="wallet-withdraw-usdt"
    >
      <h1 className="text-xl font-semibold">{T.withdrawMode.pageTitleUsdt}</h1>
      <p
        className="mt-2 text-sm text-lux-text-muted"
        data-testid="withdraw-network-hint"
      >
        {T.wallet.withdrawNetworkHint}
      </p>
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
      <WithdrawLiveForm
        asset="USDT"
        mode={mode}
        requirePrincipalConfirm={requirePrincipalConfirm}
        allowForm={gate.allowWithdrawForm || !gate.toastMessage}
      />
      <a
        href="/wallet/withdraw?mode=profit"
        data-testid="usdt-withdraw-profit"
        data-default-mode="profit"
        className="mt-4 block text-sm text-lux-accent"
      >
        {T.withdrawMode.ctaProfitWithdraw}
      </a>
      <a
        href="/wallet/withdraw?mode=principal"
        data-testid="usdt-withdraw-principal"
        data-principal-reachable="true"
        className="mt-2 block text-sm text-lux-text"
      >
        {T.withdrawMode.ctaOpenPrincipal}
      </a>
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <UsdtWithdrawContent />
    </SearchParamsBoundary>
  );
}
