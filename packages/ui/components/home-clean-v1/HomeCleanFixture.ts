import { T } from "../../copy/ko";
import { HOME_CLEAN_ASSET } from "./home-clean-assets";
import { HOME_CLEAN_COPY } from "./home-clean-copy";
import type { HomeCleanAiSummaryTitleState } from "./home-clean-copy";
import type {
  HomeCleanCtaHref,
  HomeCleanDisplayText,
  HomeCleanFixtureViewModel,
  HomeCleanProductView,
  HomeCleanSessionStatus,
  HomeCleanViewState,
} from "./home-clean.types";
import { HOME_CLEAN_CTA_HREF } from "./home-clean.types";

export const HOME_CLEAN_DATA_MODE = "fixture" as const;

export type HomeCleanAiSummaryFixture = {
  viewState: HomeCleanAiSummaryTitleState;
  foundCountText: string;
  averageReturnText: string;
  averageDurationText: string;
};

/** Phase 3 visual fixture. live/SDK 값 아님. 숫자 발명 0 */
export const HOME_CLEAN_AI_SUMMARY_FIXTURE: HomeCleanAiSummaryFixture = {
  viewState: "loading",
  foundCountText: HOME_CLEAN_COPY.absent.checking,
  averageReturnText: HOME_CLEAN_COPY.absent.checking,
  averageDurationText: HOME_CLEAN_COPY.absent.checking,
};

export type HomeCleanAssetFixture = {
  balanceKrwText: string;
  balanceUsdtText: string;
  requiredPrincipalText: string;
  expectedProfitText: string;
  actualProfitText: string;
};

/**
 * Phase 3 visual fixture. 계산 0. 가짜 0 금지.
 * required principal 실값 없음 → 정보 없음.
 * ACTUAL_PROFIT_BINDING=UNRESOLVED_SAFE_ABSENT
 */
export const HOME_CLEAN_ASSET_FIXTURE: HomeCleanAssetFixture = {
  balanceKrwText: HOME_CLEAN_COPY.absent.checking,
  balanceUsdtText: HOME_CLEAN_COPY.absent.checking,
  requiredPrincipalText: HOME_CLEAN_COPY.absent.unavailable,
  expectedProfitText: HOME_CLEAN_COPY.absent.checking,
  actualProfitText: HOME_CLEAN_COPY.absent.unavailable,
};

export const HOME_CLEAN_ACTUAL_PROFIT_BINDING =
  "UNRESOLVED_SAFE_ABSENT" as const;

export type HomeCleanProductFixture = {
  id: "watch" | "card" | "handbag";
  assetId: "productWatch" | "productCollectibleCard" | "productHandbag";
  requiredPrincipalText: string;
  expectedProfitText: string;
  durationText: string;
};

export const HOME_CLEAN_PRODUCT_FIXTURE: readonly HomeCleanProductFixture[] = [
  {
    id: "watch",
    assetId: "productWatch",
    requiredPrincipalText: HOME_CLEAN_COPY.absent.unavailable,
    expectedProfitText: HOME_CLEAN_COPY.absent.checking,
    durationText: HOME_CLEAN_COPY.absent.checking,
  },
  {
    id: "card",
    assetId: "productCollectibleCard",
    requiredPrincipalText: HOME_CLEAN_COPY.absent.unavailable,
    expectedProfitText: HOME_CLEAN_COPY.absent.checking,
    durationText: HOME_CLEAN_COPY.absent.checking,
  },
  {
    id: "handbag",
    assetId: "productHandbag",
    requiredPrincipalText: HOME_CLEAN_COPY.absent.unavailable,
    expectedProfitText: HOME_CLEAN_COPY.absent.checking,
    durationText: HOME_CLEAN_COPY.absent.checking,
  },
];

function checking(): HomeCleanDisplayText {
  return { text: HOME_CLEAN_COPY.absent.checking, kind: "checking" };
}

function unavailable(): HomeCleanDisplayText {
  return { text: HOME_CLEAN_COPY.absent.unavailable, kind: "unavailable" };
}

const PRODUCT_COPY = {
  watch: {
    title: T.home.categoryVisual.watchTitle,
    sub: T.home.categoryVisual.watchSub,
  },
  card: {
    title: T.home.categoryVisual.cardTitle,
    sub: T.home.categoryVisual.cardSub,
  },
  handbag: {
    title: T.home.categoryVisual.bagTitle,
    sub: T.home.categoryVisual.bagSub,
  },
} as const;

function fixtureProducts(): HomeCleanProductView[] {
  return HOME_CLEAN_PRODUCT_FIXTURE.map((item) => ({
    id: item.id,
    family: item.id,
    titleText: PRODUCT_COPY[item.id].title,
    subtitleText: PRODUCT_COPY[item.id].sub,
    imageSrc: HOME_CLEAN_ASSET[item.assetId],
    imageAlt: PRODUCT_COPY[item.id].sub,
    requiredPrincipal: unavailable(),
    expectedProfit: checking(),
    duration: checking(),
    href: HOME_CLEAN_CTA_HREF.profits,
  }));
}

function fixtureStatusText(viewState: HomeCleanViewState): string {
  if (viewState === "loading") return T.home.opportunity.loadingStatus;
  if (viewState === "ready_empty") return T.home.opportunity.emptyStatus;
  if (viewState === "ready_data") return HOME_CLEAN_COPY.absent.checking;
  if (viewState === "stale") return HOME_CLEAN_COPY.absent.checking;
  if (viewState === "recoverable_error") return T.home.opportunity.errorStatus;
  if (viewState === "blocked") return HOME_CLEAN_COPY.absent.unavailable;
  return T.home.opportunity.guestStatus;
}

function fixtureSessionBanner(
  sessionStatus: HomeCleanSessionStatus,
  viewState: HomeCleanViewState,
): HomeCleanFixtureViewModel["sessionBanner"] {
  if (sessionStatus === "guest") return "guest";
  if (sessionStatus === "expired") return "expired";
  if (viewState === "unauthorized") return "expired";
  return null;
}

/**
 * Phase 3~6 visual fixture → ViewModel.
 * live 숫자 복사 0. 가짜 0 0. 정적 김 0.
 */
export function createHomeCleanFixtureViewModel(opts?: {
  viewState?: HomeCleanViewState;
  sessionStatus?: HomeCleanSessionStatus;
}): HomeCleanFixtureViewModel {
  const sessionStatus = opts?.sessionStatus ?? "authenticated";
  const viewState =
    opts?.viewState ??
    (sessionStatus === "authenticated" ? "loading" : "unauthorized");
  const showVisualCards =
    viewState === "loading" ||
    viewState === "ready_data" ||
    viewState === "stale";
  const cta: HomeCleanCtaHref = HOME_CLEAN_CTA_HREF;

  return {
    mode: "fixture",
    viewState,
    sessionStatus,
    sessionBanner: fixtureSessionBanner(sessionStatus, viewState),
    viewer: {},
    statusText: fixtureStatusText(viewState),
    asOfText: null,
    reasonCode: null,
    retryAvailable: viewState === "recoverable_error",
    ai: {
      foundCount: checking(),
      averageReturn: checking(),
      averageDuration: checking(),
    },
    asset: {
      balanceKrw: checking(),
      balanceUsdt: checking(),
      requiredPrincipal: unavailable(),
      expectedProfit: checking(),
      actualProfit: unavailable(),
    },
    products: showVisualCards ? fixtureProducts() : [],
    cta,
  };
}
