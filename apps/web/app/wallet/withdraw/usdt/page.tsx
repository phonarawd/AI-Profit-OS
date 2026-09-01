"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { WithdrawLiveForm } from "../../../../components/WithdrawLiveForm";
import { WithdrawUnauthorizedNote } from "../../../../components/WithdrawUnauthorized";
import { useWithdrawKycGate } from "../../../../lib/use-withdraw-kyc-gate";
import styles from "../../wallet.module.css";

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
    returnPath: "/wallet/withdraw/usdt",
  });

  const requirePrincipalConfirm = mode === "principal" || mode === "combined";

  return (
    <main
      className={`${styles.page} ${styles.onNavy}`}
      data-withdraw-default-mode="profit"
      data-withdraw-mode={mode}
      data-testid="wallet-withdraw-usdt"
    >
      <p className={styles.nav}>
        <a href="/wallet">지갑</a>
      </p>
      <h1 className={styles.title}>{T.withdrawMode.pageTitleUsdt}</h1>
      <p className={styles.note} data-testid="withdraw-network-hint">
        {T.wallet.withdrawNetworkHint}
      </p>
      {gate.authority === "loading" ? (
        <p className="mt-3 text-sm" role="status">본인 확인 상태를 확인하는 중…</p>
      ) : null}
      {gate.authority === "unauthorized" ? <WithdrawUnauthorizedNote /> : null}
      {gate.authority === "unavailable" ? (
        <p className="mt-3 text-sm" role="status">본인 확인 상태를 확인할 수 없음</p>
      ) : null}
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
        allowForm={gate.allowWithdrawForm}
      />
      <p className={styles.nav}>
        <a
          href="/wallet/withdraw?mode=profit"
          data-testid="usdt-withdraw-profit"
          data-default-mode="profit"
        >
          {T.withdrawMode.ctaProfitWithdraw}
        </a>
      </p>
      <p className={styles.nav}>
        <a
          href="/wallet/withdraw?mode=principal"
          data-testid="usdt-withdraw-principal"
          data-principal-reachable="true"
        >
          {T.withdrawMode.ctaOpenPrincipal}
        </a>
      </p>
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
