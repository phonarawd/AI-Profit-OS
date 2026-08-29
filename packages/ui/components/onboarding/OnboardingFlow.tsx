"use client";

import { useEffect, useState } from "react";
import { applyFontScale } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { MotionCTA } from "../../primitives/PrimaryCta";
import { TouchButton } from "../../primitives/Button";
import { DemoWalletBanner } from "../wallet/DemoWalletBanner";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";
import { BuyingPowerMeter } from "./BuyingPowerMeter";
import { MarketDiffDemo } from "./MarketDiffDemo";
import { MatchConfidenceCard } from "./MatchConfidenceCard";
import { OpportunityDemoCard } from "./OpportunityDemoCard";
import "./onboarding-motion.css";

export type ToneBand = "young" | "mid" | "senior";

type Step =
  | "tone"
  | "identity"
  | "partner"
  | "demo"
  | "usdt"
  | "action"
  | "payout";

const STEPS: Step[] = [
  "tone",
  "identity",
  "partner",
  "demo",
  "usdt",
  "action",
  "payout",
];

const STORAGE_KEY = "peotteok_onboarding_step";
const TONE_KEY = "peotteok_tone_band";

/** Skip allowed = USDT only (§6.4) */
const SKIPPABLE: Step[] = ["usdt"];

/**
 * §6.4 experiential onboarding — identity · partner strip · demo · practice
 * Canon: onboarding-identity · onboarding-demo-card
 * v7.22.55 Guest utility — capital CTA 0 · USDT/테더 카드 마운트 0
 */
export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("tone");
  const [tone, setTone] = useState<ToneBand>("mid");
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Step | null;
      const savedTone = localStorage.getItem(TONE_KEY) as ToneBand | null;
      if (savedTone && ["young", "mid", "senior"].includes(savedTone)) {
        setTone(savedTone);
        if (savedTone === "senior") applyFontScale("lg");
      }
      if (saved && STEPS.includes(saved)) setStep(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function persist(next: Step, nextTone?: ToneBand) {
    setStep(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      if (nextTone) localStorage.setItem(TONE_KEY, nextTone);
    } catch {
      /* ignore */
    }
  }

  function pickTone(band: ToneBand) {
    setTone(band);
    if (band === "senior") applyFontScale("lg");
    else applyFontScale("md");
    persist("identity", band);
  }

  function goNext() {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) persist(STEPS[i + 1]!);
  }

  function goBack() {
    const i = STEPS.indexOf(step);
    if (i > 0) persist(STEPS[i - 1]!);
  }

  function skipIfAllowed() {
    if (SKIPPABLE.includes(step)) goNext();
  }

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    window.location.href = "/auth/signup?from=onboarding";
  }

  const toneCopy = T.onboarding[tone];

  return (
    <main
      data-testid="onboarding-flow"
      data-step={step}
      data-tone-band={tone}
      className="flex flex-1 flex-col gap-6"
    >
      {step === "tone" ? (
        <section data-testid="onboarding-tone" className="space-y-4">
          <BrandMark size="hero" />
          <p
            className="text-center text-xs text-pd-text-muted"
            data-testid="onboarding-transition-disclosure"
          >
            {T.landing.transitionDisclosure}
          </p>
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.tonePickTitle}
          </h1>
          <div className="flex flex-col gap-3">
            <TouchButton
              variant="primary"
              className="w-full"
              data-testid="tone-young"
              onClick={() => pickTone("young")}
            >
              {T.onboarding.toneYoung}
            </TouchButton>
            <TouchButton
              variant="secondary"
              className="w-full"
              data-testid="tone-mid"
              onClick={() => pickTone("mid")}
            >
              {T.onboarding.toneMid}
            </TouchButton>
            <TouchButton
              variant="secondary"
              className="w-full"
              data-testid="tone-senior"
              onClick={() => pickTone("senior")}
            >
              {T.onboarding.toneSenior}
            </TouchButton>
          </div>
        </section>
      ) : null}

      {step === "identity" ? (
        <section
          data-testid="onboarding-identity"
          data-canon="onboarding-identity"
          className="space-y-4"
        >
          <BrandMark size="hero" />
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.identityHeadline}
          </h1>
          <p className="text-center text-sm text-pd-text-muted">
            {toneCopy.identityBody}
          </p>
          <MarketDiffDemo />
          <div
            data-testid="compare-mini"
            className="rounded-pd-md border border-pd-border bg-pd-surface px-4 py-3 text-center text-sm"
          >
            {T.margin.compareMiniUtility}
          </div>
          <p className="text-center text-xs text-pd-text-muted">
            {T.landing.utilityDisclaimer}
          </p>
          <p className="text-center text-sm">{toneCopy.tip}</p>
          <p
            className="text-center text-sm font-medium text-pd-text"
            data-testid="onboarding-objection-slide"
          >
            {T.objections.onboardingSlide}
          </p>
          {"nextConfirm" in toneCopy && toneCopy.nextConfirm ? (
            <p className="text-center text-xs text-pd-text-muted">
              {toneCopy.nextConfirm}
            </p>
          ) : null}
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-next"
            onClick={goNext}
          >
            {T.onboarding.next}
          </TouchButton>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-back"
            onClick={goBack}
          >
            {T.onboarding.back}
          </TouchButton>
        </section>
      ) : null}

      {step === "partner" ? (
        <section data-testid="onboarding-partner-slide" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.partnerSlideLead}
          </h1>
          <MarketPartnerTrustStrip tier="A" />
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-next"
            onClick={goNext}
          >
            {T.onboarding.next}
          </TouchButton>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-back"
            onClick={goBack}
          >
            {T.onboarding.back}
          </TouchButton>
        </section>
      ) : null}

      {step === "demo" ? (
        <section
          data-testid="onboarding-demo"
          data-canon="onboarding-demo-card"
          className="space-y-4"
        >
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.demoHeadline}
          </h1>
          <p className="text-center text-sm text-pd-text-muted">
            {T.onboarding.demoHint}
          </p>
          <p className="text-center text-xs text-pd-text-muted">
            {T.onboarding.demoPriceExample}
          </p>
          {/* Guest utility — amount/USDT ticker 0 · practice_only */}
          <DemoWalletBanner visible />
          <MatchConfidenceCard />
          <BuyingPowerMeter />
          <OpportunityDemoCard
            open={demoOpen}
            onOpen={() => setDemoOpen(true)}
          />
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-next"
            disabled={!demoOpen}
            onClick={goNext}
          >
            {T.onboarding.next}
          </TouchButton>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-back"
            onClick={goBack}
          >
            {T.onboarding.back}
          </TouchButton>
        </section>
      ) : null}

      {step === "usdt" ? (
        <section data-testid="onboarding-usdt" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.usdtHeadline}
          </h1>
          <p className="text-center text-sm text-pd-text-muted">
            {T.onboarding.usdtBody}
          </p>
          <p
            className="text-center text-sm text-pd-text"
            data-testid="onboarding-objection-slide"
          >
            {T.objections.onboardingSlide}
          </p>
          <a
            href="/me/guide/usdt"
            className="block text-center text-sm text-pd-principal underline-offset-2 hover:underline"
          >
            {T.onboarding.usdtWhyLink}
          </a>
          <a
            href="/me/guide/get-usdt"
            className="block text-center text-sm text-pd-text-muted underline-offset-2 hover:underline"
          >
            {T.onboarding.usdtNoTether}
          </a>
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-next"
            onClick={goNext}
          >
            {T.onboarding.next}
          </TouchButton>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-skip"
            onClick={skipIfAllowed}
          >
            {T.onboarding.skip}
          </TouchButton>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-back"
            onClick={goBack}
          >
            {T.onboarding.back}
          </TouchButton>
        </section>
      ) : null}

      {step === "action" ? (
        <section data-testid="onboarding-action" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.actionHeadline}
          </h1>
          <MotionCTA
            className="w-full"
            data-testid="onboarding-cta-utility"
            onClick={goNext}
          >
            {T.landing.ctaStartUtility}
          </MotionCTA>
          <TouchButton
            variant="ghost"
            className="w-full"
            data-testid="onboarding-back"
            onClick={goBack}
          >
            {T.onboarding.back}
          </TouchButton>
        </section>
      ) : null}

      {step === "payout" ? (
        <section data-testid="onboarding-payout" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.payoutHeadline}
          </h1>
          <p className="text-center text-sm text-pd-text-muted">
            {T.onboarding.payoutBody}
          </p>
          {/* Guest utility — amount/USDT ticker 0 (§6.4c.1 F) */}
          <DemoWalletBanner visible />
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-start"
            onClick={finish}
          >
            {T.onboarding.startApp}
          </TouchButton>
          <a
            href="/"
            className="block text-center text-sm text-pd-principal underline-offset-2 hover:underline"
            data-testid="onboarding-continue-real"
          >
            {T.onboarding.continueReal}
          </a>
        </section>
      ) : null}
    </main>
  );
}
