"use client";

import { useCallback, useRef, useState } from "react";
import {
  createWithdraw,
  createWithdrawStepUpChallenge,
  newWithdrawIdempotencyKey,
  normalizeWithdrawAmountUsdt,
  verifyWithdrawStepUp,
  type WithdrawStepUpMethod,
} from "@aipo/sdk/wallet";
import { WithdrawAmountPanel } from "@aipo/ui/components/wallet/WithdrawAmountPanel";
import { WithdrawStepUpPanel } from "@aipo/ui/components/wallet/WithdrawStepUpPanel";
import { T } from "@aipo/ui/copy/ko";

function withdrawErrorView(err: unknown): {
  state: "denied" | "unavailable" | "unauthorized";
  status: string;
} {
  const msg = err instanceof Error ? err.message : "";
  if (/_401\b/.test(msg)) {
    return { state: "unauthorized", status: "로그인하면 출금을 신청할 수 있어요." };
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
  const submitInFlight = useRef(false);
  const withdrawIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flowState, setFlowState] = useState<
    "idle" | "accepted" | "denied" | "unavailable" | "unauthorized"
  >("idle");

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
    if (submitInFlight.current) return;
    if (!allowForm) return;
    let normalizedAmount: string;
    try {
      normalizedAmount = normalizeWithdrawAmountUsdt(amountUsdt);
    } catch {
      setFlowState("denied");
      setStatus("출금 금액을 다시 확인해 주세요.");
      return;
    }
    const normalizedDestination = asset === "USDT" ? destination.trim() : "";
    if (!normalizedAmount || !stepUpToken) return;
    if (requirePrincipalConfirm && !principalConfirmToken) return;
    if (asset === "USDT" && !normalizedDestination) return;

    const fingerprint = JSON.stringify({
      mode,
      asset,
      amountUsdt: normalizedAmount,
      destination: normalizedDestination,
      requirePrincipalConfirm,
    });
    if (
      !withdrawIntent.current ||
      withdrawIntent.current.fingerprint !== fingerprint
    ) {
      withdrawIntent.current = {
        fingerprint,
        key: newWithdrawIdempotencyKey(),
      };
    }
    const idempotencyKey = withdrawIntent.current.key;

    submitInFlight.current = true;
    setBusy(true);
    setStatus(null);
    try {
      await createWithdraw({
        mode,
        amountUsdt: normalizedAmount,
        asset,
        destination: normalizedDestination || undefined,
        idempotencyKey,
        stepUpToken,
        principalConfirmToken: principalConfirmToken ?? undefined,
      });
      withdrawIntent.current = null;
      setFlowState("accepted");
      setStatus(T.withdrawMode.submitOk);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/_(400|401|403|409)\b/.test(msg)) {
        withdrawIntent.current = null;
      }
      // 5xx/network is ambiguous: preserve the exact key for retry.
      const next = withdrawErrorView(err);
      setFlowState(next.state);
      setStatus(next.status);
    } finally {
      submitInFlight.current = false;
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
    <div
      data-testid="withdraw-live-form"
      data-withdraw-asset={asset}
      data-withdraw-state={flowState}
      data-credited="false"
      data-has-amount={amountUsdt.trim() ? "true" : "false"}
      data-has-destination={destination.trim() ? "true" : "false"}
      data-has-token={stepUpToken ? "true" : "false"}
    >
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
        className="mt-6 w-full rounded-[0.875rem] bg-[#ff2d6b] px-4 py-3 text-[1.1875rem] font-extrabold text-white disabled:opacity-50"
      >
        {T.withdrawMode.ctaSubmit}
      </button>

      {status ? (
        <p
          className="mt-3 text-sm"
          role="status"
          data-testid="withdraw-result"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
