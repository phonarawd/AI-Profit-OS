"use client";

import { useEffect, useId, useState } from "react";
import { T } from "../../copy/ko";
import type { OnboardingStoryKey } from "../../copy/ko/onboarding";
import { OnboardingStoryVisual } from "./OnboardingStoryVisual";
import {
  decideOnboardingGate,
  readExperienceFromSession,
} from "./onboarding-experience-gate";
import "./onboarding-automation.css";

export type ToneBand = "young" | "mid" | "senior";

type Step = OnboardingStoryKey;

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
const SKIPPABLE: Step[] = ["usdt"];

function storyOf(step: Step) {
  return T.onboarding.story[step];
}

async function resolveGate(signal: AbortSignal): Promise<"show" | "bypass" | "unknown"> {
  let res: Response;
  try {
    res = await fetch("/api/v1/auth/session", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return "unknown";
  }
  if (res.status === 401 || res.status === 404) {
    return decideOnboardingGate(null, "guest");
  }
  if (res.status >= 500 || !res.ok) return "unknown";
  try {
    const raw: unknown = await res.json();
    return decideOnboardingGate(readExperienceFromSession(raw), "ok");
  } catch {
    return "unknown";
  }
}

async function persistCompletion(): Promise<void> {
  const res = await fetch("/api/v1/auth/onboarding/complete", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (res.status === 401) return;
  if (!res.ok) throw new Error("onboarding_complete_failed");
}

export function OnboardingFlow() {
  const railId = useId();
  const [gate, setGate] = useState<"resolving" | "show" | "unknown">("resolving");
  const [step, setStep] = useState<Step>("tone");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    void resolveGate(ac.signal)
      .then((decision) => {
        if (decision === "bypass") {
          window.location.replace("/");
          return;
        }
        setGate(decision === "unknown" ? "unknown" : "show");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setGate("unknown");
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (gate !== "show") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && STEPS.includes(saved as Step)) setStep(saved as Step);
    } catch {
      /* resume optional */
    }
    setReady(true);
  }, [gate]);

  function persist(next: Step) {
    setStep(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
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

  async function finish() {
    setSubmitting(true);
    try {
      await persistCompletion();
    } catch {
      /* 완료 persist 실패해도 교육 종료는 진행. 우회는 서버 진실만. */
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    window.location.assign("/");
  }

  const copy = storyOf(step);
  const index = STEPS.indexOf(step);
  const showBack = index > 0 && step !== "payout";
  const showSkip = SKIPPABLE.includes(step);

  if (gate === "resolving") {
    return (
      <main className="onb" data-testid="onboarding-flow" data-gate="resolving">
        <header className="onb-header">
          <p className="onb-brand">
            {T.onboarding.brand}
            <span className="onb-brand-spark" aria-hidden="true">
              ↯
            </span>
          </p>
        </header>
        <div className="onb-resolving">
          <h1 className="onb-title">{T.onboarding.resolving}</h1>
          <p className="onb-lead">{T.onboarding.resolvingHint}</p>
        </div>
      </main>
    );
  }

  if (gate === "unknown") {
    return (
      <main className="onb" data-testid="onboarding-flow" data-gate="unknown">
        <header className="onb-header">
          <p className="onb-brand">
            {T.onboarding.brand}
            <span className="onb-brand-spark" aria-hidden="true">
              ↯
            </span>
          </p>
        </header>
        <div className="onb-resolving">
          <h1 className="onb-title">{T.onboarding.resolving}</h1>
          <p className="onb-lead">{T.onboarding.resolvingHint}</p>
          <button
            type="button"
            className="onb-btn onb-btn-primary"
            data-testid="onboarding-gate-retry"
            onClick={() => {
              setGate("resolving");
              void resolveGate(new AbortController().signal).then((decision) => {
                if (decision === "bypass") {
                  window.location.replace("/");
                  return;
                }
                setGate(decision === "unknown" ? "unknown" : "show");
              });
            }}
          >
            {T.onboarding.retry}
          </button>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="onb" data-testid="onboarding-flow" data-gate="resume">
        <header className="onb-header">
          <p className="onb-brand">
            {T.onboarding.brand}
            <span className="onb-brand-spark" aria-hidden="true">
              ↯
            </span>
          </p>
        </header>
      </main>
    );
  }

  return (
    <main
      className="onb"
      data-testid="onboarding-flow"
      data-step={step}
      data-story={copy.label}
      data-gate="show"
    >
      <header className="onb-header">
        <p className="onb-brand">
          {T.onboarding.brand}
          <span className="onb-brand-spark" aria-hidden="true">
            ↯
          </span>
        </p>
        <p className="onb-header-step">{copy.label}</p>
      </header>

      <div className="onb-body">
        <nav aria-labelledby={railId}>
          <p id={railId} className="sr-only">
            {T.onboarding.stepRailLabel} {copy.n} / {STEPS.length} {copy.label}
          </p>
          <ol className="onb-rail">
            {STEPS.map((key) => {
              const item = storyOf(key);
              const current = key === step;
              return (
                <li
                  key={key}
                  className="onb-rail-item"
                  data-current={current}
                  aria-current={current ? "step" : undefined}
                >
                  <span className="onb-rail-compact">
                    {current ? item.label : String(item.n)}
                  </span>
                  <span className="onb-rail-full">
                    {item.n} {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="onb-copy">
          <h1 className="onb-title">
            {"titleMobile" in copy && copy.titleMobile ? (
              <>
                <span className="onb-mobile-only">{copy.titleMobile}</span>
                <span className="onb-desktop-only">{copy.title}</span>
              </>
            ) : (
              copy.title
            )}
          </h1>
          <p className="onb-lead">
            {"bodyMobile" in copy && copy.bodyMobile ? (
              <>
                <span className="onb-mobile-only">{copy.bodyMobile}</span>
                <span className="onb-desktop-only">{copy.body}</span>
              </>
            ) : (
              copy.body
            )}
          </p>
        </div>

        <OnboardingStoryVisual step={step} />

        <p className="onb-caption">
          {"captionMobile" in copy && copy.captionMobile ? (
            <>
              <span className="onb-mobile-only">{copy.captionMobile}</span>
              <span className="onb-desktop-only">{copy.caption}</span>
            </>
          ) : (
            copy.caption
          )}
        </p>
      </div>

      <div className="onb-footer">
        <div className="onb-actions">
          {step === "payout" ? (
            <button
              type="button"
              className="onb-btn onb-btn-primary"
              data-testid="onboarding-start"
              disabled={submitting}
              onClick={() => void finish()}
            >
              {copy.next}
            </button>
          ) : (
            <button
              type="button"
              className="onb-btn onb-btn-primary"
              data-testid="onboarding-next"
              onClick={goNext}
            >
              {copy.next}
            </button>
          )}
          {showSkip ? (
            <button
              type="button"
              className="onb-btn onb-btn-secondary"
              data-testid="onboarding-skip"
              onClick={skipIfAllowed}
            >
              {T.onboarding.skip}
            </button>
          ) : null}
          {showBack ? (
            <button
              type="button"
              className="onb-btn onb-btn-secondary"
              data-testid="onboarding-back"
              onClick={goBack}
            >
              {T.onboarding.back}
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
