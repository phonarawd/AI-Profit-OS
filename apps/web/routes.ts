/**
 * User IA lock — UI §5.1 (변경 금지)
 * verify:ia-tabs reads this file.
 */
export const USER_TABS = [
  { order: 1, icon: "🏠", label: "홈", href: "/" },
  { order: 2, icon: "🔥", label: "수익", href: "/profits" },
  { order: 3, icon: "💼", label: "내거래", href: "/trades" },
  { order: 4, icon: "💰", label: "지갑", href: "/wallet" },
  { order: 5, icon: "👤", label: "내정보", href: "/me" },
] as const;

export type UserTabHref = (typeof USER_TABS)[number]["href"];

/** Nested routes (5탭 밖 · 탭 추가 금지) · PART5b lock */
export const USER_NESTED_ROUTES = [
  "/wallet/deposit",
  "/wallet/withdraw",
  "/wallet/withdraw/usdt",
  "/wallet/withdraw/krw",
  "/wallet/history",
  "/me/settings",
  "/me/legal",
  "/me/legal/terms",
  "/me/legal/privacy",
  "/me/legal/oss",
  "/me/legal/license",
  "/me/kyc",
  "/me/peotteok",
  "/me/membership",
  "/me/inbox",
  "/me/invite",
  "/me/events",
  "/me/strategies",
  "/me/support",
  "/me/benefits",
  "/me/guide/usdt",
  "/me/guide/get-usdt",
  "/me/guide/revenue",
  "/me/guide/faq",
  "/me/guide/principal",
  "/me/guide/partners",
  "/me/guide/market-weekly",
  "/trades/[id]/execute",
  "/profits/[id]",
  "/onboarding",
  "/auth/login",
  "/auth/signup",
  "/auth/complete-profile",
  "/l/[variant]",
  "/ads",
  "/ads/[variant]",
] as const;

/** Forbidden in apps/web (Admin §40) */
export const WEB_FORBIDDEN_PREFIXES = ["/admin"] as const;
