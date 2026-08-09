"use client";

import { T } from "../../copy/ko";

export type NetworkPlainWarningProps = {
  /** Override detail href · default §38.8 guide */
  detailHref?: string;
  /** Override wrong-sent href · default §51.11 support deposit */
  wrongSentHref?: string;
  className?: string;
};

/**
 * Money §41.6 · UI §38.8 — plain-ko network warning.
 * Must sit above deposit address/QR on USDT tab. Chain-code jargon forbidden.
 */
export function NetworkPlainWarning({
  detailHref = "/me/guide/get-usdt",
  wrongSentHref = "/me/support?category=deposit&kind=wrong_chain",
  className = "",
}: NetworkPlainWarningProps) {
  return (
    <aside
      data-testid="network-plain-warning"
      data-network-label={T.wallet.networkName}
      className={`rounded-[var(--radius-md)] border border-[var(--color-lux-border)] bg-[var(--color-lux-elevated)] p-3 text-sm text-[var(--color-lux-text)] ${className}`.trim()}
      role="note"
    >
      <p data-testid="network-warning-line1">{T.wallet.networkWarning}</p>
      <p
        className="mt-1 text-[var(--color-lux-text-muted)]"
        data-testid="network-warning-line2"
      >
        {T.wallet.networkWarningLine2}
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <a
          href={detailHref}
          data-testid="network-warning-detail"
          className="text-[var(--color-lux-accent)] underline"
        >
          {T.wallet.networkWarningDetail}
        </a>
        <a
          href={wrongSentHref}
          data-testid="network-warning-wrong-sent"
          className="text-[var(--color-lux-accent)] underline"
        >
          {T.wallet.networkWarningWrongSent}
        </a>
      </div>
    </aside>
  );
}
