/**
 * Admin IA lock — Admin §9.1 (12 modules) + §9.1.1 children
 * sidebar 13th top-level FORBIDDEN · verify:admin-routes
 */
export const ADMIN_MODULES = [
  { id: 1, label: "한눈에 보기", href: "/admin", service: "dashboard" },
  { id: 2, label: "수익 기회 관리", href: "/admin/opportunities", service: "opportunities" },
  {
    id: "2b",
    label: "진행 정책",
    href: "/admin/execution-policy",
    service: "execution-policy",
    parentOf: 2,
    sidebarChild: true,
  },
  { id: 3, label: "해외 시세 수집기", href: "/admin/adapters", service: "adapters" },
  { id: 4, label: "입출금 관리", href: "/admin/wallet", service: "wallet" },
  { id: 5, label: "입출금·정산 장부", href: "/admin/ledger", service: "ledger" },
  { id: 6, label: "회원 관리", href: "/admin/users", service: "users" },
  { id: 7, label: "사기·이상 거래 방지", href: "/admin/risk", service: "risk" },
  { id: 8, label: "법적 확인·제재", href: "/admin/compliance", service: "compliance" },
  { id: 9, label: "긴급 정지", href: "/admin/system-control", service: "circuit" },
  { id: 10, label: "AI 분석 기록", href: "/admin/ai-logs", service: "ai-logs" },
  { id: 11, label: "이벤트·프로모션", href: "/admin/growth", service: "growth" },
  { id: 12, label: "운영 기록", href: "/admin/audit", service: "audit" },
] as const;

/** Top-level sidebar count must stay 12 (2b is child link, not 13th) */
export const ADMIN_TOP_LEVEL_COUNT = 12;

/** §9.1.1 child routes / tabs (sidebar add FORBIDDEN) */
export const ADMIN_CHILD_ROUTES = [
  { href: "/admin/execution-policy", parent: "2b", note: "매칭 성공 조절 · Soft60/Hard90 · nearMissCap · 난수성공률0" },
  { href: "/admin/opportunities?tab=assets", parent: 2, note: "Asset Master·R2 이미지 · Engine §0.0.6 · 독립 /admin/assets 금지" },
  { href: "/admin/wallet?tab=deposit-settings", parent: 4, note: "입금설정" },
  { href: "/admin/wallet?tab=review", parent: 4, note: "검수함" },
  { href: "/admin/wallet?tab=krw-pending", parent: 4, note: "원화 승인/거절" },
  { href: "/admin/wallet?tab=disputes", parent: 4, note: "분쟁" },
  { href: "/admin/compliance?tab=kyc", parent: 8, note: "출금 KYC 승인/거절 · Money §42" },
  { href: "/admin/support?tab=queue", parent: "1|6", note: "CS 큐 · sidebar 모듈 금지" },
  { href: "/admin/reports/financial", parent: 5, note: "금융 리포트" },
  { href: "/admin/ledger?userId=", parent: 5, note: "유저 점프" },
  { href: "/admin/growth?tab=simulation", parent: 11, note: "시뮬레이션" },
  { href: "/admin/growth?tab=referral", parent: 11, note: "초대" },
  { href: "/admin/growth?tab=notices", parent: 11, note: "공지" },
  { href: "/admin/growth?tab=campaigns", parent: 11, note: "캠페인" },
  { href: "/admin/growth?tab=missions", parent: 11, note: "혜택·미션 §51.8a" },
  { href: "/admin/growth?tab=share", parent: 11, note: "공유 카드" },
  { href: "/admin/growth?tab=content", parent: 11, note: "G1" },
  { href: "/admin/growth?tab=deposit", parent: 11, note: "G2" },
  { href: "/admin/growth?tab=whale", parent: 11, note: "G3" },
  { href: "/admin/growth?tab=ticker", parent: 11, note: "G4" },
  { href: "/admin/growth?tab=partners", parent: 11, note: "§38.10 공식 협력사" },
  { href: "/admin/ai-logs?tab=coach", parent: 10, note: "퍼뜩 coach" },
  { href: "/admin/ai-logs?tab=spotcheck", parent: 10, note: "이용성 점검" },
  { href: "/admin/ai-logs?tab=pick", parent: 10, note: "AI PICK 점수 읽기전용 · Admin override 0" },
  { href: "/admin/ai-logs?tab=eval", parent: 10, note: "Eval Gate · auto learning OFF" },
  { href: "/admin/ledger?tab=shadow-replay", parent: 5, note: "shadow-replay drift 0.000%" },
  { href: "/admin/users/:id", parent: 6, note: "유저360" },
  { href: "/admin/users/:id?tab=opportunities", parent: 6, note: "§9.8.9 유저별 기회 override · sidebar 추가 금지" },
  { href: "/admin/users/:id?tab=membership", parent: 6, note: "§9.8.10 멤버십 강제·유저별 엄격도·fulfillRate읽기 · sidebar 추가 금지" },
  { href: "/admin/users/:id/finance", parent: 6, note: "금융전수" },
  { href: "/admin/users/:id/finance?tab=buckets", parent: 6, note: "버킷" },
  { href: "/admin/risk?tab=queue", parent: 7, note: "동결 큐" },
  { href: "/admin/system-control?tab=reserve", parent: 9, note: "platform_reserve · Engine §0.0.4.3 · 시뮬 S2" },
] as const;

/** Legacy growth paths → ?tab= redirect (이중 IA 금지) */
export const GROWTH_LEGACY_REDIRECTS = [
  { from: "/admin/growth/content", tab: "content" },
  { from: "/admin/growth/deposit", tab: "deposit" },
  { from: "/admin/growth/whale", tab: "whale" },
  { from: "/admin/growth/ticker", tab: "ticker" },
] as const;
