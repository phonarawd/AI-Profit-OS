import { T } from "../../copy/ko";
import { Badge } from "../lux/Badge";

type Props = {
  open: boolean;
  onOpen: () => void;
};

/** 기회 카드 체험. 실시간 기회/수익이 아님. */
export function OpportunityDemoCard({ open, onOpen }: Props) {
  return (
    <div data-testid="onboarding-opportunity-demo" data-demo="체험">
      <button
        type="button"
        data-testid="demo-opportunity-card"
        data-flags="demo,practice_only"
        className="w-full rounded-lux-md border border-lux-border bg-lux-elevated p-4 text-left"
        onClick={onOpen}
      >
        <div className="mb-2 flex items-center gap-2">
          <Badge>{T.practice.badge}</Badge>
          <span className="acq-demo-label">{T.onboarding.demoLabel}</span>
        </div>
        <p className="text-sm font-medium text-lux-text">
          {T.onboarding.opportunityDemoTitle}
        </p>
        <p className="mt-2 text-sm text-lux-text-muted">
          {T.margin.compareMiniUtility}
        </p>
        <p className="mt-2 text-lg font-semibold text-lux-text">
          {T.onboarding.demoPriceExample}
        </p>
        <p className="mt-3 text-sm font-medium text-lux-principal">
          {T.onboarding.tryDemoCard}
        </p>
      </button>
      {open ? (
        <aside
          data-testid="demo-preview"
          className="mt-3 rounded-lux-md border border-lux-accent/40 bg-lux-surface px-4 py-3"
          role="status"
        >
          <p className="font-medium">{T.onboarding.demoPreviewTitle}</p>
          <p className="mt-1 text-sm text-lux-text-muted">
            {T.onboarding.demoPreviewBody}
          </p>
          <p className="mt-1 text-xs text-lux-text-muted">
            {T.onboarding.demoNotLive}
          </p>
        </aside>
      ) : null}
    </div>
  );
}
