# PUTDUK Product Design & Engineering Operating System

> **문서 종류:** PROCESS AUTHORITY — **어떻게** 일하는가.  
> **일자:** 2026-08-18 · Phase 3 pointer  
> **상태:** PROCESS ACTIVE  
> **시각 디자인 사전 고정:** NO  
> **Phase 3 PRODUCT_TRUTH 산출물:** `docs/product/consumer/`  
> **실행:** 본 문서는 프로세스만 정의한다. Consumer UX Architecture SSOT = `docs/product/consumer/CONSUMER_UX_ARCHITECTURE.md`. Core Loop 계약 = `docs/product/consumer/CONSUMER_CORE_LOOP_CONTRACT.md`. Home presentation = FOUNDER APPROVED / LOCKED (`governance/consumer-home-approval/home-approval-freeze.v1.json`). Admin future requirements = `governance/admin/admin-control-plane.v1.json` (구현 0 · 04 pending 위조 0). 다른 페이지 Brand / Mockup / Figma 구현은 Founder 승인 전 착수 0.

```text
defines process = YES
defines visual design before Figma = NO
OPERATING_SYSTEM_FREEZES_VISUAL_STYLE_BEFORE_FIGMA = NO
CURRENT_ACTIVE_PLAN = YES   # future Founder-approved plans only — not the legacy 9
```

이 문서는 Visual Master / Canon / Lux 후속이 아니다. 색·radius·간격 스케일·카드 생김새·네비게이션 외형·모션 캐릭터를 지금 잠그지 않는다.

관련 인덱스: `docs/reference/founder-intent/`

---

## 1. Authority

```text
BUSINESS_TRUTH        = CURRENT DOMAIN / SERVER / ENGINE / MONEY / LEDGER
PRODUCT_TRUTH         = FOUNDER-APPROVED PRODUCT + UX ARCHITECTURE
PRESENTATION_TRUTH    = NEW APPROVED FIGMA ONLY
IMPLEMENTATION_TRUTH  = CURRENT VERIFIED CODE
PLAYWRIGHT            = VERIFICATION EVIDENCE
```

```text
NEW APPROVED FIGMA = NONE
HOME PRESENTATION BASELINE = FOUNDER APPROVED / LOCKED
```

금지된 권위 승격:

- 구 Visual Master / Visual Contract / Canon / Lux / Light+Purple
- 구 고정 5탭 / 구 Home / 구 mockup / 구 Git UI
- 레거시 03 플랜 pending을 현재 Consumer 실행 큐로 읽기
- Figma가 Business Truth를 발명
- 코드가 승인 전 presentation을 발명
- Cursor가 Product Truth를 발명

---

## 2. Three classes

### HARD (위반 불가)

- Business Truth / Money Truth
- 가짜 데이터 금지 (`FAKE_USER` · `FAKE_FOMO` · `FAKE_ACTIVITY` · `FAKE_MATCHING_PROGRESS` · `FAKE_STEPPER`)
- 네이밍 일관성 (Figma ↔ 코드)
- Figma 핸드오프 무결성 (구조 컨텍스트 + 스크린샷)
- 검증 프로토콜 (typecheck · geometry · visual · a11y · E2E)
- Git / Admin 안전 (push · force · 파괴적 reset · production migration · production money)

### PROCESS (워크플로)

- UX Architecture
- Brand / Visual Direction
- Figma-ready mockup → Native Figma
- Cursor Plan Mode → 슬라이스 구현
- QA / Playwright / E2E

### FLEXIBLE (미래 승인 Figma가 정함)

지금 값을 만들지 말 것:

- visual style
- colors
- radius
- spacing scale
- screen composition
- typography visual hierarchy
- card design
- navigation presentation
- motion character

---

## 3. Product development lifecycle

기록만. **지금 실행하지 않음.**

```text
PHASE 3
Consumer UX Architecture
↓
Screen Inventory
↓
Journey Map
↓
State Inventory
↓
Navigation / IA
↓
CTA Map
↓
Business / Data / State Owner Matrix
↓
Error / Empty / Loading / Success Matrix
↓
Brand / Visual Direction
↓
Figma-ready Implementation Mockup
↓
Founder Approval
↓
Native Figma
↓
Ready for Dev
↓
Figma MCP structured context + screenshot
↓
Code Connect where available
↓
Cursor Plan Mode
↓
logical slice implementation
↓
UI interaction wiring
↓
Backend / SDK / Engine wiring
↓
DOM geometry verification
↓
Playwright visual convergence
↓
Responsive
↓
Accessibility
↓
Browser
↓
Performance
↓
E2E
↓
PASS
```

---

## 4. UX Architecture process

Phase 3 (Founder `NEW CONSUMER UX ARCHITECTURE = GO` 후)에서만:

1. 누가 무엇을 왜 하는가 (20~70 · 3초)
2. Screen Inventory
3. Journey Map
4. State Inventory (Engine 소유 상태만)
5. Navigation / IA (고정 5탭을 기본값으로 부활시키지 않음)
6. CTA Map (죽은 CTA 0)
7. 레거시 03/Canon/Home을 입력으로 쓰지 않음

출력 = Founder 승인 문서. 코드/Figma 생산 디자인이 아님.

---

## 5. Business / Data / State owner process

모든 금액·FX·자격·매칭·정산·입출금 필드에:

| 필드 | 질문 |
|------|------|
| owner | Engine / Money / Auth / Growth / 없음 |
| source | API / SDK / 서버 매퍼 |
| asOf | 신선도 |
| inventable by UI | NO |

UI가 owner를 발명하면 FAIL.

---

## 6. Figma file architecture

미래 파일 구조:

```text
00_Readme
01_Foundations
02_Primitives
03_Components
04_Patterns
05_Flows
06_Screens
07_Dev-Handoff
90_Explorations
```

### Foundations

Color · Typography · Spacing · Radius · Elevation · Motion · Grid · Responsive / Breakpoint logic  
(값은 Brand/Visual Direction 승인 후.)

### Primitives (이름 예시 · 생김새 아님)

Button · IconButton · TextField · Badge · Chip · Divider · Avatar · Amount

### Components (이름 예시)

BalanceSummary · OpportunityCard · RequiredCapital · MatchingStatus · TransactionRow · PartnerBadge · AIInsight

### Patterns (이름 예시)

OpportunityFeed · DepositPrompt · MatchingJourney · SettlementSummary · PartnerTrust · TransactionLifecycle

### Flows (이름 예시)

Signup · Participate · Matching · Deposit · Withdraw · Settlement · Referral

---

## 7. Figma native requirements (`FIGMA_READY`)

화면이 “예뻐 보인다”만으로 완료가 아니다.

```text
visual approved
Auto Layout
Variables
semantic tokens
named Components
Variants / properties
responsive behavior
actual Korean copy
required states
interaction intent
annotations
measurements
asset mapping
data-owner annotations
accessibility intent
reduced-motion intent
Ready for Dev
```

납작한 PNG 한 장을 디자인 진실로 쓰지 않는다.

---

## 8. Figma Auto Layout / responsive

선호:

```text
Auto Layout
Hug
Fill
min/max constraints
nested layout logic
content-driven sizing
representative responsive frames
```

기기 모델마다 별도 하드코드 디자인 시스템을 만들지 않는다.

---

## 9. Figma naming

**무엇인지를** 이름에 쓴다. 색·버전·임시 위치·현재 외형을 이름에 쓰지 않는다.

Good: `Button` · `OpportunityCard` · `BalanceSummary` · `RequiredCapital` · `MatchingStatus` · `PartnerBadge` · `TransactionRow` · `DepositMethod` · `AIInsight`

Bad: `PurpleButton` · `BigDarkCard` · `GlassCardNew` · `HomeCardV7` · `FinalButton2`

---

## 10. Figma component properties

Good: `state` · `size` · `emphasis` · `status` · `capitalStatus`

Bad: `Property 1` · `Property 2` · `Variant 3` · `Boolean 4`

속성은 의미를 전달해야 한다. Engine이 소유하지 않는 Business 상태를 만들지 않는다.

---

## 11. Code naming parity

```text
Figma: OpportunityCard
React: OpportunityCard.tsx

Figma: MatchingStatus
React: MatchingStatus.tsx
```

- React 컴포넌트: `PascalCase`
- Hooks: `useXxx` (예: `useOpportunityStatus` · `useMatchingStatus`)

---

## 12. Semantic tokens

의미 이름을 쓴다. 팔레트 별명·구 Lux 이름을 쓰지 않는다.

Good (이름만 · 값 없음):

```text
color/background/canvas
color/background/surface
color/background/elevated
color/text/primary
color/text/secondary
color/text/disabled
color/border/default
color/border/strong
color/status/success
color/status/warning
color/status/danger
```

Avoid: `purple500` · `black900` · `glassBlue` · `luxCard`

이후 CSS 매핑 예 (값 미정):

```text
--color-bg-canvas
--color-bg-surface
--color-text-primary
--color-border-default
```

Brand/Visual Direction 승인 전 hex/rgb를 이 문서에 적지 않는다.

---

## 13. Ready for Dev

네이티브 Figma 프레임이 §7을 충족하고 Founder가 승인해야 `Ready for Dev`.  
Explorations (`90_`)는 구현 입력이 아니다.

---

## 14. Figma MCP handoff

금지된 주 경로:

```text
PNG → Cursor가 눈으로 보고 → CSS 추측
```

선호:

```text
Approved Native Figma
↓
selected Frame / Component
↓
Figma MCP structured design context
↓
variables / components / layout context
↓
screenshot
↓
annotations / measurements
↓
existing code component audit
↓
implementation
```

```text
MCP structured context = structural handoff
Screenshot = visual verification reference
```

둘 다 사용. 픽셀만으로 구조를 추론하지 않는다.

---

## 15. Code Connect

계정/기능이 지원하면:

```text
Figma OpportunityCard  ↔  React OpportunityCard
```

없으면 블로커가 아니다. fallback:

```text
Figma MCP + strict naming parity + existing component search
```

---

## 16. Cursor rules

규칙은:

```text
small · focused · actionable · scoped · composable
```

거대 Constitution / Canon / Visual Master 규칙을 다시 만들지 않는다.  
HARD만 규칙화하고 긴 본문은 이 문서·founder-intent를 가리킨다.

후보 (구현은 해당 Phase에서):

```text
business-truth
money-safety
approved-figma
korean-ui
git-admin-safety
```

---

## 17. Cursor Skills strategy

반복 워크플로는 Skill 후보. **이 Phase에서 Skill 파일을 만들지 않는다.**

```text
/figma-to-code
/visual-qa
/money-truth-audit
/e2e-money-flow
```

미래 `/figma-to-code`가 다룰 순서:

```text
1. Figma context
2. screenshot
3. annotations
4. existing component search
5. token mapping
6. implementation plan
7. implementation
8. typecheck
9. geometry verification
10. Playwright
11. report
```

---

## 18. Cursor Plan Mode

복잡한 화면을 즉시 코딩하지 않는다.

```text
READ ONLY investigation
↓
repo architecture inspection
↓
Figma inspection
↓
existing component audit
↓
SDK/API/data-owner inspection
↓
implementation plan
↓
review
↓
implementation
```

---

## 19. Logical slice implementation

복잡한 Home을 한 번에 구현하지 않는다. 미래 슬라이스 예:

```text
Shell
↓
BalanceSummary
↓
OpportunitySection
↓
OpportunityCard
↓
RequiredCapital
↓
MatchingStatus
↓
AIInsight
↓
PartnerTrust
```

각 슬라이스:

```text
Figma context → existing code audit → implement → typecheck → geometry inspect → visual verify → PASS
```

그다음 다음 슬라이스.

---

## 20. Agent safety

저사양 PC:

```text
one bounded task → verify → checkpoint → next
```

불필요한 로컬 병렬 에이전트 금지.

명시 승인 필요:

- git push
- force push
- destructive reset
- production migration
- destructive DB
- production money

읽기 / 검색 / typecheck / 타깃 테스트는 안전한 범위에서 자동화 가능.

---

## 21. Next.js / React

현재 스택 유지: next@16 · React · Tailwind v4 · OpenNext/Cloudflare.

선호:

```text
Server Components → authoritative fetch / presentation data
Client Components → 실제 클라이언트 상호작용/상태가 필요할 때만
```

권위 있는 Money/FX 로직을 Client Component로 옮기지 않는다.

```text
Backend / Engine
↓
SDK / canonical contract
↓
server-side adapter
↓
Presentation Model
↓
React Component
```

---

## 22. Presentation Model

UI/Presentation **해도 되는 것:**

- format
- label
- visibility
- canonical state → copy
- data → layout

**하면 안 되는 것 (발명 금지):**

- balance · FX · profit · fee
- eligibility · matching state · settlement state
- deposit/withdraw state · transaction history

---

## 23. Matching state architecture

```text
Engine State
↓
Canonical State Contract
↓
Presentation Mapping
↓
Figma Visual State
```

금지:

```text
beautiful fake Figma progress → Engine이 그것을 흉내 냄
```

`FAKE_STEPPER = FORBIDDEN`

---

## 24. Money state visual language (후보 · 현재 진실 아님)

미래 방향 **후보** (Engine 상태 검증 후에만 채택):

```text
Available → Committed → Matching → Matched → Settlement Pending → Settled
```

지금 이 enum을 런타임 진실로 만들지 않는다.

---

## 25. Responsive architecture

기기 모델당 UI 1벌을 하드코딩하지 않는다.

Figma: Auto Layout · Hug/Fill · min/max · content priority · 대표 프레임

Code: flex · grid · fluid · min/max · container queries · content breakpoints · max-width

사용 범위 대략:

```text
320px narrow · mobile · large mobile · tablet · laptop · 1440 · 1920 · ultrawide · 4K
```

큰 화면: max content width · 여백 · secondary rails · 적응 컬럼. 단순 늘리기 금지.

---

## 26. Accessibility

목표: `WCAG 2.2 AA`

검증: keyboard · focus · contrast · touch targets · zoom · reflow · screen-reader · reduced motion · overflow

핵심 CTA는 적절하면 ~44px급 타깃.

---

## 27. Performance

```text
LCP <= 2.5s
INP <= 200ms
CLS <= 0.1
```

75th percentile 목표. Premium ≠ heavy.

피할 것: 과도한 blur · 거대 배경 영상 · 불필요 3D · 과도한 JS · 동시 애니메이션 다수 · 오프스크린 무거운 렌더.

스택은 현재 Next/React/Tailwind/OpenNext/Cloudflare.

---

## 28. React optimization

다음을 맹목적으로 쓰지 않는다:

```text
memo everywhere
useMemo everywhere
useCallback everywhere
```

먼저 측정. 증명된 병목만 최적화.

---

## 29. Visual fidelity

목표: **통제된 참조 환경에서 거의 1:1 수렴.**  
모든 OS/브라우저에서 불가능한 픽셀 동일성이 아님.

참조 환경이 잠글 것:

```text
browser · viewport · auth · user · dataset
FX snapshot · matching state · route · font · DPR
```

---

## 30. Three-layer visual verification

### Layer 1 — Figma structural truth

node geometry · spacing · typography · variables · components · variants

### Layer 2 — Browser structural truth

DOM bounding boxes · computed styles · font · line-height · padding · gap · radius · layout

### Layer 3 — Pixel truth

Playwright screenshot · overlay · pixel diff

픽셀 diff만 의지하지 않는다.

---

## 31. Playwright

Playwright는 **승인 Figma → Cursor 구현 후** 검증에 쓴다. 목업 제작용이 아니다.

시각 비교는 동일해야 한다:

```text
route · auth · user · dataset · FX snapshot
matching state · viewport · browser · reference environment
```

금지된 불일치 반복:

```text
preview vs production
fixture vs real
guest vs authenticated
```

---

## 32. Definition of Done — component

해당할 때:

```text
Figma mapping
semantic naming
token use
real data owner
typecheck
responsive behavior
accessibility
reduced motion
browser behavior
geometry verification
visual verification
no fake truth
```

---

## 33. Definition of Done — screen

```text
Approved UX purpose
Approved Figma
all required states
real CTA routes
real data owners
no dead CTA
no fake facts
responsive
accessible
visual convergence
browser correctness
performance sanity
```

---

## 34. E2E

궁극적으로 끝까지 검증할 여정 예:

```text
Opportunity → Participate → Matching → State update → Settlement → Wallet/Ledger
```

그리고:

```text
USDT Deposit
USDT Withdraw
KRW Deposit
KRW Withdraw
```

---

## 35. Future first production screen

Phase 2 + 본 OS 승인 후 다음 일은 코딩이 아니다.

```text
Consumer UX Architecture
↓
Business/Data/State Matrix
↓
Brand/Visual Direction
↓
first Figma-ready Home mockup
↓
Founder approval
↓
Native Figma
↓
Cursor implementation
```

Home은 첫 전체 생산 화면으로 다음을 정착시킨다:

- design system · naming · tokens
- Figma architecture · MCP · Cursor workflow
- responsive · visual QA · a11y · performance

이후 화면은 그 시스템을 재사용한다.

---

## 36. Official partners (presentation intent)

미래 Consumer는 공식 글로벌 파트너를 분명히 알린다.

- eBay
- Amazon
- Yahoo! JAPAN Auction

Yahoo API/adapter/data-source는 금지. 표기는 금지하지 않는다.

---

## 37. Stop line

Founder + 감사 없이 시작하지 말 것:

```text
Consumer UX Architecture
Brand Direction
Mockup
Figma
Home
Cursor UI implementation
```

착수 조건:

```text
PHASE 2 PASS
OPERATING SYSTEM PASS
NEW CONSUMER UX ARCHITECTURE = GO
```
