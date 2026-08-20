import { moneyOrDash, splitUsdtParts } from "../spark-dash-home/format";
import type { ProfitsOpportunity } from "./types";

function UsdtValue({ value }: { value: string | null }) {
  const parts = splitUsdtParts(value);
  return (
    <p className="sdp-usdt">
      <span className="amt">{parts.amount}</span>
      {parts.unit ? <span className="unit">{parts.unit}</span> : null}
    </p>
  );
}

export function OpportunityMetrics({ item }: { item: ProfitsOpportunity }) {
  return (
    <div className="sdp-metrics" data-sdp="metrics">
      <div className="sdp-metric is-rate">
        <p className="k">예상 수익률</p>
        <p className="rate">{moneyOrDash(item.ratePct)}</p>
      </div>
      <div className="sdp-metric is-profit">
        <p className="k">예상 수익</p>
        <UsdtValue value={item.expectedProfitUsdt} />
        {item.expectedProfitKrw ? <p className="krw">{item.expectedProfitKrw}</p> : null}
      </div>
      <div className="sdp-need">
        <div>
          <p className="k">최소 참여 원금</p>
          <UsdtValue value={item.capitalUsdt} />
          {item.capitalKrw ? <p className="krw">{item.capitalKrw}</p> : null}
        </div>
        <div>
          <p className="k">예상 소요 시간</p>
          <p className="dur">{moneyOrDash(item.durationLabel)}</p>
        </div>
      </div>
    </div>
  );
}
