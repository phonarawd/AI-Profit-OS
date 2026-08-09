"use client";

import { T } from "../../copy/ko";

export type CategoryFilterKey = "all" | "watch" | "trading_card" | "luxury_bag";

export type CategoryFilterChipsProps = {
  value?: CategoryFilterKey;
  onChange?: (key: CategoryFilterKey) => void;
  className?: string;
};

/** Engine §0.0.5 CATEGORY_FILTER_CHIPS · layout Owns=UI §5.3b · 1급 탐색 트리 아님 */
const CHIPS: { key: CategoryFilterKey; label: string }[] = [
  { key: "all", label: T.opportunity.filterCategoryAll },
  { key: "watch", label: T.opportunity.filterCategoryWatch },
  { key: "trading_card", label: T.opportunity.filterCategoryCard },
  { key: "luxury_bag", label: T.opportunity.filterCategoryBag },
];

/**
 * §48.3a / §5.3b — 전체|시계|카드|가방
 */
export function CategoryFilterChips({
  value = "all",
  onChange,
  className = "",
}: CategoryFilterChipsProps) {
  return (
    <div
      data-testid="category-filter-chips"
      role="group"
      aria-label={T.opportunity.filterCategoryAll}
      className={`flex flex-wrap gap-2 ${className}`.trim()}
    >
      {CHIPS.map((chip) => {
        const active = value === chip.key;
        return (
          <button
            key={chip.key}
            type="button"
            data-category={chip.key === "all" ? "all" : chip.key}
            data-active={active ? "1" : "0"}
            className={[
              "rounded-lux-sm border px-3 py-1.5 text-sm",
              active
                ? "border-lux-accent bg-lux-accent/15 text-lux-accent"
                : "border-lux-border text-lux-text-muted",
            ].join(" ")}
            onClick={() => onChange?.(chip.key)}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
