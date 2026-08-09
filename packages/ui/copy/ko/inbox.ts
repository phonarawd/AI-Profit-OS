/**
 * T.inbox — UI §5.9.4 알림·쪽지함 카피 SSOT
 * 1인 발송 Owns = Admin §9.8.8d · fanout = PWA §23.5a · prefs = §50.1n
 * FORBIDDEN: 하드삭제 · 수익 보장 · 성향메모 유저 노출 · IT용어
 */
export const inbox = {
  title: "알림·쪽지",
  empty: "아직 받은 쪽지가 없어요",
  filterAll: "전체",
  filterOps: "운영 쪽지",
  filterNotice: "공지",
  filterCampaign: "이벤트",
  filterOpportunity: "수익 기회",
  filterWallet: "충전·출금",
  unreadDot: "안 읽음",
  markRead: "읽음으로 표시",
  hide: "숨기기",
  hideDone: "숨겼어요",
  openBody: "내용 보기",
  closeBody: "닫기",
  supportCta: "고객센터",
  relativeJustNow: "방금",
  relativeMinutes: "{n}분 전",
  relativeHours: "{n}시간 전",
  relativeDays: "{n}일 전",
  /** toast §5.9.4 차단 — resolveToast SSOT=toast.ts */
  matchBlockedHint: "매칭을 진행할 수 없을 때 안내가 떠요",
  withdrawBlockedHint: "출금 신청을 받을 수 없을 때 안내가 떠요",
  prefsLink: "알림 설정",
  adminPointer: "Admin §9.8.8d",
  pwaPointer: "PWA §23.5a",
  prefsPointer: "UI §50.1n",
} as const;

export type InboxCopy = typeof inbox;
