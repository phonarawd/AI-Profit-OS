import { SD_ASSETS } from "../spark-dash-home/assets";
import { OpportunityCompareGuide } from "./OpportunityCompareGuide";

export function ProfitsDiscoveryHeader() {
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
      </div>
      <OpportunityCompareGuide />
    </section>
  );
}
