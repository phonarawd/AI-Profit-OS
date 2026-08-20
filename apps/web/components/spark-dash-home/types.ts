/**
 * Spark Dash Home Desktop view-model.
 * Money strings are already formatted by the owner (fixture or runtime mapper).
 * Null = owner 없음 · 0으로 채우지 않음.
 */

export type SparkDashDataOwner = "visual_fixture" | "runtime";

export type SparkDashMoney = {
  usdt: string | null;
  krw: string | null;
};

export type SparkDashNavKey =
  | "home"
  | "explore"
  | "assets"
  | "participations"
  | "settlements"
  | "partners"
  | "alerts"
  | "settings";

export type SparkDashNavItem = {
  key: SparkDashNavKey;
  label: string;
  href: string;
  icon: "home" | "explore" | "wallet" | "list" | "receipt" | "partner" | "bell" | "settings";
};

export type SparkDashHero = {
  partner: string;
  partnerKind: "ebay" | "amazon" | "yahoo" | "plain";
  title: string;
  productMediaUrl: string | null;
  productMediaAlt: string;
  ratePct: string | null;
  expectedProfitUsdt: string | null;
  expectedProfitKrw: string | null;
  durationLabel: string | null;
  capitalUsdt: string | null;
  capitalKrw: string | null;
  statusLabel: string;
  statusCopy: string;
  participateHref: string;
  detailHref: string;
};

export type SparkDashWalletRow = {
  key: "available" | "participating" | "pending" | "withdrawable";
  label: string;
  usdt: string | null;
  krw: string | null;
  tone: "green" | "blue" | "amber" | "purple";
};

export type SparkDashStat = {
  key: "active" | "pending" | "month" | "lifetime";
  label: string;
  value: string | null;
  usdt: string | null;
  krw: string | null;
  tone: "blue" | "purple" | "green" | "red";
};

export type SparkDashPopular = {
  id: string;
  partner: string;
  partnerKind: "ebay" | "amazon" | "yahoo" | "plain";
  title: string;
  ratePct: string | null;
  expectedProfitUsdt: string | null;
  expectedProfitKrw: string | null;
  durationLabel: string | null;
  capitalUsdt: string | null;
  capitalKrw: string | null;
  statusLabel: string;
  href: string;
};

export type SparkDashHomeModel = {
  owner: SparkDashDataOwner;
  displayName: string | null;
  levelLabel: string | null;
  sidebarBalance: SparkDashMoney;
  walletHeadline: SparkDashMoney;
  walletRows: SparkDashWalletRow[];
  hero: SparkDashHero | null;
  stats: SparkDashStat[];
  popular: SparkDashPopular[];
  nav: SparkDashNavItem[];
};
