"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { WithdrawLiveForm } from "../../../../components/WithdrawLiveForm";
import { useWithdrawKycGate } from "../../../../lib/use-withdraw-kyc-gate";
import { WalletChrome } from "../../WalletChrome";
import styles from "../../wallet.module.css";

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
    <WalletChrome tone="paper">
      <main
        className={styles.surface}
        data-withdraw-default-mode="profit"
        data-withdraw-mode={mode}
        data-testid="wallet-withdraw-usdt"
      >
        <header className={styles.pageHead}>
          <p className={styles.pageEyebrow}>{T.withdrawMode.pageTitle}</p>
          <h1 className={styles.pageTitle}>{T.withdrawMode.pageTitleUsdt}</h1>
          <p className={styles.lead}>{T.withdrawMode.pageLeadUsdt}</p>
        </header>
        <div className={styles.tabs} role="tablist" data-testid="withdraw-currency-tabs">
          <Link
            href={`/wallet/withdraw/usdt?mode=${mode}`}
            role="tab"
            data-tab="usdt"
            className={styles.tabActive}
          >
            {T.withdrawMode.tabUsdt}
          </Link>
          <Link
            href={`/wallet/withdraw/krw?mode=${mode}`}
            role="tab"
            data-tab="krw"
            className={styles.tab}
          >
            {T.withdrawMode.tabKrw}
          </Link>
        </div>
        <p data-testid="withdraw-network-hint">{T.wallet.withdrawNetworkHint}</p>
        {gate.toastMessage ? (
          <p data-toast-code={gate.toastCode ?? undefined} role="status">
            {gate.toastMessage}
          </p>
        ) : null}
        {gate.pendingReview ? <p>{T.kyc.pendingInline}</p> : null}
        <WithdrawLiveForm
          asset="USDT"
          mode={mode}
          requirePrincipalConfirm={requirePrincipalConfirm}
          allowForm={gate.allowWithdrawForm || !gate.toastMessage}
        />
        <p>
          <Link
            href="/wallet/withdraw?mode=profit"
            data-testid="usdt-withdraw-profit"
            data-default-mode="profit"
          >
            {T.withdrawMode.ctaProfitWithdraw}
          </Link>
        </p>
        <p>
          <Link
            href="/wallet/withdraw?mode=principal"
            data-testid="usdt-withdraw-principal"
            data-principal-reachable="true"
          >
            {T.withdrawMode.ctaOpenPrincipal}
          </Link>
        </p>
      </main>
    </WalletChrome>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <UsdtWithdrawContent />
    </SearchParamsBoundary>
  );
}
