/**
 * T.toast.* — UI §8.2 catalog mirror · §50.2 emoji 1~2 · §27.10 palette
 * Schema pointer: schemas/toast-codes.v1.json
 * JSX hardcode forbidden · problem.code raw exposure 0
 */

export const toast = {
  INSUFFICIENT_BALANCE: "😅 USDT가 부족해요. 입금 후 다시 시도해 주세요",
  KYC_WITHDRAW_REQUIRED: "🔐 출금하려면 본인 확인이 필요해요! 1번만 하면 돼요 😊",
  KYC_PENDING: "⏳ 본인 확인을 검토 중이에요. 잠시만 기다려 주세요 🙏",
  KYC_REJECTED: "😔 본인 확인이 반려됐어요. 다시 신청해 주세요",
  KYC_APPROVED: "✅ 본인 확인 완료! 이제 출금할 수 있어요 🎉",
  CIRCUIT_OPEN: "⏸️ 잠시 거래를 멈췄어요. 곧 다시 열릴게요",
  BUCKET_INVARIANT_FAIL:
    "⏸️ 잔액 확인이 필요해서 잠시 멈췄어요. 곧 안내드릴게요",
  RATE_LIMITED: "🐢 잠깐만요! 너무 빠르게 눌렀어요",
  OPPORTUNITY_EXPIRED: "⏰ 이 기회는 방금 마감됐어요",
  EXEC_SAFE_STOP_PRICE: "🛡️ 가격이 움직여서 이번엔 안전하게 멈췄어요",
  EXEC_SAFE_STOP_MIN: "🛡️ 예상보다 적어져서 진행하지 않았어요 (잔액 그대로)",
  EXEC_SUCCESS: "🎉 수익이 들어왔어요",
  EXEC_CANCELLED: "🛑 중단했어요. 잔액은 그대로예요",
  WITHDRAW_PROFIT_OK: "🎉 수익 출금을 신청했어요",
  WITHDRAW_PRINCIPAL_WARN:
    "💡 원금을 빼면 다음 기회 참여가 줄어들 수 있어요",
  INSUFFICIENT_PROFIT: "😅 출금 가능한 수익이 부족해요",
  INSUFFICIENT_PRINCIPAL: "😅 근무 중 원금이 부족해요. 충전 후 참여해 주세요",
  PRACTICE_NOT_WITHDRAWABLE: "🎁 연습 잔액은 출금할 수 없어요",
  PRACTICE_GRANTED: "🎁 연습 잔액이 생겼어요. 출금은 안 돼요",
  PRACTICE_EXPIRED: "⏰ 연습 잔액이 만료됐어요",
  MERGE_PROFIT_OK: "✨ 수익을 원금에 합쳤어요. 다음 기회에 바로 쓸 수 있어요",
  DEPOSIT_DETECTED: "👀 USDT {amount} 입금 감지! 확정까지 잠시만요",
  DEPOSIT_CONFIRMED: "🎉 USDT {amount} 입금 확정! 바로 거래할 수 있어요",
  KRW_DEPOSIT_SUBMITTED: "📝 원화 입금 신청 접수! 송금 후 확인해 드릴게요",
  KRW_DEPOSIT_APPROVED: "✅ 원화 입금이 확인됐어요. 잔액에 반영됐어요 🎉",
  KRW_DEPOSIT_REJECTED:
    "😔 원화 입금을 확인할 수 없어요. 내역에서 이유를 확인해 주세요",
  /** Index/§8.2 short alias — same body as KRW_DEPOSIT_REJECTED */
  KRW_REJECTED:
    "😔 원화 입금을 확인할 수 없어요. 내역에서 이유를 확인해 주세요",
  KRW_DEPOSIT_EXPIRED: "⏰ 입금 신청이 만료됐어요. 다시 신청해 주세요",
  DEPOSIT_DISPUTE_SUBMITTED: "📝 문의를 접수했어요. 확인 후 안내드릴게요",
  DEPOSIT_DISPUTE_CREDITED: "✅ 확인했어요. 잔액에 반영됐어요 🎉",
  DEPOSIT_DISPUTE_REJECTED:
    "😔 이번 건은 반영하기 어려워요. 내역에서 이유를 확인해 주세요",
  WITHDRAW_SUBMITTED: "📤 출금 요청을 받았어요",
  TRADE_COMPLETE: "🎉 +{amount} USDT 지급 완료!",
  NETWORK_ERROR: "📡 연결이 불안정해요. 다시 시도해 주세요",
  SESSION_EXPIRED: "🔐 다시 로그인해 주세요",
  ACCOUNT_FROZEN: "⏸️ 계정이 일시 정지됐어요. 고객센터에 문의해 주세요",
  ACCOUNT_BANNED: "🚫 이용이 제한된 계정이에요",
  WITHDRAW_BLOCKED: "📤 출금이 일시 중지됐어요",
  MATCH_BLOCKED: "⏸️ 지금은 매칭을 진행할 수 없어요. 고객센터에 문의해 주세요",
  PREFLIGHT_REQUIRED: "🛡️ 참여 전 안내를 확인한 뒤 다시 눌러 주세요",
  WITHDRAW_APPLY_BLOCKED:
    "📤 지금은 출금 신청을 받을 수 없어요. 고객센터에 문의해 주세요",
  PASSWORD_RESET_BY_OPS: "🔐 로그인 비밀번호가 재설정됐어요. 다시 로그인해 주세요",
  WITHDRAW_PIN_RESET:
    "🔑 출금 비밀번호가 초기화됐어요. 다음 출금 때 다시 등록해 주세요",
  WITHDRAW_STEP_UP_REQUIRED: "🔐 출금하려면 본인 확인이 한 번 더 필요해요",
  PIN_REQUIRED: "🔑 출금 비밀번호를 다시 등록해 주세요",
  WEBAUTHN_REVOKED:
    "🔐 패스키가 해제됐어요. 이메일·비밀번호로 본인 확인해 주세요",
  STEP_UP_CHALLENGE_EXPIRED: "⏱️ 확인 시간이 지났어요. 다시 시도해 주세요",
  WEBAUTHN_STEP_UP_NOT_READY: "🔐 이 확인 방법은 아직 쓸 수 없어요. 다른 방법으로 확인해 주세요",
  EMAIL_STEP_UP_VERIFICATION_REQUIRED: "📧 이메일 확인이 끝난 뒤에 이 방법을 쓸 수 있어요",
  PIN_ENROLLMENT_STEP_UP_REQUIRED: "🔐 출금 비밀번호를 바꾸려면 먼저 다른 본인 확인이 필요해요",
  STEP_UP_TOKEN_EXPIRED: "⏱️ 확인이 만료됐어요. 다시 시도해 주세요",
  STEP_UP_TOKEN_REPLAYED: "🔐 이 확인은 이미 사용됐어요. 다시 확인해 주세요",
  BALANCE_ADJUSTED: "💰 잔액이 조정됐어요",
  DEPOSIT_CONFIG_UPDATED: "🔄 입금 정보가 업데이트됐어요",
  MIN_HOLDING: "⏳ 원금은 충전 후 {hours}시간이 지나야 출금할 수 있어요",
  WITHDRAW_FEE_HINT: "💸 이체 수수료 {fee} USDT가 빠져요",
  REFERRAL_BOUND: "🤝 초대가 연결됐어요!",
  REFERRAL_L2_PENDING: "⏳ 친구 첫충전 보너스를 확인 중이에요",
  REFERRAL_L2_RELEASED: "🎉 초대 보너스가 수익에 들어왔어요",
  REFERRAL_CLAWBACK: "↩️ 어뷰징으로 초대 보너스가 회수됐어요",
  REFERRAL_HELD: "⏸️ 초대 보너스가 잠시 보류됐어요",
  REFERRAL_CAP: "📊 오늘 공유 보내기 한도에 도달했어요",
  REFERRAL_POOL_WAIT: "⏳ 보너스를 준비 중이에요. 초대는 유지돼요",
  REFERRAL_SHARE_LIMIT: "🐢 공유는 하루 {n}번까지예요",
  CAMPAIGN_CLAIM_OK: "🎁 이벤트 보너스를 받았어요",
  CAMPAIGN_ENDED: "⏰ 이 이벤트는 종료됐어요",
  CAMPAIGN_BUDGET: "📭 이벤트 예산이 마감됐어요",
  CAMPAIGN_DUP: "✋ 이미 받은 보너스예요",
  MISSION_RELEASED: "🎁 미션 보너스를 받았어요",
  MISSION_POOL_WAIT: "⏳ 보너스 준비 중이에요",
  MISSION_HOLD: "⏳ 미션 보너스를 확인 중이에요",
  MISSION_CLAWBACK: "↩️ 부정 이용으로 미션 보너스가 회수됐어요",
  STREAK_COUPON: "🎫 연속 미션 수수료 쿠폰을 받았어요",
  NOTICE_PUSH: "📢 새 공지가 있어요",
  PEOTTEOK_LLM_BUSY: "🤖 퍼뜩이 잠시 바빠요. 조금 뒤 다시 물어봐 주세요",
  FONT_SCALE_CHANGED: "🔤 글자 크기를 바꿨어요",
} as const;

export type ToastCopy = typeof toast;
export type ToastCode = keyof typeof toast;
