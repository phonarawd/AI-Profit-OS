"use client";

import { T } from "../../copy/ko";
import { Skeleton } from "../lux/Skeleton";
import {
  formatKrwApproxLine,
  formatUsdtLine,
  moneyAriaLabel,
} from "./money-format";

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
      className={["putduk-money", className].filter(Boolean).join(" ")}
      data-testid="putduk-money"
      data-krw-status={krwStatus}
      aria-label={aria || undefined}
    >
      <span className="putduk-money__usdt tabular-nums">{usdtLine ?? "-"}</span>
      {krwStatus === "loading" ? (
        <span className="putduk-money__krw putduk-money__krw--loading">
          <Skeleton height="1em" className="putduk-money__skel" />
        </span>
      ) : null}
      {readyKrw ? (
        <span className="putduk-money__krw tabular-nums">{readyKrw}</span>
      ) : null}
      {krwStatus === "error" ? (
        <span className="putduk-money__krw putduk-money__krw--err">
          {T.money.krwError}
        </span>
      ) : null}
      {showHint && krwStatus === "ready" ? (
        <span className="putduk-money__hint">{T.money.hintLatest}</span>
      ) : null}
      {showHint && krwStatus === "stale" ? (
        <span className="putduk-money__hint">{T.money.hintRecent}</span>
      ) : null}
    </span>
  );
}
