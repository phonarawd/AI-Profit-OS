"use client";

import { T } from "../../copy/ko";
import { Skeleton } from "../lux/Skeleton";
import {
  formatKrwApproxLine,
  formatUsdtLine,
  moneyAriaLabel,
} from "./money-format";
import styles from "./MoneyAmount.module.css";

export type MoneyKrwStatus =
  | "ready"
  | "stale"
  | "loading"
  | "unavailable"
  | "error";

export type MoneyAmountProps = {
  amountUsdt: string | null | undefined;
  amountKrw?: string | null;
  krwStatus?: MoneyKrwStatus;
  signed?: boolean;
  showHint?: boolean;
  className?: string;
};

export function MoneyAmount({
  amountUsdt,
  amountKrw = null,
  krwStatus = "unavailable",
  signed = false,
  showHint = false,
  className = "",
}: MoneyAmountProps) {
  const usdtLine = formatUsdtLine(amountUsdt, signed);
  const readyKrw =
    (krwStatus === "ready" || krwStatus === "stale") && amountKrw != null
      ? formatKrwApproxLine(amountKrw, signed, T.money.krwApprox)
      : null;
  const aria = moneyAriaLabel({
    usdtLine,
    krwLine: readyKrw ?? (krwStatus === "error" ? T.money.krwError : null),
  });

  return (
    <span
      className={["putduk-money", styles.root, className]
        .filter(Boolean)
        .join(" ")}
      data-testid="putduk-money"
      data-krw-status={krwStatus}
      aria-label={aria || undefined}
    >
      <span className={`putduk-money__usdt tabular-nums ${styles.usdt}`}>
        {usdtLine ?? "-"}
      </span>
      {krwStatus === "loading" ? (
        <span
          className={`putduk-money__krw putduk-money__krw--loading ${styles.krw} ${styles.loading}`}
        >
          <Skeleton height="1em" className={`putduk-money__skel ${styles.skeleton}`} />
        </span>
      ) : null}
      {readyKrw ? (
        <span className={`putduk-money__krw tabular-nums ${styles.krw}`}>
          {readyKrw}
        </span>
      ) : null}
      {krwStatus === "error" ? (
        <span
          className={`putduk-money__krw putduk-money__krw--err ${styles.krw} ${styles.error}`}
        >
          {T.money.krwError}
        </span>
      ) : null}
      {showHint && krwStatus === "ready" ? (
        <span className={`putduk-money__hint ${styles.hint}`}>
          {T.money.hintLatest}
        </span>
      ) : null}
      {showHint && krwStatus === "stale" ? (
        <span className={`putduk-money__hint ${styles.hint}`}>
          {T.money.hintRecent}
        </span>
      ) : null}
    </span>
  );
}
