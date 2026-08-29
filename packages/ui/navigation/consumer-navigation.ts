export const CONSUMER_DESTINATIONS = {
  home: { id: "home", href: "/", label: "홈" },
  opportunities: { id: "opportunities", href: "/profits", label: "기회" },
  assets: { id: "assets", href: "/wallet", label: "내 자산" },
  activity: { id: "activity", href: "/trades", label: "참여 내역" },
  settlements: { id: "settlements", href: "/wallet/history", label: "정산 내역" },
  partners: { id: "partners", href: "/me/guide/partners", label: "파트너" },
  inbox: { id: "inbox", href: "/me/inbox", label: "알림" },
  settings: { id: "settings", href: "/me/settings", label: "설정" },
  profile: { id: "profile", href: "/me", label: "내 정보" },
} as const;

export type ConsumerDestinationId = keyof typeof CONSUMER_DESTINATIONS;
export type ConsumerDestination = (typeof CONSUMER_DESTINATIONS)[ConsumerDestinationId];

export const MOBILE_PRIMARY_IDS = [
  "home",
  "opportunities",
  "assets",
  "inbox",
  "profile",
] as const;

export const MOBILE_PRIMARY_LABEL = {
  home: "홈",
  opportunities: "기회",
  assets: "내 자산",
  inbox: "알림",
  profile: "더보기",
} as const;

export const DESKTOP_SIDEBAR_IDS = [
  "home",
  "opportunities",
  "assets",
  "activity",
  "settlements",
  "partners",
  "inbox",
  "settings",
] as const;

export const LAUNCH_HIDDEN_HREFS = [
  "/me/events",
  "/me/strategies",
  "/me/guide/market-weekly",
] as const;

export function destination(id: ConsumerDestinationId): ConsumerDestination {
  return CONSUMER_DESTINATIONS[id];
}

export function mobilePrimaryItems() {
  return MOBILE_PRIMARY_IDS.map((id) => ({
    ...CONSUMER_DESTINATIONS[id],
    label: MOBILE_PRIMARY_LABEL[id],
  }));
}

export function desktopSidebarItems() {
  return DESKTOP_SIDEBAR_IDS.map((id) => CONSUMER_DESTINATIONS[id]);
}

export const USER_TABS = [
  { order: 1, icon: "home", label: CONSUMER_DESTINATIONS.home.label, href: CONSUMER_DESTINATIONS.home.href },
  { order: 2, icon: "opportunities", label: CONSUMER_DESTINATIONS.opportunities.label, href: CONSUMER_DESTINATIONS.opportunities.href },
  { order: 3, icon: "activity", label: CONSUMER_DESTINATIONS.activity.label, href: CONSUMER_DESTINATIONS.activity.href },
  { order: 4, icon: "assets", label: CONSUMER_DESTINATIONS.assets.label, href: CONSUMER_DESTINATIONS.assets.href },
  { order: 5, icon: "profile", label: CONSUMER_DESTINATIONS.profile.label, href: CONSUMER_DESTINATIONS.profile.href },
] as const;

export function activeDestinationId(pathname: string): ConsumerDestinationId | "more" {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/profits")) return "opportunities";
  if (pathname.startsWith("/wallet/history")) return "settlements";
  if (pathname.startsWith("/wallet")) return "assets";
  if (pathname.startsWith("/trades")) return "activity";
  if (pathname.startsWith("/me/guide/partners")) return "partners";
  if (pathname.startsWith("/me/inbox")) return "inbox";
  if (pathname.startsWith("/me/settings")) return "settings";
  if (pathname === "/me" || pathname.startsWith("/me/")) return "profile";
  return "more";
}

export function isImmersivePath(pathname: string): boolean {
  return (
    pathname.startsWith("/auth/") ||
    pathname === "/onboarding" ||
    pathname === "/ads" ||
    pathname.startsWith("/ads/") ||
    pathname.startsWith("/l/")
  );
}

export function isLockedVisualSurface(pathname: string): boolean {
  return pathname === "/" || pathname === "/me" || pathname.startsWith("/profits");
}
