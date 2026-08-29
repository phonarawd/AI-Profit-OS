"use client";

import { useEffect, useState } from "react";
import { T } from "../../copy/ko";
import { TouchButton } from "../../primitives/Button";
import type { DepositConsultFact } from "./trust-types";

const STORAGE_KEY = "peotteok_deposit_consult_ack";

export type DepositConsultProps = {
  open?: boolean;
  fact?: DepositConsultFact | null;
  onAcknowledged?: () => void;
  className?: string;
};

/**
 * §51.21 Personal AI — First Deposit 60s Consult
 * DepositWhyGate + §47 Template path Q2/Q4 우선 · P레인 · LLM 강제 0
 */
export function DepositConsult({
  open: openProp,
  fact = null,
  onAcknowledged,
  className = "",
}: DepositConsultProps) {
  const [acked, setAcked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v === "1") {
        setAcked(true);
        setInternalOpen(false);
      } else {
        setInternalOpen(true);
      }
    } catch {
      setInternalOpen(true);
    }
  }, []);

  const open = openProp ?? (!acked && internalOpen);
  if (!open) return null;

  const c = T.trust.depositConsult;
  const tone = fact?.toneBand ?? "mid";
  const senior = tone === "senior";
  const balanceRaw = fact?.balanceUsdt;
  const balance =
    typeof balanceRaw === "string" && /^-?[0-9]+(\.[0-9]+)?$/.test(balanceRaw)
      ? balanceRaw
      : "확인할 수 없음";
  const previewN =
    typeof fact?.opportunityPreviewCount === "number" &&
    Number.isFinite(fact.opportunityPreviewCount)
      ? fact.opportunityPreviewCount
      : null;

  function confirm() {
    if (!checked && !senior) return;
    if (senior && step < 1) {
      setStep(1);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setAcked(true);
    setInternalOpen(false);
    onAcknowledged?.();
  }

  return (
    <div
      data-testid="deposit-consult"
      data-canon-block="depositConsult"
      data-template-path="true"
      data-llm="false"
      data-lane="P"
      data-tone-band={tone}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-consult-title"
      className={`fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center ${className}`.trim()}
    >
      <div className="w-full max-w-md rounded-pd-md border border-pd-border bg-pd-surface p-4 text-pd-text shadow-lg">
        <h2 id="deposit-consult-title" className="text-lg font-semibold">
          {c.title}
        </h2>
        <p className="mt-1 text-xs text-pd-text-muted">{c.sixtySec}</p>

        <div
          data-testid="deposit-consult-fact"
          data-canon-block="factCard"
          className="mt-3 rounded-pd-md border border-pd-border p-3 text-sm"
        >
          <p data-field="balanceUsdt">
            {c.factBalance.replace("{n}", balance)}
          </p>
          {previewN != null ? (
            <p data-field="opportunityPreviewCount" className="mt-1 text-pd-text-muted">
              {c.factPreview.replace("{n}", String(previewN))}
            </p>
          ) : (
            <p data-field="opportunityPreviewCount" className="mt-1 text-pd-text-muted">
              미리보기 수를 확인할 수 없음
            </p>
          )}
        </div>

        {senior && step === 0 ? (
          <p className="mt-3 text-sm text-pd-text-muted" data-testid="deposit-consult-senior-q2">
            <strong className="text-pd-text">{T.objections.q2.q}</strong>
            <br />
            {T.objections.q2.a}
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-pd-text-muted">
            <li data-testid="deposit-consult-q2" data-template="q2">
              <strong className="text-pd-text">{T.objections.q2.q}</strong>
              <br />
              {T.objections.q2.a}
            </li>
            <li data-testid="deposit-consult-q4" data-template="q4">
              <strong className="text-pd-text">{T.objections.q4.q}</strong>
              <br />
              {T.objections.q4.a}
            </li>
          </ul>
        )}

        {!senior || step >= 1 ? (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              data-testid="deposit-consult-ack"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1"
            />
            <span>{c.ack}</span>
          </label>
        ) : null}

        <TouchButton
          variant="primary"
          className="mt-4 w-full"
          data-testid="deposit-consult-continue"
          disabled={senior && step === 0 ? false : !checked}
          onClick={confirm}
        >
          {senior && step === 0 ? c.next : c.continue}
        </TouchButton>

        {fact?.depositPref === "krw" ? (
          <p className="mt-2 text-center text-xs text-pd-text-muted">
            {c.krwPreferHint}
          </p>
        ) : (
          <p className="mt-2 text-center text-xs text-pd-text-muted">
            {c.usdtPreferHint}
          </p>
        )}
      </div>
    </div>
  );
}
