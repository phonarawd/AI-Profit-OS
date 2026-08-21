"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import {
  DISCLAIMER,
  MAY_STOP,
  remainLabel,
  sheetCopyFor,
  type ParticipateSheetPhase,
} from "./participate-sheet";

export function ParticipateConfirmSheet({
  open,
  phase,
  errorCode,
  errorStatus,
  capitalLine,
  profitLine,
  remain,
  mayStop = MAY_STOP,
  onClose,
  onConfirm,
  onRetryConfirm,
  tradeHref,
}: {
  open: boolean;
  phase: ParticipateSheetPhase;
  errorCode: string | null;
  errorStatus: number;
  capitalLine: string;
  profitLine: string;
  remain: string | null;
  mayStop?: string;
  onClose: () => void;
  onConfirm: () => void;
  onRetryConfirm: () => void;
  tradeHref: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const copy = sheetCopyFor({ phase, errorCode, errorStatus });
  const ttl = remainLabel(remain);
  const lockedClose = phase === "SUBMITTING" || phase === "ACCEPTED" || phase === "REUSED";

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  function handlePrimary() {
    if (copy.recovery === "retry-confirm") {
      onRetryConfirm();
      return;
    }
    if (copy.recovery === "close" && copy.confirmEnabled) {
      onConfirm();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="sdr-sheet"
      aria-labelledby={titleId}
      data-sdr-sheet={phase}
      data-sdr-sheet-error={errorCode ?? ""}
      onClose={() => {
        if (!lockedClose) onClose();
      }}
      onCancel={(e) => {
        if (lockedClose) e.preventDefault();
      }}
    >
      <h2 id={titleId}>{copy.title}</h2>
      <dl className="sdr-sheet-facts">
        <div>
          <dt className="sdr-k">잠길 원금</dt>
          <dd>{capitalLine}</dd>
        </div>
        <div>
          <dt className="sdr-k">기대 결과</dt>
          <dd>{profitLine}</dd>
        </div>
      </dl>
      <p className="sdr-sheet-hint">{mayStop}</p>
      <p className="sdr-sheet-hint">{DISCLAIMER}</p>
      {copy.hint ? <p className="sdr-sheet-hint">{copy.hint}</p> : null}
      {ttl && phase === "PREFLIGHT_READY" ? (
        <p className="sdr-sheet-ttl">{ttl}</p>
      ) : null}
      <div className="sdr-sheet-actions">
        {copy.recovery === "deposit" ? (
          <Link href="/wallet/deposit">{copy.primary}</Link>
        ) : null}
        {copy.recovery === "list" ? <Link href="/profits">{copy.primary}</Link> : null}
        {copy.recovery === "login" ? (
          <Link href="/auth/login">{copy.primary}</Link>
        ) : null}
        {copy.recovery === "execute" && tradeHref ? (
          <Link href={tradeHref}>{copy.primary}</Link>
        ) : null}
        {copy.recovery === "execute" && !tradeHref ? (
          <button type="button" disabled>
            {copy.primary}
          </button>
        ) : null}
        {copy.recovery === "retry-confirm" || copy.recovery === "close" ? (
          <button
            type="button"
            disabled={copy.busy || !copy.confirmEnabled}
            onClick={handlePrimary}
          >
            {copy.primary}
          </button>
        ) : null}
        <button
          type="button"
          className="sdr-secondary"
          disabled={copy.busy || lockedClose}
          onClick={onClose}
        >
          {copy.secondary}
        </button>
      </div>
    </dialog>
  );
}
