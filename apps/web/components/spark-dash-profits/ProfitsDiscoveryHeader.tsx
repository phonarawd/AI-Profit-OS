import { SD_ASSETS } from "../spark-dash-home/assets";
import { T } from "@aipo/ui/copy/ko";
import { OpportunityCompareGuide } from "./OpportunityCompareGuide";

export function ProfitsDiscoveryHeader({ fxHint }: { fxHint?: "latest" | "recent" | null }) {
  return (
    <section className="sdp-intro" data-sdp="intro">
      <div className="sdp-intro-copy">
        <p className="sdp-kicker">
          <img src={SD_ASSETS.miniSpark} alt="" />
          기회 비교
        </p>
        <h1 className="sdp-title">
          기회 탐색
          <img className="sdp-title-spark" src={SD_ASSETS.headlineSpark} alt="" />
        </h1>
        <p className="sdp-lead">
          예상 수익 · 필요한 원금 · 소요 시간을 한눈에 비교하세요.
        </p>
        {fxHint === "latest" ? (
          <p className="sdp-fx-hint">{T.money.hintLatest} · {T.money.hintAuto}</p>
        ) : fxHint === "recent" ? (
          <p className="sdp-fx-hint">{T.money.hintRecent}</p>
        ) : null}
      </div>
      <OpportunityCompareGuide />
    </section>
  );
}
