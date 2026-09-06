import type { ReactNode } from "react";
import { T } from "../../copy/ko";

export function OnboardingShell(props: {
  step: number;
  total: number;
  largeType: boolean;
  easyExplain: boolean;
  onToggleLargeType: () => void;
  onToggleEasy: () => void;
  brand: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const label = T.productOnboarding.progressLabel
    .replace("{current}", String(props.step))
    .replace("{total}", String(props.total));
  return (
    <div className="po-shell" data-testid="onboarding-shell" data-step={props.step}>
      <header className="po-mast">
        <div className="po-mast-row">
          <p className="po-brand">{props.brand}</p>
          <div className="po-a11y">
            <button
              type="button"
              aria-pressed={props.largeType}
              data-testid="po-large-type"
              onClick={props.onToggleLargeType}
            >
              {T.productOnboarding.largeType}
            </button>
            <button
              type="button"
              aria-pressed={props.easyExplain}
              data-testid="po-easy-explain"
              onClick={props.onToggleEasy}
            >
              {T.productOnboarding.easyExplain}
            </button>
          </div>
        </div>
        <div className="po-segments" aria-hidden>
          {Array.from({ length: props.total }, (_, i) => (
            <span key={i} className={`po-seg ${i < props.step ? "is-on" : ""}`} />
          ))}
        </div>
        <p
          className="po-progress-sr"
          role="status"
          aria-live="polite"
          data-testid="onboarding-progress"
        >
          {label}
        </p>
      </header>
      <div className="po-body">{props.children}</div>
      <div className="po-actions">{props.actions}</div>
    </div>
  );
}
