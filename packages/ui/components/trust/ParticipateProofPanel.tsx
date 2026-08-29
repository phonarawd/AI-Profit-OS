"use client";

import { useState } from "react";
import { T } from "../../copy/ko";
import { formatUsdtOrUnavailable } from "../opportunity/money-display";
import type { ParticipateProofModel } from "./trust-types";

export type ParticipateProofPanelProps = {
  proof?: ParticipateProofModel | null;
  className?: string;
};

function truncateHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || "";
  return `${hash.slice(0, 8)}…${hash.slice(-8)}`;
}

/**
 * §51.16 Proof-at-Participate — success/safe_stop collapsible
 * hash truncated + [복사] · UI 재계산 0
 */
export function ParticipateProofPanel({
  proof = null,
  className = "",
}: ParticipateProofPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!proof?.proofHash) return null;

  const c = T.trust.proof;

  async function copyHash() {
    try {
      await navigator.clipboard.writeText(proof!.proofHash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      data-testid="participate-proof-panel"
      data-canon-block="participateProof"
      data-proof-hash={proof.proofHash}
      className={`rounded-pd-md border border-pd-border p-3 text-sm text-pd-text ${className}`.trim()}
    >
      <button
        type="button"
        data-testid="participate-proof-toggle"
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{c.title}</span>
        <span className="text-pd-text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <dl className="mt-3 space-y-2 text-pd-text-muted" data-testid="participate-proof-body">
          <div className="flex justify-between gap-2">
            <dt>{c.buy}</dt>
            <dd
              data-field="buyPriceUsdt"
              data-money-state={formatUsdtOrUnavailable(proof.buyPriceUsdt).state}
              className="text-pd-text"
            >
              {formatUsdtOrUnavailable(proof.buyPriceUsdt).text}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{c.sell}</dt>
            <dd
              data-field="sellPriceUsdt"
              data-money-state={formatUsdtOrUnavailable(proof.sellPriceUsdt).state}
              className="text-pd-text"
            >
              {formatUsdtOrUnavailable(proof.sellPriceUsdt).text}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>{c.expected}</dt>
            <dd
              data-field="expectedProfitUsdt"
              data-money-state={
                formatUsdtOrUnavailable(proof.expectedProfitUsdt, true).state
              }
              className="text-pd-accent"
            >
              {formatUsdtOrUnavailable(proof.expectedProfitUsdt, true).text}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>{c.hash}</dt>
            <dd className="flex items-center gap-2 font-mono text-xs text-pd-text">
              <span data-testid="participate-proof-hash-trunc">
                {truncateHash(proof.proofHash)}
              </span>
              <button
                type="button"
                data-testid="participate-proof-copy"
                className="text-pd-accent"
                onClick={copyHash}
              >
                {copied ? c.copied : c.copy}
              </button>
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
