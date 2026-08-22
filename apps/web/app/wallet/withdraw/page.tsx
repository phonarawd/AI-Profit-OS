"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PrincipalConfirmSheet } from "@aipo/ui/components/wallet/PrincipalConfirmSheet";
import {
  WithdrawModeCards,
  type WithdrawModeValue,
} from "@aipo/ui/components/wallet/WithdrawModeCards";
import { T } from "@aipo/ui/copy/ko";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { WithdrawLiveForm } from "../../../components/WithdrawLiveForm";
import { useWithdrawKycGate } from "../../../lib/use-withdraw-kyc-gate";
import { WalletChrome } from "../WalletChrome";
import styles from "../wallet.module.css";

function resolveMode(raw: string | null): WithdrawModeValue {
  if (raw === "principal" || raw === "combined") return raw;
  return "profit";
}

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
  const [principalConfirmToken, setPrincipalConfirmToken] = useState<string | null>(
    null,
  );

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
    <WalletChrome tone="paper">
      <main
        className={styles.surface}
        data-withdraw-default-mode="profit"
        data-withdraw-mode={mode}
        data-testid="wallet-withdraw"
      >
        <header className={styles.pageHead}>
          <p className={styles.pageEyebrow}>{T.withdrawMode.pageTitle}</p>
          <h1 className={styles.pageTitle}>{T.withdrawMode.pageTitle}</h1>
          <p className={styles.lead}>{T.withdrawMode.pageLeadPrincipal}</p>
        </header>
        <div className={styles.tabs} role="tablist" data-testid="withdraw-currency-tabs">
          <Link
            href={`/wallet/withdraw/usdt?mode=${mode}`}
            role="tab"
            data-tab="usdt"
            className={styles.tab}
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
        {gate.toastMessage ? (
          <p data-toast-code={gate.toastCode ?? undefined} role="status">
            {gate.toastMessage}
          </p>
        ) : null}
        {gate.pendingReview ? <p>{T.kyc.pendingInline}</p> : null}

        <WithdrawModeCards mode={mode} onModeChange={setMode} />

        {requirePrincipalConfirm && !principalConfirmToken ? (
          <button
            type="button"
            data-testid="withdraw-open-principal-sheet"
            className={styles.ctaSoft}
            onClick={() => setSheetOpen(true)}
          >
            {T.withdrawMode.ctaOpenPrincipal}
          </button>
        ) : null}

        <WithdrawLiveForm
          asset="USDT"
          mode={mode}
          principalConfirmToken={principalConfirmToken}
          requirePrincipalConfirm={requirePrincipalConfirm}
          allowForm={gate.allowWithdrawForm || !gate.toastMessage}
        />

        {principalConfirmToken ? (
          <p
            hidden
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
    </WalletChrome>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <WithdrawContent />
    </SearchParamsBoundary>
  );
}
