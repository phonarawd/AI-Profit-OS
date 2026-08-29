"use client";

import { useState } from "react";
import { T } from "../../copy/ko";

export type ObjectionFourAccordionProps = {
  className?: string;
  /** Open first item by default */
  defaultOpen?: "q1" | "q2" | "q3" | "q4" | null;
};

const KEYS = ["q1", "q2", "q3", "q4"] as const;

/** UI §38.7 — Objection Q1~Q4 accordion (FAQ / onboarding / landing) */
export function ObjectionFourAccordion({
  className = "",
  defaultOpen = null,
}: ObjectionFourAccordionProps) {
  const [open, setOpen] = useState<(typeof KEYS)[number] | null>(defaultOpen);

  return (
    <section
      data-testid="objection-four-accordion"
      className={`space-y-2 ${className}`.trim()}
    >
      <h2 className="text-base font-semibold text-pd-text">
        {T.objections.sectionTitle}
      </h2>
      <div className="space-y-2">
        {KEYS.map((key) => {
          const item = T.objections[key];
          const isOpen = open === key;
          return (
            <div
              key={key}
              data-testid={`objection-${key}`}
              className="rounded-pd-md border border-pd-border bg-pd-elevated"
            >
              <button
                type="button"
                className="touch-target flex w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium text-pd-text"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : key)}
              >
                <span>{item.q}</span>
                <span className="text-pd-text-muted" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <p className="border-t border-pd-border px-3 py-2 text-sm text-pd-text-muted">
                  {item.a}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
