# PUTDUK UI Authority v1

**Status:** ACTIVE  
**Date:** 2026-08-29  
**Product:** 퍼뜩 (consumer) · AI Profit OS (platform)

이 문서가 현재 트리의 **유일한 UI 권위**다.  
과거 Lux / peotteok-light purple / 평행 셸 / 중복 NAV 배열은 권위가 아니다.

---

## 1. Brand authority

| 층 | 이름 | 사용 |
|---|---|---|
| Consumer | **퍼뜩** | 유저 surface 전면 |
| AI assistant | **퍼뜩 AI** | 코치/채팅이 별도 개념일 때만 |
| Platform | AI Profit OS | 운영/내부 |
| Legal | §50.9 | 약관·사업자 |

- 워드마크 + Spark 마크 자산 하나만 사용한다. `✦` placeholder 금지.
- 다른 서비스 UI를 복제하지 않는다.
- 코드/디자인 시스템 이름에 Toss를 쓰지 않는다. 참고하는 것은 절제·신뢰·여백·쉬운 한국어·한 화면 한 목적뿐이다.

## 2. Visual philosophy

최종 시스템 = **PUTDUK Premium Foundation + Spark Dash visual identity**.

| Surface | Spark Dash | Premium financial simplicity |
|---|---|---|
| Desktop | 60–65% | 35–40% |
| Mobile | 30–35% | 65–70% |

허용: 타이포, 여백, 절제된 depth, 정적 최적화 artwork, 150–250ms transform/opacity.  
금지: 과한 glow/blur 남발, 장식 WebGL, 가짜 실시간, money count-up 도파민, 화면 IT 용어.

Home Desktop/Mobile geometry는 Founder lock이다. 색·간격·히어로를 이 작업에서 임의로 바꾸지 않는다.

## 3. Token ownership

**유일한 active token namespace = `--pd-*`.**

색·radius·shadow·spacing·motion의 권위는 `packages/ui/foundation/` 이다.

- Tailwind `@theme`는 `--color-pd-*` / `--radius-pd-*` / `--shadow-pd-*` 로 유틸을 만든다.
- `--sd-*` / `--sdp-*` 는 클래스 이름을 위해 **alias만** 허용한다. 새 브랜드 값을 발명하지 않는다.
- route CSS가 자기 브랜드 색·radius·shadow를 다시 발명하면 FAIL.

## 4. Navigation SSOT

Canonical registry = `packages/ui/navigation/consumer-navigation.ts`.

semantic · href · canonical label 은 여기서만 결정한다.  
local hardcoded NAV 배열 반복 = 0.

## 5. Consumer / Desktop / Mobile IA

Mobile primary: 홈 · 기회 · 내 자산 · 알림 · 더보기  
Desktop: 같은 registry에서 참여 내역 · 정산 내역 · 파트너 · 설정을 펼친다.

표시 개수는 달라도 semantic/href/label 권위는 하나다.

Home locked chrome의 표시 문구가 freeze와 충돌하면 **Home freeze가 이긴다.**  
그 예외는 이 문서 §13과 Home contrast 예외로만 기록한다.

## 6. Shell ownership

| Shell | 소유 |
|---|---|
| `ConsumerAppShell` | 로그인 consumer 기본 골격 |
| `GuestShell` | ads / landing / auth / onboarding |
| `AdminShell` | /admin 정보 밀도만 높게 |

Home / Profits / Account 의 Founder-approved visual composition은 파괴하지 않는다.  
전역 NAV 데이터는 registry에서만 온다.

## 7. Component hierarchy

`foundation` → `primitives` → `patterns` → route content.

Opportunity card 의 Product Pattern 권위는 `packages/ui/patterns/opportunity/OpportunityCard.tsx` 하나다.

## 8. Runtime state model

읽기: `loading` · `ready` · `empty` · `error` · `unauthorized` · `disabled`  
쓰기: `idle` · `saving` · `success` · `save_failed`

성공을 실패처럼, 실패를 성공처럼, error를 empty처럼 쓰지 않는다.  
fake 0 / fake money / fake success / silent revert 금지.

## 9. Responsive rules

Viewports: 320 · 360 · 390 · 430 · 768 · 1024 · 1280 · 1366 · 1440 · 1920.

PC를 모바일에 단순 축소하지 않는다.  
Mobile = 한 화면 한 목적 · bottom nav · 잘린 한글 0 · 가로 오버플로 0.  
Desktop = 더 풍부한 정보 · 안정적인 content rail.

## 10. Accessibility

keyboard · focus-visible · accessible name · label · modal/sheet focus · aria-live(saving/error) · 약 48px touch · reduced-motion · contrast.

Home `.sd-btn-deposit` white on `#ff2d6b` ≈ 3.59:1 은 Founder lock.

- `WCAG_CONTRAST_PASS = NO`
- `GOVERNANCE_EXCEPTION = APPROVED`
- `KNOWN_ISSUE = OPEN`

Home 밖 동일 저대비는 foundation에서 제거한다.

## 11. Performance philosophy

HTML/CSS/SVG → React 최적화 → virtualization → worker → canvas → WebGL 순.  
Premium ≠ blur/glow/animation 많이 넣기.  
로컬 OOM은 제품 시각 다운그레이드 사유가 아니다.

## 12. Figma authority rules

Figma/참고 PNG는 분석용이다. 픽셀 QA Truth가 아니다.  
Approved Visual Master → Visual Contract 만 시각 권위가 된다.  
`docs/mockups/**` · `*mockup*.png` 재반입 금지.

## 13. Legacy removal rule

삭제 전 runtime import · test · export · build 참조를 확인한다.  
`RUNTIME_REFERENCE_COUNT = 0` 인 것만 삭제한다.  
추측 삭제 금지.

## 14. No-Lux rule

현재 트리에서 Lux 디자인 시스템 = 0.

파일명 · import · CSS 변수 · 유틸 클래스 · 테스트 · 설정 · 활성 문서에  
`lux-theme` · `lux-fintech` · `color-lux` · `bg-lux` · `components/lux` 등이 있으면 FAIL.

Git history rewrite는 하지 않는다.  
상품 카테고리 `luxury-bag`(명품 가방 vertical)은 디자인 시스템이 아니다.

## 15. No fake data rule

fake balance / profit / count / monthly stats / realtime / success / persistence / admin data / partner readiness 금지.  
없으면 empty · unavailable · hidden 중 실제 truth.

## 16. No dead CTA rule

button처럼 보이는 no-op = 0.  
목적지 없는 anchor = 0.  
빈 onClick = 0.  
동작 없는 filter chip을 인터랙티브처럼 그리지 않는다.
