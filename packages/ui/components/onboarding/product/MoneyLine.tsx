import { T } from "../../../copy/ko";
import { formatKrwGroup, formatUsdtLine } from "./format-money";

export function MoneyLine(props: {
  label: string;
  usdt: string | null | undefined;
  krw?: string | null;
  hint?: string;
  tone?: "principal" | "expected" | "settled";
  signed?: boolean;
  testId: string;
}) {
  const money = formatUsdtLine(props.usdt, props.signed);
  const krw = formatKrwGroup(props.krw ?? null);
  const tone =
    props.tone === "expected"
      ? "is-expected"
      : props.tone === "settled"
        ? "is-settled"
        : "";
  return (
    <div className="po-money" data-testid={props.testId} data-money-state={money.state}>
      <p className="po-money-label">{props.label}</p>
      {money.state === "ready" ? (
        <p className={`po-money-usdt ${tone}`}>
          {money.text} {T.productOnboarding.usdtUnit}
        </p>
      ) : (
        <p className="po-money-usdt">{T.productOnboarding.unavailable}</p>
      )}
      {money.state === "ready" && krw ? (
        <p className="po-money-krw">
          {T.productOnboarding.krwApprox.replace("{amount}", krw)}
          {props.hint ? ` · ${props.hint}` : ""}
        </p>
      ) : null}
    </div>
  );
}
