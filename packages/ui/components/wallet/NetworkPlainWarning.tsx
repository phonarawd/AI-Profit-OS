"use client";

import { T } from "../../copy/ko";

export type NetworkPlainWarningProps = {
  detailHref?: string;
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
      className={`walletV2NoticeWarn ${className}`.trim()}
      role="note"
    >
      <p data-testid="network-warning-line1">{T.wallet.networkWarning}</p>
      <p data-testid="network-warning-line2">{T.wallet.networkWarningLine2}</p>
      <div>
        <a href={detailHref} data-testid="network-warning-detail">
          {T.wallet.networkWarningDetail}
        </a>
        <a href={wrongSentHref} data-testid="network-warning-wrong-sent">
          {T.wallet.networkWarningWrongSent}
        </a>
      </div>
    </aside>
  );
}
