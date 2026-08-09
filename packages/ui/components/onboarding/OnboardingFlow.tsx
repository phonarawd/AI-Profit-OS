"use client";

import { useEffect, useState } from "react";
import { applyFontScale } from "../../tokens/font-scale";
import { T } from "../../copy/ko";
import { BrandMark } from "../brand/BrandMark";
import { Badge } from "../lux/Badge";
import { MotionCTA } from "../lux/MotionCTA";
import { TouchButton } from "../lux/TouchButton";
import { DemoWalletBanner } from "../wallet/DemoWalletBanner";
import { MarketPartnerTrustStrip } from "../trust/MarketPartnerTrustStrip";

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

  function skipIfAllowed() {
    if (SKIPPABLE.includes(step)) goNext();
  }

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    window.location.href = "/";
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
            className="text-center text-xs text-lux-text-muted"
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
          <p className="text-center text-sm text-lux-text-muted">
            {toneCopy.identityBody}
          </p>
          <div
            data-testid="compare-mini"
            className="rounded-lux-md border border-lux-border bg-lux-surface px-4 py-3 text-center text-sm"
          >
            {T.margin.compareMiniUtility}
          </div>
          <p className="text-center text-xs text-lux-text-muted">
            {T.landing.utilityDisclaimer}
          </p>
          <p className="text-center text-sm">{toneCopy.tip}</p>
          <p
            className="text-center text-sm font-medium text-lux-text"
            data-testid="onboarding-objection-slide"
          >
            {T.objections.onboardingSlide}
          </p>
          {"nextConfirm" in toneCopy && toneCopy.nextConfirm ? (
            <p className="text-center text-xs text-lux-text-muted">
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
          <p className="text-center text-sm text-lux-text-muted">
            {T.onboarding.demoHint}
          </p>
          {/* Guest utility — amount/USDT ticker 0 (§6.4c.1 F) */}
          <DemoWalletBanner visible />
          <button
            type="button"
            data-testid="demo-opportunity-card"
            data-flags="demo,practice_only"
            className="w-full rounded-lux-md border border-lux-border bg-lux-elevated p-4 text-left"
            onClick={() => setDemoOpen(true)}
          >
            <div className="mb-2 flex items-center gap-2">
              <Badge>{T.practice.badge}</Badge>
              <span className="text-xs text-lux-text-muted">
                {T.practice.notWithdrawable}
              </span>
            </div>
            <p className="text-sm text-lux-text-muted">
              {T.margin.compareMiniUtility}
            </p>
            <p className="mt-2 text-lg font-semibold text-lux-text">
              {T.onboarding.demoPriceExample}
            </p>
            <p className="mt-3 text-sm font-medium text-lux-principal">
              {T.onboarding.tryDemoCard}
            </p>
          </button>
          {demoOpen ? (
            <aside
              data-testid="demo-preview"
              className="rounded-lux-md border border-lux-accent/40 bg-lux-surface px-4 py-3"
              role="status"
            >
              <p className="font-medium">{T.onboarding.demoPreviewTitle}</p>
              <p className="mt-1 text-sm text-lux-text-muted">
                {T.onboarding.demoPreviewBody}
              </p>
            </aside>
          ) : null}
          <TouchButton
            variant="primary"
            className="w-full"
            data-testid="onboarding-next"
            disabled={!demoOpen}
            onClick={goNext}
          >
            {T.onboarding.next}
          </TouchButton>
        </section>
      ) : null}

      {step === "usdt" ? (
        <section data-testid="onboarding-usdt" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.usdtHeadline}
          </h1>
          <p className="text-center text-sm text-lux-text-muted">
            {T.onboarding.usdtBody}
          </p>
          <p
            className="text-center text-sm text-lux-text"
            data-testid="onboarding-objection-slide"
          >
            {T.objections.onboardingSlide}
          </p>
          <a
            href="/me/guide/usdt"
            className="block text-center text-sm text-lux-principal underline-offset-2 hover:underline"
          >
            {T.onboarding.usdtWhyLink}
          </a>
          <a
            href="/me/guide/get-usdt"
            className="block text-center text-sm text-lux-text-muted underline-offset-2 hover:underline"
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
        </section>
      ) : null}

      {step === "payout" ? (
        <section data-testid="onboarding-payout" className="space-y-4">
          <h1 className="text-center text-xl font-semibold">
            {T.onboarding.payoutHeadline}
          </h1>
          <p className="text-center text-sm text-lux-text-muted">
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
            href="/wallet/deposit"
            className="block text-center text-sm text-lux-principal underline-offset-2 hover:underline"
          >
            {T.onboarding.payoutDepositLink}
          </a>
        </section>
      ) : null}
    </main>
  );
}
