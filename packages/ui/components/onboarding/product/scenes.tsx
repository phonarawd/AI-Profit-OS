"use client";

import { useEffect, useState } from "react";
import { T } from "../../../copy/ko";
import { MoneyLine } from "./MoneyLine";
import type { OnboardingLesson } from "./lesson-types";
import { formatUsdtLine } from "./format-money";

function useReveal(total: number, gapMs: number, reduced: boolean) {
  const [shown, setShown] = useState(reduced ? total : 0);
  useEffect(() => {
    if (reduced) {
      setShown(total);
      return;
    }
    setShown(0);
    const ids: number[] = [];
    for (let i = 1; i <= total; i += 1) {
      ids.push(window.setTimeout(() => setShown(i), i * gapMs));
    }
    return () => {
      for (const id of ids) window.clearTimeout(id);
    };
  }, [total, gapMs, reduced]);
  return shown;
}

export function MarketSearchScene(props: {
  lesson: OnboardingLesson;
  reduced: boolean;
}) {
  const shown = useReveal(props.lesson.markets.length, 60, props.reduced);
  return (
    <div className="po-cards" data-testid="po-scene-search">
      {props.lesson.markets.map((m, i) => (
        <article key={m.id} className={`po-market ${shown > i ? "is-in" : ""}`}>
          <p>{m.name}</p>
          <p>{m.currency}</p>
          <p>{m.checkedAt.slice(11, 16)}</p>
        </article>
      ))}
    </div>
  );
}

export function IdentityMatchScene(props: {
  lesson: OnboardingLesson;
  reduced: boolean;
}) {
  const [on, setOn] = useState(props.reduced);
  useEffect(() => {
    if (props.reduced) {
      setOn(true);
      return;
    }
    const id = window.setTimeout(() => setOn(true), 80);
    return () => window.clearTimeout(id);
  }, [props.reduced]);
  const ev = props.lesson.matchEvidence;
  const C = T.productOnboarding.match;
  return (
    <div data-testid="po-scene-match">
      <div className={`po-match ${on ? "is-in" : ""}`}>
        <article className="po-match-card">A</article>
        <svg className="po-line" viewBox="0 0 56 36" aria-hidden>
          <path d="M2 18 H54" />
        </svg>
        <article className="po-match-card">B</article>
      </div>
      <div className="po-chips">
        <span className="po-chip">{C.model}: {ev.modelName === "pass" ? C.matched : C.hold}</span>
        <span className="po-chip">{C.condition}: {ev.condition === "pass" ? C.matched : C.hold}</span>
        <span className="po-chip">{C.identifier}: {ev.identifier === "pass" ? C.matched : C.hold}</span>
        <span className="po-chip">{C.saleTerms}: {ev.saleTerms === "pass" ? C.matched : C.hold}</span>
      </div>
    </div>
  );
}

export function MoneyWaterfallScene(props: {
  lesson: OnboardingLesson;
  reduced: boolean;
}) {
  const w = props.lesson.waterfall;
  const rows = [
    { key: "sell", label: T.productOnboarding.calc.sell, usdt: w.sellExpectedUsdt },
    { key: "buy", label: T.productOnboarding.calc.buy, usdt: w.buyUsdt },
    { key: "fee", label: T.productOnboarding.calc.fee, usdt: w.feeUsdt },
    { key: "ship", label: T.productOnboarding.calc.shipping, usdt: w.shippingUsdt },
    { key: "fx", label: T.productOnboarding.calc.fx, usdt: w.fxCostUsdt },
    { key: "sum", label: T.productOnboarding.calc.expected, usdt: w.expectedProfitUsdt, sum: true },
  ];
  const shown = useReveal(rows.length, 110, props.reduced);
  return (
    <div className="po-fall" data-testid="po-scene-calc">
      {rows.map((row, i) => {
        const money = formatUsdtLine(row.usdt, Boolean(row.sum));
        return (
          <div
            key={row.key}
            className={`po-fall-row ${shown > i ? "is-in" : ""} ${row.sum ? "is-sum" : ""}`}
          >
            <span>{row.label}</span>
            <span>{money.state === "ready" ? `${money.text} ${T.productOnboarding.usdtUnit}` : T.productOnboarding.unavailable}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VerificationScene(props: {
  lesson: OnboardingLesson;
  reduced: boolean;
}) {
  const items = props.lesson.verification;
  const shown = useReveal(items.length, 120, props.reduced);
  const labels: Record<string, string> = {
    freshness: T.productOnboarding.verify.freshness,
    identity: T.productOnboarding.verify.identity,
    costComplete: T.productOnboarding.verify.costComplete,
    policy: T.productOnboarding.verify.policy,
  };
  const allPass = items.every((x) => x.status === "pass");
  return (
    <div data-testid="po-scene-verify">
      <div className="po-checks">
        {items.map((item, i) => (
          <div key={item.id} className={`po-check ${shown > i ? "is-in" : ""}`}>
            <span>{shown > i ? "OK" : "..."}</span>
            <span>{labels[item.id] ?? item.id}</span>
          </div>
        ))}
      </div>
      {allPass && shown >= items.length ? (
        <div className="po-spark is-on" aria-hidden data-testid="po-verify-spark">
          ✓
        </div>
      ) : null}
      {!allPass ? <p>{T.productOnboarding.verify.holdReason}</p> : null}
    </div>
  );
}

export function CapitalReadinessScene(props: {
  lesson: OnboardingLesson;
  reduced: boolean;
}) {
  const c = props.lesson.capital;
  const [fill, setFill] = useState(props.reduced);
  useEffect(() => {
    if (props.reduced) {
      setFill(true);
      return;
    }
    const id = window.setTimeout(() => setFill(true), 80);
    return () => window.clearTimeout(id);
  }, [props.reduced]);
  return (
    <div data-testid="po-scene-capital">
      <MoneyLine
        testId="po-required-capital"
        label={T.productOnboarding.requiredLabel}
        usdt={c.requiredCapitalUsdt}
        krw={c.requiredCapitalKrwApprox}
        tone="principal"
      />
      <MoneyLine
        testId="po-available"
        label={T.productOnboarding.availableLabel}
        usdt={c.availableUsdt}
      />
      <MoneyLine
        testId="po-shortfall"
        label={T.productOnboarding.shortfallLabel}
        usdt={c.shortfallUsdt}
      />
      <div className="po-bar" aria-hidden>
        <div className={`po-bar-fill ${fill ? "is-on" : ""}`} />
      </div>
      <p>{T.productOnboarding.noDepositNow}</p>
    </div>
  );
}

export function DecisionPracticeCard(props: {
  lesson: OnboardingLesson;
  pressed: boolean;
}) {
  const c = props.lesson.capital;
  return (
    <article
      className={`po-decision ${props.pressed ? "is-press" : ""}`}
      data-testid="po-scene-decision"
    >
      <MoneyLine
        testId="po-decision-capital"
        label={T.productOnboarding.requiredLabel}
        usdt={c.requiredCapitalUsdt}
        krw={c.requiredCapitalKrwApprox}
      />
      <MoneyLine
        testId="po-decision-expected"
        label={T.productOnboarding.expectedLabel}
        usdt={c.expectedProfitUsdt}
        krw={c.expectedProfitKrwApprox}
        hint={T.productOnboarding.expectedNotSettled}
        tone="expected"
        signed
      />
      <p>
        {T.productOnboarding.decision.duration}: {T.productOnboarding.decision.durationValue}
      </p>
      <p>
        {T.productOnboarding.decision.checkedAt}: {props.lesson.asOf}
      </p>
    </article>
  );
}

export function SettlementTimeline(props: { lesson: OnboardingLesson }) {
  const s = props.lesson.settlement;
  const C = T.productOnboarding.settle;
  return (
    <div className="po-split" data-testid="po-scene-settle">
      <section className="po-path">
        <h2>{C.successTitle}</h2>
        <ol>
          <li>{C.lock}</li>
          <li>{C.successConfirm}</li>
          <li>{C.successCredit}</li>
        </ol>
        <MoneyLine
          testId="po-success-principal"
          label={T.productOnboarding.requiredLabel}
          usdt={s.success.principalUsdt}
        />
        <MoneyLine
          testId="po-success-settled"
          label={T.productOnboarding.settledLabel}
          usdt={s.success.settledProfitUsdt}
          tone="settled"
          signed
        />
      </section>
      <section className="po-path">
        <h2>{C.stopTitle}</h2>
        <ol>
          <li>{C.lock}</li>
          <li>{C.stopConfirm}</li>
          <li>{C.stopCredit}</li>
        </ol>
        <MoneyLine
          testId="po-stop-principal"
          label={T.productOnboarding.requiredLabel}
          usdt={s.safeStop.principalUsdt}
        />
        <MoneyLine
          testId="po-stop-settled"
          label={T.productOnboarding.settledLabel}
          usdt={s.safeStop.settledProfitUsdt}
          tone="settled"
        />
      </section>
    </div>
  );
}
