/**
 * Responsive sizes() for ProductImage — audit §37 · FEED_COLUMNS §19–§23
 */
import { BREAKPOINTS, FEED_COLUMNS } from "../../tokens/breakpoints";

export type ProductImageVariant = "card" | "thumb" | "detail";

/** Default sizes attribute matching 1/2/3–4 col feed + content rail */
export function productImageSizes(
  variant: ProductImageVariant = "card",
): string {
  if (variant === "thumb") return "64px";
  if (variant === "detail") {
    return `(max-width: ${BREAKPOINTS.md}px) 100vw, 28rem`;
  }
  const tabletPct = Math.round(100 / FEED_COLUMNS.tablet);
  const desktopPct = Math.round(100 / FEED_COLUMNS.desktop);
  const widePct = Math.round(100 / FEED_COLUMNS.wide);
  return [
    `(max-width: ${BREAKPOINTS.md - 1}px) 100vw`,
    `(max-width: ${BREAKPOINTS.lg - 1}px) ${tabletPct}vw`,
    `(max-width: ${BREAKPOINTS.xl - 1}px) ${desktopPct}vw`,
    `${widePct}vw`,
  ].join(", ");
}
