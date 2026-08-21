---
name: mobile-home-polish
overview: 사용자가 제공한 PC·모바일 실측 이미지를 Mobile Reference로 반영하고, Hero→Money→Opportunity를 모바일 우선으로 단순화합니다. 자동 발광·가짜 긴급성 대신 고대비·큰 터치 영역·명확한 상태별 CTA로 클릭 의도를 높이며 Fact/API 경계는 유지합니다.
todos:
  - id: mobile-contract
    content: 제공된 Mobile Reference와 Slice HOLD 상태를 Canon/Contract/Wire에 정렬
    status: completed
  - id: mobile-hero
    content: Hero 2줄 제목·2×2 timeline·compact artwork·full-width CTA를 mobile-only로 구현
    status: completed
  - id: money-amend
    content: Money CTA 위치·색상·카드 밀도를 Fact 변경 없이 보완
    status: completed
  - id: opportunity-mobile
    content: Opportunity 제목 우선·빈 필터 숨김·단일 CTA·모바일 카드 위계 단순화
    status: completed
  - id: cta-motion
    content: 무한 glow pulse를 제거하고 접근성 준수 상호작용 피드백으로 교체
    status: completed
  - id: verify-audit
    content: 도메인/T0 gate와 responsive·protected diff 감사를 완료
    status: completed
isProject: false
---

# 퍼뜩 홈 모바일 완성도 보완

## 결정 원칙
- `Glow / neon`, 무한 pulse, count-up, 가짜 긴급성은 현행 Contract와 충돌하므로 추가하지 않는다. 현재 [`MotionCTA.tsx`](packages/ui/components/lux/MotionCTA.tsx)의 기본 infinite pulse도 자동 발광이 아닌 200–300ms hover/focus/active 피드백으로 교정한다.
- 성별·숫자 나이 분기 없이 `fontScale`, 48px 이상 터치 영역, 쉬운 중성 존댓말로 대응한다.
- `principalUsdt`, today-possible 합계, opportunity feed만 사용한다. API·SDK·mapper·Auth·Ledger·Wallet 변경 및 mock 숫자는 0이다.

## 1. Mobile Reference와 상태 SSOT 정렬
- [`peotteok-home-visual-implementation-contract.v1.md`](packages/ui/canon/contracts/peotteok-home-visual-implementation-contract.v1.md), [`peotteok-home-visual-contract.v1.md`](packages/ui/canon/contracts/peotteok-home-visual-contract.v1.md), [`home-visual-v2.wire.json`](packages/ui/canon/surfaces/home-visual-v2.wire.json)에 제공된 320–430px 실측 기준을 기록한다.
- 모바일 순서 Header→Hero→Money→Opportunity→BottomNav, Hero 320–420px, 4단 timeline, Fact-only Money를 잠근다.
- [`peotteok-home-implementation-gate.v1.md`](packages/ui/canon/contracts/peotteok-home-implementation-gate.v1.md)의 Slice 3 CLOSED 과대 표기는 구현·검증 완료 시점까지 HOLD로 정정한다.

## 2. Hero 모바일 밀도와 artwork 통합
- [`HomeHero.tsx`](packages/ui/components/home/HomeHero.tsx)의 copy·4단 timeline·CTA target은 그대로 둔다.
- [`component.css`](packages/ui/tokens/component.css)에서 768px 미만만 조정한다: 제목 `word-break: keep-all` + balanced 2줄, timeline 2×2, CTA full-width, 간격 축소, illustration 128–160px, 전체 Hero 320–420px 목표.
- 기존 AVIF/WebP와 `object-fit: contain`을 유지한다. desktop 480–600px 및 illustration ≤46%는 보존하고, desktop artwork wrapper만 허용 범위에서 확대해 빈 공간을 줄인다.
- 사각 asset 경계는 새 이미지나 임의 필터 없이 wrapper/background 위치·크기 정합으로만 완화한다.

## 3. Slice 3 Money amend
- [`HomePrincipalRail.tsx`](packages/ui/components/opportunity/HomePrincipalRail.tsx)에서 잔액 카드 header에 label과 입금 CTA를 배치하고, 숫자 위계를 단순화한다.
- 모바일은 두 카드를 촘촘한 단일 요약군처럼 스택하고 desktop은 기존 2열·equal-height를 유지한다.
- 잔액 숫자는 본문색, 가능 수익만 초록색으로 사용하고 장식용 3px top border를 제거한다.
- 사용가능/참여중, 차트, 성장률, 누적 수익은 추가하지 않는다.

## 4. Slice 4 Opportunity 모바일 단순화
- [`BalanceAwareHome.tsx`](packages/ui/components/opportunity/BalanceAwareHome.tsx)에서 섹션 제목/가능 건수를 필터보다 먼저 보여주고, feed가 비면 category chips를 숨긴다.
- 빈 상태의 자기 자신 링크(`#home-opportunity`)와 경쟁 CTA를 제거하고, 실제 Fact가 없어도 거짓말하지 않는 단일 다음 행동(`/profits`)으로 정리한다. 관련 카피는 [`home.ts`](packages/ui/copy/ko/home.ts)와 [`feed.ts`](packages/ui/copy/ko/feed.ts)에서만 관리한다.
- [`OpportunityCard.tsx`](packages/ui/components/opportunity/OpportunityCard.tsx)는 모바일 첫 화면에 이미지·상품명·필요 금액·가능 수익·`수익 벌기`를 우선하고, 보조 trust/compare 정보는 작은 화면에서 후순위 처리한다. affordable/nearMiss/lockedHigh와 상세 경로는 유지한다.
- 모바일 sticky CTA는 BottomNav safe-area 위에 유지하되 자동 pulse/glow 없이 고대비 full-width와 명확한 press/focus 피드백을 사용한다.

## 5. 모션·접근성·회귀 검증
- [`MotionCTA.tsx`](packages/ui/components/lux/MotionCTA.tsx)와 [`motion.css`](packages/ui/tokens/motion.css)의 무한 `box-shadow` pulse를 제거하고, `prefers-reduced-motion`·device tier를 유지한다.
- 320/360/375/390/414/430px에서 제목 분리, Hero clipping, CTA overlap, horizontal overflow, BottomNav 가림을 점검하고 768/1280/1920px에서 desktop geometry 회귀를 확인한다.
- `home-live-wire`, `home-principal-slots`, `canon-surfaces`, `no-it-jargon`, `cta-earn-profit`, `brand-consumer`, `mockup-governance`, `ia-tabs`, `lux-theme-sync`, responsive 관련 gate, `verify:gate:fast`를 실행한다.
- 마지막에 `git diff`로 Home presentation/copy/canon/token 외 protected diff가 0인지 감사한다. 커밋·push는 별도 요청 전 보류한다.