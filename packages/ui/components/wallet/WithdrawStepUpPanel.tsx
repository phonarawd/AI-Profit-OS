"use client";

import { T } from "../../copy/ko";

export type WithdrawStepUpPanelProps = {
  method: "pin" | "email_otp" | "webauthn" | "recovery";
  proof: string;
  onProofChange: (proof: string) => void;
  onChallenge: () => void;
  onVerify: () => void;
  challengeReady?: boolean;
  busy?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * PART9f2 — 출금 step-up UI (challenge → verify)
 */
export function WithdrawStepUpPanel({
  method,
  proof,
  onProofChange,
  onChallenge,
  onVerify,
  challengeReady = false,
  busy = false,
  disabled = false,
  className = "",
}: WithdrawStepUpPanelProps) {
  const label =
    method === "pin"
      ? T.withdrawMode.stepUpPinLabel
      : T.withdrawMode.stepUpCodeLabel;

  return (
    <section
      data-testid="withdraw-step-up-panel"
      data-step-up-method={method}
      data-challenge-ready={challengeReady ? "true" : "false"}
      className={["walletV2StepUp", className].filter(Boolean).join(" ")}
    >
      <h3>{T.withdrawMode.stepUpTitle}</h3>
      <p>{T.withdrawMode.stepUpHint}</p>

      <button
        type="button"
        data-testid="withdraw-step-up-challenge"
        disabled={disabled || busy}
        onClick={onChallenge}
      >
        {T.withdrawMode.stepUpChallenge}
      </button>

      <label>
        {label}
        <input
          data-testid="withdraw-step-up-proof"
          type={method === "pin" ? "password" : "text"}
          inputMode={method === "pin" ? "numeric" : "text"}
          autoComplete="one-time-code"
          disabled={disabled || busy || !challengeReady}
          value={proof}
          placeholder={T.withdrawMode.stepUpPinPlaceholder}
          onChange={(e) => onProofChange(e.target.value)}
        />
      </label>

      <button
        type="button"
        data-testid="withdraw-step-up-verify"
        disabled={disabled || busy || !challengeReady || !proof.trim()}
        onClick={onVerify}
      >
        {T.withdrawMode.ctaStepUpSubmit}
      </button>
    </section>
  );
}
