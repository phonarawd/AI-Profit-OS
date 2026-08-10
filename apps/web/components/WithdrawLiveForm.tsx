"use client";

import { useCallback, useState } from "react";
import {
  createWithdraw,
  createWithdrawStepUpChallenge,
  newWithdrawIdempotencyKey,
  verifyWithdrawStepUp,
  type WithdrawStepUpMethod,
} from "@aipo/sdk/wallet";
import { WithdrawAmountPanel } from "@aipo/ui/components/wallet/WithdrawAmountPanel";
import { WithdrawStepUpPanel } from "@aipo/ui/components/wallet/WithdrawStepUpPanel";
import { T } from "@aipo/ui/copy/ko";

export type WithdrawLiveFormProps = {
  asset: "USDT" | "KRW";
  mode: "profit" | "principal" | "combined";
  principalConfirmToken?: string | null;
  /** principal|combined 인데 토큰 없으면 submit 차단 */
  requirePrincipalConfirm?: boolean;
  allowForm?: boolean;
};

/**
 * PART9f2 — 금액·step-up·POST /wallet/withdraw(idempotencyKey)
 * PrincipalConfirmSheet 토큰=클라랜덤 pointer(서버 재설계=Money 후속)
 */
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

  const onChallenge = useCallback(async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await createWithdrawStepUpChallenge({ method });
      setChallengeId(res.challengeId);
      setStepUpToken(null);
      setProof("");
    } catch {
      setStatus(T.withdrawMode.submitFail);
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
    } catch {
      setStatus(T.withdrawMode.submitFail);
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
      setStatus(T.withdrawMode.submitOk);
    } catch {
      setStatus(T.withdrawMode.submitFail);
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

  return (
    <div data-testid="withdraw-live-form" data-withdraw-asset={asset}>
      <WithdrawAmountPanel
        amountUsdt={amountUsdt}
        onAmountChange={setAmountUsdt}
        destination={destination}
        onDestinationChange={setDestination}
        showDestination={asset === "USDT"}
        asset={asset}
        disabled={busy}
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
          className="mt-2 hidden"
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
        className="mt-6 w-full rounded-lux-md bg-lux-accent px-4 py-3 text-sm font-semibold text-lux-bg disabled:opacity-50"
      >
        {T.withdrawMode.ctaSubmit}
      </button>

      {status ? (
        <p className="mt-3 text-sm text-lux-text-muted" role="status">
          {status}
        </p>
      ) : null}
    </div>
  );
}
