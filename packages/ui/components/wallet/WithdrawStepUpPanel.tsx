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
 * 정책 Owns=Money §43.6 · 본 컴포넌트=입력·CTA만
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
      className={["mt-4 space-y-3", className].filter(Boolean).join(" ")}
    >
      <h2 className="text-base font-semibold text-lux-text">
        {T.withdrawMode.stepUpTitle}
      </h2>
      <p className="text-sm text-lux-text-muted">{T.withdrawMode.stepUpHint}</p>

      <button
        type="button"
        data-testid="withdraw-step-up-challenge"
        disabled={disabled || busy}
        onClick={onChallenge}
        className="w-full rounded-lux-md border border-lux-border px-4 py-3 text-sm font-medium text-lux-text"
      >
        {T.withdrawMode.stepUpChallenge}
      </button>

      <label className="block text-sm text-lux-text-muted">
        {label}
        <input
          data-testid="withdraw-step-up-proof"
          type={method === "pin" ? "password" : "text"}
          inputMode={method === "pin" ? "numeric" : "text"}
          autoComplete="one-time-code"
          disabled={disabled || busy || !challengeReady}
          value={proof}
          onChange={(e) => onProofChange(e.target.value)}
          className="mt-1 w-full rounded-lux-md border border-lux-border bg-transparent px-3 py-2 text-lux-text"
        />
      </label>

      <button
        type="button"
        data-testid="withdraw-step-up-verify"
        disabled={disabled || busy || !challengeReady || !proof.trim()}
        onClick={onVerify}
        className="w-full rounded-lux-md bg-lux-principal px-4 py-3 text-sm font-semibold text-lux-bg"
      >
        {T.withdrawMode.stepUpVerify}
      </button>
    </section>
  );
}
