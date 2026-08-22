import { HOME_CLEAN_COPY } from "./home-clean-copy";
import { HOME_CLEAN_DATA_MODE } from "./HomeCleanFixture";
import type { HomeCleanDataMode } from "./home-clean.types";
import styles from "./HomeCleanCards.module.css";

const CHIPS = [
  { id: "all", label: HOME_CLEAN_COPY.category.all, selected: true },
  { id: "watch", label: HOME_CLEAN_COPY.category.watch, selected: false },
  { id: "card", label: HOME_CLEAN_COPY.category.card, selected: false },
  { id: "bag", label: HOME_CLEAN_COPY.category.bag, selected: false },
] as const;

/** 표시만. 서버 필터 0 */
export function HomeCleanCategoryChips({
  mode = HOME_CLEAN_DATA_MODE,
}: {
  mode?: HomeCleanDataMode;
}) {
  return (
    <div
      className={styles.chipsWrap}
      role="list"
      aria-label={HOME_CLEAN_COPY.category.aria}
      data-hc-mode={mode}
    >
      {CHIPS.map((chip) => (
        <span
          key={chip.id}
          role="listitem"
          className={styles.chip}
          data-selected={chip.selected ? "true" : "false"}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
