/**
 * HomeReadModel → HomeCleanViewModel 순수 매퍼.
 * 네트워크 0. SDK/Nest/HomePageClient 수정 0.
 * 저장소 실측 필드만 identity 매핑. 추측 API 0. 가짜 0 0.
 */
import type { HomeReadModelResponse } from "@aipo/sdk/home-read-model";
import type { OpportunityFeedResponse } from "@aipo/sdk/user-feed";
import {
  HOME_CLEAN_COPY,
  HOME_CLEAN_CTA_HREF,
} from "@aipo/ui/components/home-clean-v1";
import type {
  HomeCleanDisplayText,
  HomeCleanLiveViewModel,
  HomeCleanProductFamily,
  HomeCleanProductView,
  HomeCleanSessionStatus,
  HomeCleanViewState,
  HomeCleanViewerIdentity,
} from "@aipo/ui/components/home-clean-v1";
import { T } from "@aipo/ui/copy/ko";
import { toOpportunityCardModel } from "../../lib/opportunity-card-map";

export type HomeCleanMapperInput = {
  viewState: HomeCleanViewState;
  sessionStatus: HomeCleanSessionStatus;
  home: HomeReadModelResponse | null;
  feed: OpportunityFeedResponse | null;
  viewer: HomeCleanViewerIdentity;
};

function checking(): HomeCleanDisplayText {
  return { text: HOME_CLEAN_COPY.absent.checking, kind: "checking" };
}

function unavailable(): HomeCleanDisplayText {
  return { text: HOME_CLEAN_COPY.absent.unavailable, kind: "unavailable" };
}

function moneyStateAllowsValue(state: string): boolean {
  return state === "ready_data" || state === "ready_empty" || state === "stale";
}

function formatUsdtDisplay(raw: string): string {
  const t = raw.trim();
  const n = Number(t);
  if (!Number.isFinite(n)) return t;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

function optionalUsdt(raw: unknown): HomeCleanDisplayText {
  if (typeof raw !== "string" || !raw.trim()) return unavailable();
  return { text: formatUsdtDisplay(raw), kind: "value" };
}

function formatDurationSec(sec: number): string | null {
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const minutes = Math.floor(sec / 60);
  if (minutes >= 1) return `${minutes}분`;
  return `${Math.floor(sec)}초`;
}

function formatAsOf(raw: string): string {
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return raw;
  return new Date(parsed).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

function asOfFromHome(home: HomeReadModelResponse | null): string | null {
  if (!home) return null;
  const oppAsOf = home.opportunity?.asOf;
  if (typeof oppAsOf === "string" && oppAsOf.trim()) {
    return formatAsOf(oppAsOf.trim());
  }
  const moneyAsOf = home.money?.asOf;
  if (typeof moneyAsOf === "string" && moneyAsOf.trim()) {
    return formatAsOf(moneyAsOf.trim());
  }
  if (moneyAsOf && typeof moneyAsOf === "object") {
    const principal = (moneyAsOf as { principalUsdt?: unknown }).principalUsdt;
    if (typeof principal === "string" && principal.trim()) {
      return formatAsOf(principal.trim());
    }
  }
  return null;
}

function sessionBannerOf(
  sessionStatus: HomeCleanSessionStatus,
  viewState: HomeCleanViewState,
): HomeCleanLiveViewModel["sessionBanner"] {
  if (sessionStatus === "guest") return "guest";
  if (sessionStatus === "expired") return "expired";
  if (viewState === "unauthorized") return "expired";
  return null;
}

function statusTextOf(viewState: HomeCleanViewState): string {
  if (viewState === "loading") return T.home.opportunity.loadingStatus;
  if (viewState === "ready_empty") return T.home.opportunity.emptyStatus;
  if (viewState === "ready_data") return HOME_CLEAN_COPY.absent.checking;
  if (viewState === "stale") return HOME_CLEAN_COPY.absent.checking;
  if (viewState === "recoverable_error") return T.home.opportunity.errorStatus;
  if (viewState === "blocked") return HOME_CLEAN_COPY.absent.unavailable;
  return T.home.opportunity.guestStatus;
}

function foundCountOf(
  viewState: HomeCleanViewState,
  sessionStatus: HomeCleanSessionStatus,
  home: HomeReadModelResponse | null,
): HomeCleanDisplayText {
  if (
    sessionStatus === "guest" ||
    sessionStatus === "expired" ||
    viewState === "unauthorized" ||
    viewState === "loading" ||
    viewState === "ready_empty" ||
    viewState === "recoverable_error" ||
    viewState === "blocked"
  ) {
    return viewState === "loading" ? checking() : unavailable();
  }
  const count = home?.opportunity?.itemCount;
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return unavailable();
  }
  return {
    text: T.home.aiSummary.foundCount.replace("{n}", String(count)),
    kind: "value",
  };
}

function expectedProfitOf(
  viewState: HomeCleanViewState,
  home: HomeReadModelResponse | null,
): HomeCleanDisplayText {
  if (viewState === "loading") return checking();
  if (
    viewState === "ready_empty" ||
    viewState === "recoverable_error" ||
    viewState === "blocked" ||
    viewState === "unauthorized"
  ) {
    return unavailable();
  }
  const top = home?.todayPossibleProfitUsdt;
  if (typeof top === "string" && top.trim()) return optionalUsdt(top);
  const nested = home?.opportunity?.todayPossibleProfitUsdt;
  if (typeof nested === "string" && nested.trim()) return optionalUsdt(nested);
  return unavailable();
}

function requiredPrincipalOf(
  viewState: HomeCleanViewState,
  home: HomeReadModelResponse | null,
): HomeCleanDisplayText {
  if (viewState === "loading") return checking();
  const money = home?.money;
  if (!money || !moneyStateAllowsValue(money.state)) return unavailable();
  if (typeof money.principalUsdt === "string" && money.principalUsdt.trim()) {
    return optionalUsdt(money.principalUsdt);
  }
  return unavailable();
}

function productFamily(category: string): HomeCleanProductFamily {
  if (category === "watch") return "watch";
  if (category === "card") return "card";
  if (category === "bag" || category === "handbag") return "handbag";
  return "unknown";
}

function productsFromFeed(
  viewState: HomeCleanViewState,
  feed: OpportunityFeedResponse | null,
): HomeCleanProductView[] {
  if (
    !feed ||
    viewState === "ready_empty" ||
    viewState === "unauthorized" ||
    viewState === "recoverable_error" ||
    viewState === "blocked" ||
    viewState === "loading"
  ) {
    return [];
  }
  const mapped: HomeCleanProductView[] = [];
  for (const item of feed.items) {
    const card = toOpportunityCardModel(item);
    if (!card) continue;
    const requiredRaw = item.requiredCapitalUsdt;
    const expectedRaw = item.expectedProfitUsdt;
    const durationRaw = item.estimatedDurationSec;
    const imageSrc =
      typeof item.assetImageUrl === "string" && item.assetImageUrl.trim()
        ? item.assetImageUrl.trim()
        : null;
    const durationText =
      typeof durationRaw === "number" ? formatDurationSec(durationRaw) : null;
    mapped.push({
      id: card.id,
      family: productFamily(card.category),
      titleText: card.assetLabel,
      subtitleText: card.assetImageAltKo || card.assetLabel,
      imageSrc,
      imageAlt: card.assetImageAltKo || card.assetLabel,
      requiredPrincipal: optionalUsdt(requiredRaw),
      expectedProfit: optionalUsdt(expectedRaw),
      duration: durationText
        ? { text: durationText, kind: "value" }
        : checking(),
      href: `${HOME_CLEAN_CTA_HREF.profits}/${card.id}`,
    });
    if (mapped.length >= 3) break;
  }
  return mapped;
}

/**
 * ledgerTotal 은 HomePageClient에서 정산 건수 접미사로만 쓰인다.
 * 이 매퍼는 잔액/USDT 금액 슬롯에 넣지 않는다. COUNT/Money 단정 표시 0.
 */
export function mapHomeReadModelToCleanViewModel(
  input: HomeCleanMapperInput,
): HomeCleanLiveViewModel {
  const { viewState, sessionStatus, home, feed, viewer } = input;
  const asOfText =
    viewState === "stale" ? asOfFromHome(home) : null;

  return {
    mode: "live",
    viewState,
    sessionStatus,
    sessionBanner: sessionBannerOf(sessionStatus, viewState),
    viewer,
    statusText: statusTextOf(viewState),
    asOfText,
    reasonCode:
      typeof home?.reasonCode === "string" && home.reasonCode.trim()
        ? home.reasonCode.trim()
        : null,
    retryAvailable: viewState === "recoverable_error",
    ai: {
      foundCount: foundCountOf(viewState, sessionStatus, home),
      averageReturn: checking(),
      averageDuration: checking(),
    },
    asset: {
      balanceKrw: unavailable(),
      balanceUsdt: unavailable(),
      requiredPrincipal: requiredPrincipalOf(viewState, home),
      expectedProfit: expectedProfitOf(viewState, home),
      actualProfit: unavailable(),
    },
    products: productsFromFeed(viewState, feed),
    cta: HOME_CLEAN_CTA_HREF,
  };
}
