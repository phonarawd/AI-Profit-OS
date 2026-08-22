"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWithdraw,
  createWithdrawStepUpChallenge,
  fetchWalletBuckets,
  newWithdrawIdempotencyKey,
  verifyWithdrawStepUp,
  type WithdrawStepUpMethod,
} from "@aipo/sdk/wallet";
import { WithdrawAmountPanel } from "@aipo/ui/components/wallet/WithdrawAmountPanel";
import { WithdrawStepUpPanel } from "@aipo/ui/components/wallet/WithdrawStepUpPanel";
import { T } from "@aipo/ui/copy/ko";
import styles from "../app/wallet/wallet.module.css";

function withdrawErrorView(err: unknown): {
  state: "denied" | "unavailable" | "unauthorized";
  status: string;
} {
  const msg = err instanceof Error ? err.message : "";
  if (/_401\b/.test(msg)) {
    return { state: "unauthorized", status: T.withdrawMode.unauthorized };
  }
  if (/_403\b/.test(msg)) {
    return { state: "denied", status: "지금은 출금할 수 없어요." };
  }
  return { state: "unavailable", status: T.withdrawMode.submitFail };
}

export type WithdrawLiveFormProps = {
  asset: "USDT" | "KRW";
  mode: "profit" | "principal" | "combined";
  principalConfirmToken?: string | null;
  requirePrincipalConfirm?: boolean;
  allowForm?: boolean;
};

export function WithdrawLiveForm({
  asset,
  mode,
  principalConfirmToken = null,
  requirePrincipalConfirm = false,
  allowForm = true,
}: WithdrawLiveFormProps) {
  const [amountUsdt, setAmountUsdt] = useState("");
  const [destination, setDestination] = useState("");
  const [proof, setProof] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [stepUpToken, setStepUpToken] = useState<string | null>(null);
  const [method] = useState<WithdrawStepUpMethod>("pin");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<
    "idle" | "accepted" | "denied" | "unavailable" | "unauthorized"
  >("idle");
  const [availableProfitUsdt, setAvailableProfitUsdt] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const buckets = await fetchWalletBuckets({ signal: ac.signal });
        if (!ac.signal.aborted) setAvailableProfitUsdt(buckets.profitUsdt);
      } catch {
        if (!ac.signal.aborted) setAvailableProfitUsdt(null);
      }
    })();
    return () => ac.abort();
  }, []);

  const onChallenge = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await createWithdrawStepUpChallenge({ method });
      setChallengeId(res.challengeId);
      setStepUpToken(null);
      setProof("");
    } catch (err) {
      const next = withdrawErrorView(err);
      setFlowState(next.state);
      setStatus(next.status);
      setChallengeId(null);
    } finally {
      setBusy(false);
    }
  }, [method]);

  const onVerify = useCallback(async () => {
    if (!challengeId || !proof.trim()) return;
    setBusy(true);
    setStatus(null);
    try {
      const res = await verifyWithdrawStepUp({
        challengeId,
        method,
        proof: proof.trim(),
      });
      setStepUpToken(res.stepUpToken);
    } catch (err) {
      const next = withdrawErrorView(err);
      setFlowState(next.state);
      setStatus(next.status);
      setStepUpToken(null);
    } finally {
      setBusy(false);
    }
  }, [challengeId, method, proof]);

  const onSubmit = useCallback(async () => {
    if (!allowForm) return;
    if (!amountUsdt.trim() || !stepUpToken) return;
    if (requirePrincipalConfirm && !principalConfirmToken) return;
    if (asset === "USDT" && !destination.trim()) return;

    setBusy(true);
    setStatus(null);
    try {
      await createWithdraw({
        mode,
        amountUsdt: amountUsdt.trim(),
        asset,
        destination: asset === "USDT" ? destination.trim() : undefined,
        idempotencyKey: newWithdrawIdempotencyKey(),
        stepUpToken,
        principalConfirmToken: principalConfirmToken ?? undefined,
      });
      setFlowState("accepted");
      setStatus(T.withdrawMode.submitOk);
    } catch (err) {
      const next = withdrawErrorView(err);
      setFlowState(next.state);
      setStatus(next.status);
    } finally {
      setBusy(false);
    }
  }, [
    allowForm,
    amountUsdt,
    asset,
    destination,
    mode,
    principalConfirmToken,
    requirePrincipalConfirm,
    stepUpToken,
  ]);

  if (!allowForm) return null;

  const modeLabel =
    mode === "profit" ? T.withdrawMode.modeProfit : T.withdrawMode.modePrincipal;

  return (
    <div
      data-testid="withdraw-live-form"
      data-withdraw-asset={asset}
      data-withdraw-state={flowState}
      data-credited="false"
      data-has-amount={amountUsdt.trim() ? "true" : "false"}
      data-has-destination={destination.trim() ? "true" : "false"}
      data-has-token={stepUpToken ? "true" : "false"}
      className={styles.deskSplit}
    >
      <section className={styles.card}>
        <WithdrawAmountPanel
          amountUsdt={amountUsdt}
          onAmountChange={setAmountUsdt}
          destination={destination}
          onDestinationChange={setDestination}
          showDestination={asset === "USDT"}
          asset={asset}
          disabled={busy}
          availableProfitUsdt={availableProfitUsdt}
        />

        <WithdrawStepUpPanel
          method={method === "pin" ? "pin" : "email_otp"}
          proof={proof}
          onProofChange={setProof}
          onChallenge={() => {
            void onChallenge();
          }}
          onVerify={() => {
            void onVerify();
          }}
          challengeReady={Boolean(challengeId)}
          busy={busy}
        />

        {stepUpToken ? (
          <p
            hidden
            data-testid="withdraw-step-up-token-ready"
            data-token-len={stepUpToken.length}
          />
        ) : null}

        <button
          type="button"
          data-testid="withdraw-submit"
          data-mode={mode}
          disabled={
            busy ||
            !stepUpToken ||
            !amountUsdt.trim() ||
            (requirePrincipalConfirm && !principalConfirmToken) ||
            (asset === "USDT" && !destination.trim())
          }
          onClick={() => {
            void onSubmit();
          }}
          className={styles.cta}
        >
          {T.withdrawMode.ctaReview}
        </button>

        {status ? (
          <p role="status" data-testid="withdraw-result">
            {status}
          </p>
        ) : null}
      </section>
      <aside>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{T.withdrawMode.reviewPreviewTitle}</h2>
          <dl className={styles.reviewList}>
            <div className={styles.reviewRow}>
              <dt>{T.withdrawMode.reviewMode}</dt>
              <dd>{modeLabel}</dd>
            </div>
            <div className={styles.reviewRow}>
              <dt>{T.withdrawMode.reviewAmount}</dt>
              <dd>
                {amountUsdt.trim()
                  ? `${amountUsdt.trim()} ${T.walletBuckets.usdtSuffix}`
                  : T.withdrawMode.amountPending}
              </dd>
            </div>
            <div className={styles.reviewRow}>
              <dt>
                {asset === "USDT"
                  ? T.withdrawMode.receivePlace
                  : T.withdrawMode.receiveCurrency}
              </dt>
              <dd>
                {asset === "KRW"
                  ? T.withdrawMode.receiveKrw
                  : destination.trim() || T.withdrawMode.destPending}
              </dd>
            </div>
            {asset === "USDT" ? (
              <div className={styles.reviewRow}>
                <dt>{T.withdrawMode.feeLabel}</dt>
                <dd>{T.withdrawMode.feePending}</dd>
              </div>
            ) : null}
          </dl>
        </section>
        <div className={styles.notice}>
          <p className={styles.noticeTitle}>{T.withdrawMode.stepUpLast}</p>
          <p className={styles.noticeBody}>{T.withdrawMode.stepUpLastBody}</p>
        </div>
      </aside>
    </div>
  );
}
