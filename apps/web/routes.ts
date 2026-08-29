import { USER_TABS as NAV_TABS, LAUNCH_HIDDEN_HREFS } from "@aipo/ui/navigation/consumer-navigation";

export const USER_TABS = NAV_TABS;
export type UserTabHref = (typeof USER_TABS)[number]["href"];

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
  "/me/support",
  "/me/benefits",
  "/me/guide/usdt",
  "/me/guide/get-usdt",
  "/me/guide/revenue",
  "/me/guide/faq",
  "/me/guide/principal",
  "/me/guide/partners",
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

export const WEB_FORBIDDEN_PREFIXES = ["/admin"] as const;
export { LAUNCH_HIDDEN_HREFS };
