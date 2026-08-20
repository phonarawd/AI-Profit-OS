# REL-104 ONBOARDING EVIDENCE

```text
REL = REL-104
TITLE = Onboarding (/onboarding) 클로저
STATUS = COMPLETED
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
FAKE_TUTORIAL_PROFIT = 0
FAKE_LIVE_DATA = 0
```

## CURRENT_SCOPE

`/onboarding` Track C 재확인. 가짜 튜토리얼 수익 금지. FIG=NOT_FOUND → 시각 전면 재발명 없음. 기존 `OnboardingFlow` 유지.

## IMPLEMENTATION

- Canon `OnboardingFlow` 단계 유지: tone → identity → partner → demo → usdt → action → payout → `/`.
- 체험 블록: MarketDiffDemo, MatchConfidenceCard, BuyingPowerMeter, OpportunityDemoCard.
- 숫자는 「체험용 예시」. 실시간 확정 결과 아님.
- BuyingPower는 금액 발명 0. `data-money="unavailable"`. missing ≠ 0.
- 최종 CTA는 Home `/`. 입금 깔때기 0.
- prefers-reduced-motion 존중.

## VERIFY

| command | result |
|---|---|
| `node tooling/verify/onboarding-journey-closure.cjs` | PASS |
| `node tooling/verify/onboarding-experiential.cjs` | PASS |
| committed spec `onboarding-experiential-runtime.spec.cjs` | 파일+axe in-process |
| runtime `PLAYWRIGHT_BASE_URL` | NOT_RUN |

## ACCEPTANCE

전면 재구현 없이 잔여 게이트 닫힘. 다음 단계는 실제 Home.

## EXIT_GATE

가짜 숫자를 REAL로 선언하지 않음.
