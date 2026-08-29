import { T } from "../../copy/ko";

/**
 * 준비 금액 개념 설명.
 * 예시 금액을 발명하지 않음. 없음 ≠ 0.
 */
export function BuyingPowerMeter() {
  return (
    <section
      className="acq-demo-panel"
      data-testid="onboarding-buying-power"
      data-demo="체험"
      data-money="unavailable"
    >
      <p className="acq-demo-label">{T.onboarding.demoLabel}</p>
      <h2 className="mt-2 text-center text-base font-semibold">
        {T.onboarding.buyingPowerTitle}
      </h2>
      <p className="mt-2 text-center text-sm text-pd-text-muted">
        {T.onboarding.buyingPowerBody}
      </p>
      <div
        className="acq-meter mt-4"
        role="img"
        aria-label={T.onboarding.buyingPowerUnavailable}
      >
        <div className="acq-meter-fill" />
      </div>
      <p className="mt-2 text-center text-sm font-medium text-pd-text">
        {T.onboarding.buyingPowerUnavailable}
      </p>
    </section>
  );
}
