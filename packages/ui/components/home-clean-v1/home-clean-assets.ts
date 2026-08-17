/**
 * HomeCleanV1 승인 자산 선언 1곳.
 * public URL만. Brand Kit / HOME_V3_ASSET 대체·import 0.
 */
export const HOME_CLEAN_PUBLIC_ROOT = "/assets/home-clean-v1" as const;

export const HOME_CLEAN_ASSET = {
  robotMaster: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-master.png`,
  robotAiSummaryDesktop: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-ai-summary-desktop.png`,
  robotAiSummaryMobile: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-ai-summary-mobile.png`,
  robotDiscoveryChart: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-discovery-chart.png`,
  robotSidebarOpenHands: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-sidebar-open-hands.png`,
  robotAvatarAiOnly: `${HOME_CLEAN_PUBLIC_ROOT}/robots/robot-avatar-ai-only.png`,
  productWatch: `${HOME_CLEAN_PUBLIC_ROOT}/products/product-watch.png`,
  productCollectibleCard: `${HOME_CLEAN_PUBLIC_ROOT}/products/product-collectible-card.png`,
  productHandbag: `${HOME_CLEAN_PUBLIC_ROOT}/products/product-handbag.png`,
  brandSymbol: `${HOME_CLEAN_PUBLIC_ROOT}/brand-symbol.svg`,
  metricSearch: `${HOME_CLEAN_PUBLIC_ROOT}/metric-search.svg`,
  metricOpportunity: `${HOME_CLEAN_PUBLIC_ROOT}/metric-opportunity.svg`,
  metricTime: `${HOME_CLEAN_PUBLIC_ROOT}/metric-time.svg`,
  avatarFallback: `${HOME_CLEAN_PUBLIC_ROOT}/avatar-fallback.svg`,
} as const;

export type HomeCleanAssetId = keyof typeof HOME_CLEAN_ASSET;
