export type HomeCleanTabSource = {
  readonly label: string;
  readonly href: string;
};

export type HomeCleanNavIconId =
  | "home"
  | "profits"
  | "trades"
  | "wallet"
  | "me";

export type HomeCleanNavItem = {
  label: string;
  href: string;
  active: boolean;
  iconId: HomeCleanNavIconId;
};

/**
 * HomeClean 표시 전용 ViewModel.
 * SDK HomeReadModel 타입을 재수출하지 않는다. 계약 변경 0.
 * loading 은 클라이언트 로컬. 서버 enum 발명 0.
 */
export type HomeCleanViewState =
  | "loading"
  | "ready_empty"
  | "ready_data"
  | "stale"
  | "recoverable_error"
  | "blocked"
  | "unauthorized";

export type HomeCleanSessionStatus = "guest" | "authenticated" | "expired";

export type HomeCleanDataMode = "fixture" | "live";

export type HomeCleanDisplayKind =
  | "value"
  | "dash"
  | "checking"
  | "unavailable";

export type HomeCleanDisplayText = {
  readonly text: string;
  readonly kind: HomeCleanDisplayKind;
};

/** 저장소에 실측된 identity 키만. 없는 키는 생략. API 발명 0 */
export type HomeCleanViewerIdentity = {
  readonly nickname?: string | null;
  readonly displayName?: string | null;
  readonly name?: string | null;
  readonly email?: string | null;
  readonly avatarUrl?: string | null;
};

export type HomeCleanSessionBannerKind = "guest" | "expired" | null;

/**
 * HC6-05 inventory 대상 href.
 * 값은 기존 page.tsx / USER_NESTED_ROUTES / T.home.hero.ctaHref 실측.
 */
export const HOME_CLEAN_CTA_HREF = {
  profits: "/profits",
  deposit: "/wallet/deposit",
  withdraw: "/wallet/withdraw",
  history: "/wallet/history",
  inbox: "/me/inbox",
  me: "/me",
  support: "/me/support",
  login: "/auth/login",
  hero: "#home-opportunity",
} as const;

export type HomeCleanCtaHref = typeof HOME_CLEAN_CTA_HREF;

export type HomeCleanProductFamily = "watch" | "card" | "handbag" | "unknown";

export type HomeCleanProductView = {
  readonly id: string;
  readonly family: HomeCleanProductFamily;
  readonly titleText: string;
  readonly subtitleText: string;
  readonly imageSrc: string | null;
  readonly imageAlt: string;
  readonly requiredPrincipal: HomeCleanDisplayText;
  readonly expectedProfit: HomeCleanDisplayText;
  readonly duration: HomeCleanDisplayText;
  readonly href: string;
};

export type HomeCleanViewModelFields = {
  readonly viewState: HomeCleanViewState;
  readonly sessionStatus: HomeCleanSessionStatus;
  readonly sessionBanner: HomeCleanSessionBannerKind;
  readonly viewer: HomeCleanViewerIdentity;
  readonly statusText: string;
  readonly asOfText: string | null;
  readonly reasonCode: string | null;
  readonly retryAvailable: boolean;
  readonly ai: {
    readonly foundCount: HomeCleanDisplayText;
    readonly averageReturn: HomeCleanDisplayText;
    readonly averageDuration: HomeCleanDisplayText;
  };
  readonly asset: {
    readonly balanceKrw: HomeCleanDisplayText;
    readonly balanceUsdt: HomeCleanDisplayText;
    readonly requiredPrincipal: HomeCleanDisplayText;
    readonly expectedProfit: HomeCleanDisplayText;
    readonly actualProfit: HomeCleanDisplayText;
  };
  readonly products: readonly HomeCleanProductView[];
  readonly cta: HomeCleanCtaHref;
};

export type HomeCleanFixtureViewModel = HomeCleanViewModelFields & {
  readonly mode: "fixture";
};

export type HomeCleanLiveViewModel = HomeCleanViewModelFields & {
  readonly mode: "live";
};

export type HomeCleanViewModel =
  | HomeCleanFixtureViewModel
  | HomeCleanLiveViewModel;
