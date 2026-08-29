"use client";

import { T } from "../../copy/ko";

export type ExecutionStepListProps = {
  /** 0..4 — server TradeExecutionState.stepIndex */
  stepIndex: number;
  /** When status=success, mark all done */
  allDone?: boolean;
  className?: string;
};

/**
 * §48.3 / §48.10 — steps[].active | done from T.execution.steps
 */
export function ExecutionStepList({
  stepIndex,
  allDone = false,
  className = "",
}: ExecutionStepListProps) {
  const steps = T.execution.steps;
  const idx = Math.max(0, Math.min(steps.length - 1, Math.floor(stepIndex)));

  return (
    <ol
      data-testid="execution-step-list"
      data-step-index={idx}
      className={`space-y-2 ${className}`.trim()}
    >
      {steps.map((step, i) => {
        const done = allDone || i < idx;
        const active = !allDone && i === idx;
        const label = done ? step.done : active ? step.active : step.active;
        return (
          <li
            key={step.key}
            data-step-key={step.key}
            data-step-state={done ? "done" : active ? "active" : "pending"}
            className={[
              "flex items-center gap-2 text-sm",
              done
                ? "text-pd-accent"
                : active
                  ? "text-pd-text"
                  : "text-pd-text-muted",
              active ? "font-medium" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span aria-hidden className="w-4 shrink-0 text-center">
              {done ? "✓" : active ? "●" : "○"}
            </span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
