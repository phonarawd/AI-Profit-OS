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
import styles from "../wallet.module.css";

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
      className={`${styles.page} ${styles.onNavy}`}
      data-withdraw-default-mode="profit"
      data-withdraw-mode={mode}
      data-testid="wallet-withdraw"
    >
      <p className={styles.nav}>
        <Link href="/wallet">지갑</Link>
      </p>
      <h1 className={styles.title}>{T.withdrawMode.pageTitle}</h1>
      <div
        className="mt-4 flex gap-2"
        role="tablist"
        data-testid="withdraw-currency-tabs"
      >
        <Link
          href={`/wallet/withdraw/usdt?mode=${mode}`}
          role="tab"
          data-tab="usdt"
          className="rounded-pd-md border border-pd-border px-3 py-2 text-sm"
        >
          {T.withdrawMode.tabUsdt}
        </Link>
        <Link
          href={`/wallet/withdraw/krw?mode=${mode}`}
          role="tab"
          data-tab="krw"
          className="rounded-pd-md border border-pd-border px-3 py-2 text-sm"
        >
          {T.withdrawMode.tabKrw}
        </Link>
      </div>
      {gate.authority === "loading" ? (
        <p className="mt-3 text-sm" role="status">본인 확인 상태를 확인하는 중…</p>
      ) : null}
      {gate.authority === "unauthorized" ? (
        <p className="mt-3 text-sm" role="status">로그인하면 출금을 신청할 수 있어요.</p>
      ) : null}
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
        <p className="mt-2 text-sm text-pd-text-muted">
          {T.kyc.pendingInline}
        </p>
      ) : null}

      <WithdrawModeCards mode={mode} onModeChange={setMode} />

      {requirePrincipalConfirm && !principalConfirmToken ? (
        <button
          type="button"
          data-testid="withdraw-open-principal-sheet"
          className="mt-4 w-full rounded-pd-md border border-pd-border px-4 py-3 text-sm text-pd-text"
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
        allowForm={gate.allowWithdrawForm}
      />

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
