"use client";

import { useEffect, useState } from "react";
import { T } from "../../copy/ko";
import { TouchButton } from "../../primitives/Button";

const STORAGE_KEY = "peotteok_deposit_why_ack";

export type DepositWhyGateProps = {
  /** Controlled open; if omitted, auto-open until acknowledged */
  open?: boolean;
  onAcknowledged?: () => void;
  className?: string;
};

/**
 * UI §38.7 — first-deposit understanding gate (Q2+Q4).
 * Checkbox required before deposit form continues.
 */
export function DepositWhyGate({
  open: openProp,
  onAcknowledged,
  className = "",
}: DepositWhyGateProps) {
  const [acked, setAcked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);

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

  const g = T.objections.depositGate;

  function confirm() {
    if (!checked) return;
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
      data-testid="deposit-why-gate"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deposit-why-gate-title"
      className={`fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center ${className}`.trim()}
    >
      <div className="w-full max-w-md rounded-pd-md border border-pd-border bg-pd-surface p-4 text-pd-text shadow-lg">
        <h2
          id="deposit-why-gate-title"
          className="text-lg font-semibold"
        >
          {g.title}
        </h2>
        <p className="mt-2 text-sm text-pd-text-muted">{g.body}</p>
        <ul className="mt-3 space-y-2 text-sm text-pd-text-muted">
          <li>
            <strong className="text-pd-text">{T.objections.q2.q}</strong>
            <br />
            {T.objections.q2.a}
          </li>
          <li>
            <strong className="text-pd-text">{T.objections.q4.q}</strong>
            <br />
            {T.objections.q4.a}
          </li>
        </ul>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            data-testid="deposit-why-gate-ack"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1"
          />
          <span>{g.ack}</span>
        </label>
        <TouchButton
          variant="primary"
          className="mt-4 w-full"
          data-testid="deposit-why-gate-continue"
          disabled={!checked}
          onClick={confirm}
        >
          {g.continue}
        </TouchButton>
      </div>
    </div>
  );
}
