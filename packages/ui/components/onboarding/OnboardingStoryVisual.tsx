import type { ReactElement } from "react";
import { T } from "../../copy/ko";
import type { OnboardingStoryKey } from "../../copy/ko/onboarding";

type Props = {
  step: OnboardingStoryKey;
};

function Arrow() {
  return (
    <span className="onb-arrow" aria-hidden="true">
      →
    </span>
  );
}

function Rows({
  items,
  ink,
}: {
  items: readonly { left: string; right: string }[];
  ink?: boolean;
}) {
  return (
    <>
      {items.map((item) => (
        <div className="onb-row" key={item.left} data-ink={ink ? "true" : "false"}>
          <span className="onb-row-left">{item.left}</span>
          <span className="onb-row-right">{item.right}</span>
        </div>
      ))}
    </>
  );
}

function ExploreDesktop() {
  const v = T.onboarding.visual.explore;
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="explore">
      <article className="onb-card">
        <p className="onb-kicker">{v.sourceKicker}</p>
        <h3 className="onb-card-title">{v.sourceTitle}</h3>
        <p className="onb-card-body">{v.sourceBody}</p>
        {v.markets.map((market) => (
          <div className="onb-row onb-market" key={market.name}>
            <span className="onb-dot" aria-hidden="true" />
            <span className="onb-row-left" style={{ color: "var(--onb-text)", fontWeight: 600 }}>
              {market.name}
            </span>
            <span className="onb-row-right" style={{ fontWeight: 400, color: "var(--onb-muted)" }}>
              {market.signal}
            </span>
          </div>
        ))}
      </article>
      <Arrow />
      <article className="onb-card onb-card-ink onb-card-ai">
        <p className="onb-kicker">{v.aiKicker}</p>
        <h3 className="onb-card-title">{v.aiTitle}</h3>
        <p className="onb-card-body">{v.aiBody}</p>
        <Rows items={v.scans} ink />
        <div className="onb-scan-bar" aria-hidden="true" />
      </article>
      <Arrow />
      <article className="onb-card">
        <p className="onb-kicker">{v.resultKicker}</p>
        <h3 className="onb-card-title">{v.resultTitle}</h3>
        <p className="onb-card-body">{v.resultBody}</p>
        <Rows items={v.results} />
        <p className="onb-card-foot">{v.resultFoot}</p>
      </article>
    </div>
  );
}

function ExploreMobile() {
  const v = T.onboarding.visual.explore;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="explore-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.aiKicker}</p>
        <h3 className="onb-card-title">{v.mobileAiTitle}</h3>
        <p className="onb-card-body">{v.mobileAiBody}</p>
        <div className="onb-scan-bar" aria-hidden="true" />
      </article>
      <div className="onb-card onb-chips" aria-label={v.sourceKicker}>
        {v.mobileSources.map((name) => (
          <span className="onb-chip" key={name} style={{ background: "var(--onb-subtle)", color: "var(--onb-text)" }}>
            {name}
          </span>
        ))}
      </div>
      <div className="onb-row">
        <span className="onb-row-left">{v.mobileResultLeft}</span>
        <span className="onb-row-right" style={{ color: "var(--onb-spark)" }}>
          {v.mobileResultRight}
        </span>
      </div>
    </div>
  );
}

function MatchDesktop() {
  const v = T.onboarding.visual.match;
  const attrs = v.attrs.map((left) => ({ left, right: v.attrState }));
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="match">
      <article className="onb-card">
        <p className="onb-kicker">{v.marketAKicker}</p>
        <h3 className="onb-card-title">{v.marketATitle}</h3>
        <p className="onb-card-body">{v.marketABody}</p>
        <Rows items={attrs} />
      </article>
      <Arrow />
      <article className="onb-card onb-card-ink onb-card-ai">
        <p className="onb-kicker">{v.aiKicker}</p>
        <h3 className="onb-card-title">{v.aiTitle}</h3>
        <p className="onb-card-body">{v.aiBody}</p>
        <div className="onb-chips">
          {v.attrs.map((attr) => (
            <span className="onb-chip" key={attr}>
              {attr}
            </span>
          ))}
        </div>
        <p className="onb-match">
          <span className="onb-match-ok" aria-hidden="true">
            ✓
          </span>
          {v.matchResult}
        </p>
      </article>
      <Arrow />
      <article className="onb-card">
        <p className="onb-kicker">{v.marketBKicker}</p>
        <h3 className="onb-card-title">{v.marketBTitle}</h3>
        <p className="onb-card-body">{v.marketBBody}</p>
        <Rows items={attrs} />
        <p className="onb-card-foot">{v.marketBFoot}</p>
      </article>
    </div>
  );
}

function MatchMobile() {
  const v = T.onboarding.visual.match;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="match-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.aiKicker}</p>
        <h3 className="onb-card-title">{v.aiTitle}</h3>
        <p className="onb-card-body">{v.aiBody}</p>
        <div className="onb-chips">
          {v.attrs.map((attr) => (
            <span className="onb-chip" key={attr}>
              {attr}
            </span>
          ))}
        </div>
        <p className="onb-match">
          <span className="onb-match-ok" aria-hidden="true">
            ✓
          </span>
          {v.matchResult}
        </p>
      </article>
      <div className="onb-row">
        <span className="onb-row-left">{v.marketAKicker}</span>
        <span className="onb-row-right">{v.marketATitle}</span>
      </div>
      <div className="onb-row">
        <span className="onb-row-left">{v.marketBKicker}</span>
        <span className="onb-row-right">{v.marketBTitle}</span>
      </div>
    </div>
  );
}

function MatchTablet() {
  const v = T.onboarding.visual.match;
  return (
    <div className="onb-canvas" data-story="match-tablet">
      <div className="onb-tablet-products">
        <article className="onb-card">
          <p className="onb-kicker">{v.marketAKicker}</p>
          <h3 className="onb-card-title">{v.marketATitle}</h3>
          <p className="onb-card-body">{v.tabletAttrs}</p>
        </article>
        <article className="onb-card onb-card-ink onb-tablet-ai">
          <span className="onb-tablet-spark" aria-hidden="true">
            ↯
          </span>
          <h3 className="onb-card-title">{v.tabletAiTitle}</h3>
          <p className="onb-card-body">{v.tabletAiState}</p>
        </article>
        <article className="onb-card">
          <p className="onb-kicker">{v.marketBKicker}</p>
          <h3 className="onb-card-title">{v.marketBTitle}</h3>
          <p className="onb-card-body">{v.marketBBody}</p>
        </article>
      </div>
      <div className="onb-tablet-criteria">
        <p className="onb-card-title">{v.tabletCriteria}</p>
        <div className="onb-chips">
          {v.attrs.map((attr) => (
            <span className="onb-chip" key={attr}>
              {attr}
            </span>
          ))}
        </div>
      </div>
      <div className="onb-match onb-tablet-result">
        <span className="onb-match-ok" aria-hidden="true">
          ✓
        </span>
        <div>
          <p className="onb-card-title">{v.tabletResult}</p>
          <p className="onb-card-body">{v.marketBFoot}</p>
        </div>
      </div>
    </div>
  );
}

function CalcDesktop() {
  const v = T.onboarding.visual.calc;
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="calc">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.principleKicker}</p>
        <h3 className="onb-card-title">{v.principleTitle}</h3>
        <p className="onb-card-body">{v.principleBody}</p>
        <div className="onb-chips">
          {v.inputs.map((item) => (
            <span className="onb-chip" key={item} style={{ width: "100%" }}>
              {item}
            </span>
          ))}
        </div>
        <p className="onb-card-foot">{v.principleFoot}</p>
      </article>
      <article className="onb-card onb-desktop-col-wide">
        <p className="onb-kicker">{v.engineKicker}</p>
        <h3 className="onb-card-title">{v.engineTitle}</h3>
        <p className="onb-card-body">{v.engineBody}</p>
        <div className="onb-stages">
          {v.stages.map((stage, i) => (
            <div
              className={i === v.stages.length - 1 ? "onb-stage onb-stage-ink" : "onb-stage"}
              key={stage.n}
            >
              <p className="onb-stage-n">{stage.n}</p>
              <p className="onb-stage-title">{stage.title}</p>
              <p className="onb-stage-state">{stage.state}</p>
            </div>
          ))}
        </div>
        <p className="onb-card-foot">{v.engineNote}</p>
      </article>
      <article className="onb-card">
        <p className="onb-kicker">{v.outKicker}</p>
        <h3 className="onb-card-title">{v.outTitle}</h3>
        <Rows items={v.outputs} />
        <p className="onb-card-foot">{v.outFoot}</p>
      </article>
    </div>
  );
}

function CalcMobile() {
  const v = T.onboarding.visual.calc;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="calc-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.engineKicker}</p>
        <h3 className="onb-card-title">{v.engineTitle}</h3>
        <p className="onb-card-body">{v.engineBody}</p>
      </article>
      <div className="onb-stages">
        {v.stages.map((stage, i) => (
          <div
            className={i === v.stages.length - 1 ? "onb-stage onb-stage-ink" : "onb-stage"}
            key={stage.n}
          >
            <p className="onb-stage-n">{stage.n}</p>
            <p className="onb-stage-title">{stage.title}</p>
            <p className="onb-stage-state">{stage.state}</p>
          </div>
        ))}
      </div>
      <Rows items={v.outputs} />
    </div>
  );
}

function ValidateDesktop() {
  const v = T.onboarding.visual.validate;
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="validate">
      <article className="onb-card onb-desktop-col-wide">
        <p className="onb-kicker">{v.listKicker}</p>
        <h3 className="onb-card-title">{v.listTitle}</h3>
        <p className="onb-card-body">{v.listBody}</p>
        {v.items.map((item) => (
          <div className="onb-validate-item" key={item.n}>
            <span className="onb-validate-n">{item.n}</span>
            <span className="onb-validate-title">{item.title}</span>
            <span className="onb-validate-detail">{item.detail}</span>
          </div>
        ))}
        <p className="onb-card-foot">{v.listFoot}</p>
      </article>
      <Arrow />
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.resultKicker}</p>
        <h3 className="onb-card-title">{v.resultTitle}</h3>
        <p className="onb-card-body">{v.resultBody}</p>
        <div className="onb-flow-stack">
          {v.flow.map((item, i) => (
            <div className="onb-flow-item" data-last={i === v.flow.length - 1} key={item}>
              {item}
            </div>
          ))}
        </div>
        <p className="onb-card-foot">{v.resultFoot}</p>
      </article>
    </div>
  );
}

function ValidateMobile() {
  const v = T.onboarding.visual.validate;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="validate-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.resultKicker}</p>
        <h3 className="onb-card-title">{v.resultTitle}</h3>
        <p className="onb-card-body">{v.resultBody}</p>
      </article>
      {v.items.map((item) => (
        <div className="onb-validate-item" key={item.n}>
          <span className="onb-validate-n">{item.n}</span>
          <span className="onb-validate-title">{item.title}</span>
          <span className="onb-validate-detail">{item.detail}</span>
        </div>
      ))}
    </div>
  );
}

function PrepareDesktop() {
  const v = T.onboarding.visual.prepare;
  return (
    <div className="onb-canvas onb-desktop-only" data-story="prepare">
      <p className="onb-card-foot" style={{ textAlign: "center" }}>
        {v.lead}
      </p>
      <div className="onb-desktop">
        <article className="onb-card">
          <div className="onb-fund">
            <span className="onb-fund-mark" aria-hidden="true">
              ₩
            </span>
            <div className="onb-fund-copy">
              <h3 className="onb-card-title">{v.krwTitle}</h3>
              <p className="onb-card-body">{v.krwBody}</p>
            </div>
          </div>
          <Rows items={v.krwRows} />
        </article>
        <article className="onb-card">
          <div className="onb-fund">
            <span className="onb-fund-mark" data-kind="usdt" aria-hidden="true">
              T
            </span>
            <div className="onb-fund-copy">
              <h3 className="onb-card-title">{v.usdtTitle}</h3>
              <p className="onb-card-body">{v.usdtBody}</p>
            </div>
          </div>
          <Rows items={v.usdtRows} />
        </article>
      </div>
      <div className="onb-timing">
        {v.timing.map((item, i) => (
          <span key={item}>
            <span className="onb-timing-n">{i + 1}</span> {item}
            {i < v.timing.length - 1 ? <span className="onb-timing-arrow"> → </span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrepareMobile() {
  const v = T.onboarding.visual.prepare;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="prepare-mobile">
      <article className="onb-card">
        <div className="onb-fund">
          <span className="onb-fund-mark" aria-hidden="true">
            ₩
          </span>
          <div className="onb-fund-copy">
            <h3 className="onb-card-title">{v.krwTitle}</h3>
            <p className="onb-card-body">{v.krwBody}</p>
          </div>
        </div>
      </article>
      <article className="onb-card">
        <div className="onb-fund">
          <span className="onb-fund-mark" data-kind="usdt" aria-hidden="true">
            T
          </span>
          <div className="onb-fund-copy">
            <h3 className="onb-card-title">{v.usdtTitle}</h3>
            <p className="onb-card-body">{v.usdtBody}</p>
          </div>
        </div>
      </article>
      <div className="onb-timing">
        {v.timing.map((item, i) => (
          <span key={item}>
            <span className="onb-timing-n">{i + 1}</span> {item}
            {i < v.timing.length - 1 ? <span className="onb-timing-arrow"> → </span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function DecideDesktop() {
  const v = T.onboarding.visual.decide;
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="decide">
      <article className="onb-card onb-desktop-col-wide">
        <p className="onb-kicker">{v.truthKicker}</p>
        <h3 className="onb-card-title">{v.truthTitle}</h3>
        <p className="onb-card-body">{v.truthBody}</p>
        {v.metrics.map((metric) => (
          <div className="onb-metric" data-emphasize={metric.emphasize} key={metric.left}>
            <span className="onb-metric-left">{metric.left}</span>
            <span className="onb-metric-right">{metric.right}</span>
          </div>
        ))}
        <p className="onb-card-foot">{v.truthFoot}</p>
      </article>
      <Arrow />
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.controlKicker}</p>
        <h3 className="onb-card-title">{v.controlTitle}</h3>
        {v.controlSteps.map((item, i) => (
          <div className="onb-control-step" key={item}>
            <span className="onb-control-n">{i + 1}</span>
            <span>{item}</span>
          </div>
        ))}
        <p className="onb-ready">{v.controlReady}</p>
      </article>
    </div>
  );
}

function DecideMobile() {
  const v = T.onboarding.visual.decide;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="decide-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.controlKicker}</p>
        <h3 className="onb-card-title">{v.controlTitle}</h3>
      </article>
      {v.metrics.map((metric) => (
        <div className="onb-metric" data-emphasize={metric.emphasize} key={metric.left}>
          <span className="onb-metric-left">{metric.left}</span>
          <span className="onb-metric-right">{metric.right}</span>
        </div>
      ))}
    </div>
  );
}

function RunDesktop() {
  const v = T.onboarding.visual.run;
  return (
    <div className="onb-canvas onb-desktop onb-desktop-only" data-story="run" style={{ background: "var(--onb-ink)" }}>
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.introKicker}</p>
        <h3 className="onb-card-title">{v.introTitle}</h3>
        <p className="onb-card-body">{v.introBody}</p>
        <div className="onb-time-truth">
          <p className="onb-card-body">{v.timeLabel}</p>
          <p className="onb-time-value">{v.timeValue}</p>
        </div>
        <p className="onb-card-foot">{v.uncertainty}</p>
      </article>
      <article className="onb-card onb-desktop-col-wide">
        <p className="onb-kicker">{v.flowKicker}</p>
        <h3 className="onb-card-title">{v.flowTitle}</h3>
        <p className="onb-card-body">{v.flowBody}</p>
        <div className="onb-stages onb-exec-stages">
          {v.stages.map((stage) => (
            <div
              className={stage.n === "3" ? "onb-stage onb-stage-ink" : "onb-stage"}
              key={stage.n}
            >
              <p className="onb-stage-n">{stage.n}</p>
              <p className="onb-stage-title">{stage.title}</p>
              <p className="onb-stage-state">{stage.state}</p>
            </div>
          ))}
        </div>
        <p className="onb-exec-note">{v.flowNote}</p>
      </article>
    </div>
  );
}

function RunMobile() {
  const v = T.onboarding.visual.run;
  return (
    <div className="onb-canvas onb-mobile-only" data-story="run-mobile">
      <article className="onb-card onb-card-ink">
        <p className="onb-kicker">{v.introKicker}</p>
        <div className="onb-run-mobile-stages">
          {v.stages.map((stage) => (
            <div
              className={stage.n === "3" ? "onb-run-m-stage onb-stage-ink" : "onb-run-m-stage"}
              key={stage.n}
            >
              <p className="onb-stage-n">{stage.n}</p>
              <p className="onb-stage-title">{stage.title}</p>
            </div>
          ))}
        </div>
        <p className="onb-card-foot">{v.flowNote}</p>
      </article>
      <div className="onb-time-truth">
        <p className="onb-time-value">
          {v.timeLabel} · {v.timeValue}
        </p>
        <p className="onb-card-body">{v.uncertainty}</p>
      </div>
    </div>
  );
}

const DESKTOP: Record<OnboardingStoryKey, () => ReactElement> = {
  tone: ExploreDesktop,
  identity: MatchDesktop,
  partner: CalcDesktop,
  demo: ValidateDesktop,
  usdt: PrepareDesktop,
  action: DecideDesktop,
  payout: RunDesktop,
};

const MOBILE: Record<OnboardingStoryKey, () => ReactElement> = {
  tone: ExploreMobile,
  identity: MatchMobile,
  partner: CalcMobile,
  demo: ValidateMobile,
  usdt: PrepareMobile,
  action: DecideMobile,
  payout: RunMobile,
};

const TABLET: Partial<Record<OnboardingStoryKey, () => ReactElement>> = {
  identity: MatchTablet,
};

export function OnboardingStoryVisual({ step }: Props) {
  const Desktop = DESKTOP[step];
  const Mobile = MOBILE[step];
  const Tablet = TABLET[step];
  return (
    <div className="onb-story" data-testid="onboarding-story-visual" data-step-visual={step}>
      <div className="onb-bp-desktop">
        <Desktop />
      </div>
      <div className="onb-bp-tablet">{Tablet ? <Tablet /> : <Mobile />}</div>
      <div className="onb-bp-mobile">
        <Mobile />
      </div>
    </div>
  );
}
