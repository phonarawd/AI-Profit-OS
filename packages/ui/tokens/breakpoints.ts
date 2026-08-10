/**
 * §29.2 Breakpoint SSOT + audit test-point matrix (PART1d)
 * Named tiers = architecture. Test points = container-query QA matrix, not new named BPs.
 */

export const BREAKPOINTS = {
  xs: 320,
  sm: 390,
  md: 768,
  lg: 1280,
  xl: 1920,
  "2xl": 3840,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** Content rail — 4K / ultrawide (§23 extend · v1.3 ADR-017 Home Grid 1440→1680) */
export const CONTENT_RAIL = {
  maxWidthPx: 1680,
  bodyMaxCh: 65,
} as const;

/**
 * Container-query / visual-regression test points (audit §19).
 * Covered by the 6 named tiers via clamp/@container — not new breakpoint names.
 */
export const VIEWPORT_TEST_POINTS = {
  mobile: [320, 360, 375, 390, 393, 412, 430, 480],
  tablet: [600, 768, 820, 834, 1024],
  desktop: [1280, 1366, 1440, 1536, 1600, 1920, 2560],
  ultrawide: [3440, 3840],
} as const;

/**
 * `verify:responsive` Playwright harness matrix (audit §45).
 * Subset of VIEWPORT_TEST_POINTS — Canon structure diff, not pixel screenshots (ADR-013).
 */
export const RESPONSIVE_HARNESS_VIEWPORTS = [
  390, 430, 768, 1024, 1366, 1440, 1920, 2560, 3440, 3840,
] as const;

/** Grid column hints for ProductImage sizes / feed layout */
export const FEED_COLUMNS = {
  mobile: 1, // < md
  tablet: 2, // md .. lg
  desktop: 3, // lg .. xl
  wide: 4, // xl .. 2xl (capped by content rail)
} as const;
