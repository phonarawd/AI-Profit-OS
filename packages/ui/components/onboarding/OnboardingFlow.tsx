"use client";

import { useEffect, useRef, useState } from "react";
import { T } from "../../copy/ko";
import { applyFontScale } from "../../tokens/font-scale";
import { OnboardingShell } from "./OnboardingShell";
import {
  bindProductOnboarding,
  finishProductOnboarding,
  persistProductOnboarding,
  type ProductOnboardingView,
} from "./product/bind-client";
import { FALLBACK_LESSON, type OnboardingLesson } from "./product/lesson-types";
import {
  CapitalReadinessScene,
  DecisionPracticeCard,
  IdentityMatchScene,
  MarketSearchScene,
  MoneyWaterfallScene,
  SettlementTimeline,
  VerificationScene,
} from "./product/scenes";
import "./product-onboarding-motion.css";

export type ToneBand = "young" | "mid" | "senior";

const TOTAL = 7;
const CACHE_KEY = "peotteok_product_onboarding_v1";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function stepCopy(step: number, easy: boolean) {
  const C = T.productOnboarding;
  const block =
    step === 1
      ? C.search
      : step === 2
        ? C.match
        : step === 3
          ? C.calc
          : step === 4
            ? C.verify
            : step === 5
              ? C.capital
              : step === 6
                ? C.decision
                : C.settle;
  return {
    title: block.title,
    body: easy && "easyBody" in block ? block.easyBody : block.body,
  };
}

function readCache(): { step: number; largeType: boolean; easyExplain: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as {
      step?: unknown;
      largeType?: unknown;
      easyExplain?: unknown;
    };
    if (typeof o.step !== "number" || o.step < 1 || o.step > 7) return null;
    return {
      step: o.step,
      largeType: o.largeType === true,
      easyExplain: o.easyExplain === true,
    };
  } catch {
    return null;
  }
}

function writeCache(step: number, largeType: boolean, easyExplain: boolean) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ step, largeType, easyExplain }));
  } catch {
    /* ignore */
  }
}

export function OnboardingFlow() {
  const reduced = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(1);
  const [largeType, setLargeType] = useState(false);
  const [easyExplain, setEasyExplain] = useState(false);
  const [lesson, setLesson] = useState<OnboardingLesson | null>(FALLBACK_LESSON);
  const [confirm, setConfirm] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setStep(cached.step);
      setLargeType(cached.largeType);
      setEasyExplain(cached.easyExplain);
      if (cached.largeType) applyFontScale("lg");
    }
    let cancelled = false;
    void bindProductOnboarding({
      onUnauthorized: () => {
        if (!cancelled) window.location.href = "/auth/login?next=/onboarding";
      },
      onView: (view) => {
        if (!cancelled) applyView(view);
      },
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function applyView(view: ProductOnboardingView) {
    if (view.completedAt) {
      window.location.href = "/";
      return;
    }
    setLesson(view.lesson);
    setStep(view.currentStep);
    setLargeType(view.preferences.largeType);
    setEasyExplain(view.preferences.easyExplain);
    applyFontScale(view.preferences.largeType ? "lg" : "md");
    writeCache(view.currentStep, view.preferences.largeType, view.preferences.easyExplain);
  }

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function persist(nextStep: number, prefs?: { largeType: boolean; easyExplain: boolean }) {
    const nextPrefs = prefs ?? { largeType, easyExplain };
    setStep(nextStep);
    writeCache(nextStep, nextPrefs.largeType, nextPrefs.easyExplain);
    void persistProductOnboarding({
      currentStep: nextStep,
      preferences: nextPrefs,
    });
  }

  function toggleLarge() {
    const next = !largeType;
    setLargeType(next);
    applyFontScale(next ? "lg" : "md");
    persist(step, { largeType: next, easyExplain });
  }

  function toggleEasy() {
    const next = !easyExplain;
    setEasyExplain(next);
    persist(step, { largeType, easyExplain: next });
  }

  function goNext() {
    if (step === 6 && !confirm) {
      setPressed(true);
      window.setTimeout(() => setPressed(false), 160);
      setConfirm(true);
      return;
    }
    if (step < TOTAL) persist(step + 1);
  }

  function goBack() {
    setConfirm(false);
    if (step > 1) persist(step - 1);
  }

  async function finish() {
    await finishProductOnboarding();
    writeCache(7, largeType, easyExplain);
    window.location.href = "/";
  }

  const copy = stepCopy(step, easyExplain);
  const data = lesson;

  return (
    <main data-testid="onboarding-flow" data-step={step}>
      <OnboardingShell
        step={step}
        total={TOTAL}
        largeType={largeType}
        easyExplain={easyExplain}
        onToggleLargeType={toggleLarge}
        onToggleEasy={toggleEasy}
        brand={T.brand.consumer}
        actions={
          <>
            {step < 7 ? (
              <button
                type="button"
                className="po-cta"
                data-testid="onboarding-next"
                onClick={goNext}
              >
                {step === 6 ? T.productOnboarding.practiceCta : T.productOnboarding.next}
              </button>
            ) : (
              <button
                type="button"
                className="po-cta"
                data-testid="onboarding-start"
                onClick={() => void finish()}
              >
                {T.productOnboarding.startApp}
              </button>
            )}
            {step > 1 ? (
              <button
                type="button"
                className="po-ghost"
                data-testid="onboarding-back"
                onClick={goBack}
              >
                {T.productOnboarding.back}
              </button>
            ) : null}
            {step === 6 ? (
              <button
                type="button"
                className="po-ghost"
                data-testid="onboarding-later"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                {T.productOnboarding.later}
              </button>
            ) : null}
          </>
        }
      >
        <div className="po-layout">
          <section className="po-visual" aria-hidden={!data}>
            {data && step === 1 ? <MarketSearchScene lesson={data} reduced={reduced} /> : null}
            {data && step === 2 ? <IdentityMatchScene lesson={data} reduced={reduced} /> : null}
            {data && step === 3 ? <MoneyWaterfallScene lesson={data} reduced={reduced} /> : null}
            {data && step === 4 ? <VerificationScene lesson={data} reduced={reduced} /> : null}
            {data && step === 5 ? <CapitalReadinessScene lesson={data} reduced={reduced} /> : null}
            {data && step === 6 ? (
              <DecisionPracticeCard lesson={data} pressed={pressed} />
            ) : null}
            {data && step === 7 ? <SettlementTimeline lesson={data} /> : null}
          </section>
          <section className="po-copy">
            <p className="po-badge">{T.productOnboarding.virtualBadge}</p>
            <h1 ref={headingRef} tabIndex={-1}>
              {copy.title}
            </h1>
            <p>{copy.body}</p>
            {step === 6 || step === 7 ? (
              <p data-testid="onboarding-objection-slide">
                {T.objections.onboardingSlide}
              </p>
            ) : null}
            {step === 7 ? <p>{T.productOnboarding.closing}</p> : null}
          </section>
        </div>
      </OnboardingShell>
      {confirm ? (
        <div className="po-sheet" role="dialog" aria-modal="true">
          <div className="po-sheet-card">
            <p>{T.productOnboarding.confirmPractice}</p>
            <button
              type="button"
              className="po-cta"
              data-testid="po-confirm-yes"
              onClick={() => {
                setConfirm(false);
                persist(7);
              }}
            >
              {T.productOnboarding.confirmYes}
            </button>
            <button
              type="button"
              className="po-ghost"
              onClick={() => setConfirm(false)}
            >
              {T.productOnboarding.back}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
