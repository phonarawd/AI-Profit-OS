/**
 * /dev/spark-dash-room 전용. production /profits/[id] 는 이 파일을 import 하지 않는다.
 */

import type { OpportunityRoomModel } from "./types";

export const OPPORTUNITY_ROOM_VISUAL_FIXTURE: OpportunityRoomModel = {
  owner: "visual_fixture",
  viewState: "READY",
  displayName: "퍼뜩님",
  levelLabel: "Lv.3",
  sidebarBalance: { usdt: "2,450.00", krw: "≈ ₩3,332,000" },
  nav: [
    { key: "home", label: "홈", href: "/", icon: "home" },
    { key: "explore", label: "기회 탐색", href: "/profits", icon: "explore" },
    { key: "assets", label: "내 자산", href: "/wallet", icon: "wallet" },
    { key: "participations", label: "참여 내역", href: "/trades", icon: "list" },
    { key: "settlements", label: "정산 내역", href: "/wallet/history", icon: "receipt" },
    { key: "partners", label: "파트너", href: "/me/guide/partners", icon: "partner" },
    { key: "alerts", label: "알림", href: "/me/inbox", icon: "bell" },
    { key: "settings", label: "설정", href: "/me/settings", icon: "settings" },
  ],
  item: {
    id: "dev-visual-only",
    title: "Nike Air Force 1 '07",
    partner: "이베이(미국)",
    partnerKind: "ebay",
    productMediaUrl: "/spark-dash/product-sneaker-hero.png",
    productMediaAlt: "Nike Air Force 1 '07",
    mediaState: "LOADING",
    corridorKo: "시세 차익 기회",
    ratePct: "28.4%",
    expectedProfitUsdt: "+284.00 USDT",
    expectedProfitKrw: "≈ ₩386,240",
    capitalUsdt: "1,000.00",
    capitalKrw: "≈ ₩1,360,000",
    durationLabel: null,
    statusLabel: "참여 가능",
    joinable: true,
    funding: false,
    locked: false,
    suggestDeposit: null,
    buyLabel: "이베이(미국)",
    buyPriceUsdt: "1,000.00",
    sellLabel: "운영자 기준가",
    sellPriceUsdt: "1,344.00",
    grossSpreadUsdt: "+344.00",
  },
};
