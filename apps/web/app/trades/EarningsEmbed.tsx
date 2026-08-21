import type { ReactNode } from "react";
import styles from "./trades.module.css";

type EarningsState = "ready" | "unavailable";

/**
 * REL-111 — /trades earnings embed.
 * Owner = GET /api/v1/wallet/buckets profitUsdt. Client sum 0. FX secondary 0.
 */
export function EarningsEmbed({
  state,
  profitLine,
}: {
  state: EarningsState;
  profitLine: string | null;
}): ReactNode {
  const ready = state === "ready" && profitLine != null;
  return (
    <section
      className={styles.earnings}
      data-earnings-embed="true"
      data-earnings-owner="wallet.profitUsdt"
      data-earnings-state={ready ? "ready" : "unavailable"}
      aria-label="지갑 수익"
    >
      <dl className={styles.facts}>
        <div>
          <dt>지갑 수익</dt>
          <dd data-earnings-value={ready ? profitLine : "unavailable"}>
            {ready ? profitLine : "확인할 수 없음"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
