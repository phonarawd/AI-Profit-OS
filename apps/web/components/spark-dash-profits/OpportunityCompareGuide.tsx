import { SD_ASSETS } from "../spark-dash-home/assets";

export function OpportunityCompareGuide() {
  return (
    <aside className="sdp-guide" data-sdp="guide" aria-label="비교 포인트">
      <img className="sdp-guide-halo" src={SD_ASSETS.heroHalo} alt="" />
      <img className="sdp-guide-bolt" src={SD_ASSETS.heroLightningOutline} alt="" />
      <div className="sdp-guide-copy">
        <p className="sdp-guide-kicker">비교 포인트</p>
        <p className="sdp-guide-title">수익 · 원금 · 시간</p>
        <p className="sdp-guide-body">세 가지만 맞춰 보면 기회가 선명해져요.</p>
      </div>
    </aside>
  );
}
