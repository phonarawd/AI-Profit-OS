# STEP 3 — Peotteok Home Visual Implementation Contract v1

> ⚠️ **SUPERSEDED (VISUAL AUTHORITY) · HISTORICAL · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION**
> **2026-08-16 — [`ADR-018-peotteok-visual-master-reset.md`](./ADR-018-peotteok-visual-master-reset.md)** 가 본 문서의
> 시각 구현 권위(Desktop Canvas geometry·Shell/Hero/Money/Opportunity/RightRail 치수)를 종료·승계했다. 이 결정은
> 당시에는 유효했지만, 새 Visual Master Reset(ADR-018)에 의해 시각 권위가 **superseded**되었다. LOCK A(Data SSOT)와
> LOCK C(PART9 Protected Boundary)의 **비시각 원칙**은 ADR-018 §7/§8로 승계되어 계속 유효하다(PART9 fetch/SDK/mapper/
> Auth/Ledger 경계는 그대로 보존). 새 Home 화면 구현은 새 Implementation Contract(ADR-018 §9 intake 이후)를 따른다.

> **트랙:** Peotteok Home Upgrade / Home Experience Layer (**PART9 아님**)  
> **권위:** 본 문서 = **Cursor 구현 직전 SSOT** · PNG ≠ 픽셀 복사 대상 · Fact ≠ Reference  
> **선행:** STEP 0 ✅ · STEP 1 (PC) ✅ · STEP 0.5 Backend Fact ✅ · STEP 2 Conflict Resolution ✅ Founder ACK  
> **후속:** STEP 3 Founder ACK → **STEP 4** ADR/Wire/Token amend → **4.4 Founder approval** → **STEP 5 Implementation**  
> **금지:** STEP 4.4 승인 전 구현 착수 · ACK 직후 바로 코드 수정 · `HomePageV2` · PART9 재오픈 · 「사진처럼 만들어」

**버전:** v1.1 (APPROVE WITH 3 LOCKS)  
**일자:** 2026-08-10  
**판정:** **APPROVED / LOCKED** · Founder ACK **2026-08-10** · 3 LOCKS 유지  

**범위:** `/` Home + App Shell (Sidebar / Header / Footer / BottomNav)  
**관계 문서:**

| Doc | Role |
|---|---|
| [`peotteok-home-conflict-resolution.v1.md`](./peotteok-home-conflict-resolution.v1.md) | 채택/폐기 의사결정 (C01–C10) |
| [`peotteok-home-visual-contract.v1.md`](./peotteok-home-visual-contract.v1.md) | 기존 Visual Contract (본 문서와 충돌 시 **STEP 2 + 본 문서 승**) |
| [`home-visual-v2.wire.json`](../surfaces/home-visual-v2.wire.json) | Canon wire (STEP 4.2에서 amend) |
| [`peotteok-light.specification.md`](../../tokens/peotteok-light.specification.md) | Token SPEC (STEP 4.3 amend) |
| ADR-017 | Theme / Reference 정책 (STEP 4.1 amend) |

**구현 에이전트 절대 규칙:** PC Reference = **visual geometry SSOT** · API/Fact = **데이터 SSOT**. Contract 없는 UI 생성 금지.

---

## Track Status

```text
STEP 0       Current Forensic Audit          ✅ LOCKED
STEP 0.5     Runtime & Backend Fact          ✅ CODE FACT LOCKED · ⚠ Runtime 401 미실측
STEP 1       Reference Gap Forensic Audit    ✅ PC GAP LOCKED · ⚠ Mobile UNKNOWN
STEP 2       Conflict Resolution v1          ✅ COMPLETE / FOUNDER ACK / LOCKED
STEP 3       Visual Implementation Contract  ✅ APPROVED / LOCKED · 3 LOCKS
STEP 4.1–4.3 ADR / Wire / Token amend        ✅ COMPLETE (코드 0)
STEP 4.4     Implementation Gate             🟡 Founder 승인 대기
IMPLEMENT    STEP 5                          ❌ Gate 승인 전 금지 · C01 first
```

---

## Founder 3 LOCKS (ACK 조건 · 불변)

STEP 3 승인 시 아래 3개를 **동시에** 잠근다. 구현·STEP 4 amend는 이 잠금을 깨지 못한다.

### LOCK A — Data SSOT 우선

```text
Backend / API Fact
  > Product Contract
  > IA / terminology
  > Visual / Implementation Contract
  > PC Reference
```

| 규칙 | |
|---|---|
| `ledgerTotal` | = 오늘 성공 정산(**trade_executions success**) **COUNT** |
| UI 재해석 | COUNT를 **USDT 금액**으로 표시·접미사 결합 **금지** |
| 누적 수익 금액 슬롯 | 전용 데이터 계약이 생기기 전까지 **미표시** |
| Defect class | `` `${ledgerTotal} USDT` `` = **semantic data-binding defect** (스타일 이슈 아님) |

### LOCK B — Reference = Geometry SSOT only

| Follow | Do not follow |
|---|---|
| PC 목업 레이아웃 · 밀도 · 비율 · 시각 위계 | 목업 숫자 · 상태 claim · FSM · VIP 2 · 차트 · 도넛 |
| visual rhythm / card geometry | Reference가 Product/IA/Fact와 충돌할 때의 Reference 쪽 |

**충돌 시:** Product Contract / Fact / IA **승리** · Reference **패배**.

### LOCK C — Protected boundary

| Layer | Rule |
|---|---|
| 구현 중심 | `HomeExperience` + Home-local CSS / 표시 카피 |
| `HomePageClient` | **표시 데이터 전달** 정도만 허용 (C01 binding 교정 포함) |
| PART9 chain | fetch → mapper → SDK → Nest → DB → ledger → auth/session **그대로 유지** |
| Forbidden | `HomePageV2` · 병렬 데이터 파이프라인 · SDK/Nest/Ledger/Auth 재설계 |

---

## 01 — Authority / Scope

### 01.1 Authority ladder (STEP 2 잠금 · 재논쟁 금지)

```text
1. Backend / API Fact
2. Existing Product Contract (PART9 · Money · Auth)
3. IA / terminology lock
4. This Implementation Contract (+ STEP 2)
5. Existing Visual Contract v1.x (충돌 시 4가 승)
6. PC Reference image (geometry / density / rhythm only)
```

### 01.2 Reference 사용법

| Reference 역할 | 허용 | 금지 |
|---|---|---|
| Visual geometry SSOT | 열 폭 리듬 · 카드 밀도 · 여백 · 위계 · Hero 분위기 | 픽셀 1:1 QA |
| Factual claim | — | 목업 숫자·%·VIP·차트 series·실시간 상태 |

### 01.3 Scope in

- `/` Home Experience Layer
- App Shell: Sidebar · Header · Footer trust · BottomNav5 라벨
- Copy keys under `packages/ui/copy/ko/home*` (및 관련 feed/money 키)
- Token 소비 방식 (hex 하드코딩 금지)

### 01.4 Scope out

- PART9 API/SDK/mapper/Auth/Ledger/Engine/Wallet core 재설계
- Admin · PWA install UX · Infra
- Mobile visual geometry 최종 확정 (Reference B 없음)
- R1 401 브라우저 실측 (별도 Runtime Verification)

---

## 02 — Protected Boundary

| Boundary | Rule |
|---|---|
| `apps/web/app/HomePageClient.tsx` | **Keep** orchestration · fetch/state/401/session banner wiring만 최소 수정 허용 (표시 버그 C01 수정 포함) |
| `@aipo/sdk/*` | 🔒 변경 금지 (본 트랙) |
| `apps/web/lib/opportunity-card-map.ts` | 🔒 Keep |
| Nest / API / DB / Ledger / Engine | 🔒 변경 금지 |
| Auth / JWT / `aipo_session` | 🔒 변경 금지 |
| `HomePageV2` | ❌ Forbidden |
| Wallet buckets core | 🔒 Home에서 `lockedUsdt`/`profitUsdt` 임의 분할 금지 |

**허용 편집 철학:** Experience 컴포넌트 Adapt/Polish · orchestration의 **잘못된 Fact 표시** 수정 · IA 라벨 Adapt. 데이터 계층 재발명 금지.

---

## 03 — Desktop Canvas Contract

### 03.1 Canvas

```text
┌──────────────┬─────────────────────────────┬────────────────┐
│ Sidebar      │ Main                        │ Right Rail     │
│ 240px        │ flexible (container query)  │ 320–360px      │
│              │                             │                │
│ Logo         │ Hero                        │ Result / settle│
│ Nav 5        │ Money (2-col)               │ Today possible │
│ Invite       │ Opportunity grid            │ TOP3           │
│              │ Partner strip (or footer)   │ Settle count   │
└──────────────┴─────────────────────────────┴────────────────┘
         Header ~64px (full content width above / within shell)
```

### 03.2 Content rail

| Token | Value |
|---|---|
| `--content-rail-max` / `CONTENT_RAIL.maxWidthPx` | **1680px** |
| Ultrawide | 초과분 배경 처리 · 무한 스트레치 금지 |

### 03.3 Main internal order (고정)

1. Hero (Main 100%)  
2. Money row (Balance + Today possible · **2열**)  
3. Opportunity grid (`@container` 1–3열)  
4. Partner/trust strip (Main 100% 또는 footer Owns 1곳)

### 03.4 PC Reference

- Geometry / density / rhythm → **Adopt**
- Mock values → **Reject** (STEP 2 matrix)

---

## 04 — Shell Geometry

| Region | Contract |
|---|---|
| Sidebar | **240px** fixed |
| Right Rail | **320–360px** (토큰 기본 352px 허용) |
| Header | **~64px** |
| Desktop Hero height | **480–600px** |
| Hero illustration share | **≤ 46%** of hero visual area |
| 3-column activation | Desktop / `lg+` 셸 (기존 shell CSS 정합) |

`home-dashboard-grid` = Main + RightRail. Sidebar는 앱 셸이 Owns.

---

## 05 — Sidebar Contract

| Block | Contract | Action |
|---|---|---|
| Logo / wordmark | Brand Kit ready only | Keep/Adapt |
| Nav 5 | `홈 · 기회 · 수익 · 지갑 · 내정보` | Adapt labels · `내거래` ❌ |
| Active state | Purple filled / high contrast (`color.accent`) | Adapt |
| Invite card | 하단 초대 표면 · invite copy | Adapt |

**href 잠금 (wire와 동일):**

| Label | href |
|---|---|
| 홈 | `/` |
| 기회 | `/profits` |
| 수익 | `/trades` |
| 지갑 | `/wallet` |
| 내정보 | `/me` |

---

## 06 — Header Contract

| Block | Contract | Truth |
|---|---|---|
| AI status chip | 쉬운말 현황만 | DayPulse 기반 (`settlementCompletedToday` 등) · **실시간 AI FSM claim 금지** (C05) |
| Notification | 진입 슬롯 | ops-inbox pointer · 없으면 슬롯만 |
| Avatar | Brand AI avatar ready | `brand/assets/ai/avatar-512.png` |
| Tier badge | Fact 있을 때만 | `tierLabel` null → **숨김** (C10) |

**금지 카피 예:** `실시간 AI 스캔 중`을 실제 상태로 주장.

**허용 방향:** 기존 `T.home.header.scanIdle` / settle 치환 패턴 · Fact 없으면 idle.

컴포넌트: `AppHeader` + `HomeChromeContext` scan status · DayPulse DOM은 verify용 sr-only 슬롯 유지 가능.

---

## 07 — Hero Contract

### 07.1 Objective (3초)

1. AI가 글로벌 기회를 찾는다  
2. 나는 참여 가능한 기회를 확인한다  
3. 잔액/수익/정산에서 결과를 본다  

### 07.2 Copy (Contract 승 · C06)

| Slot | Contract |
|---|---|
| Title | `AI가 찾은 오늘의 글로벌 기회` (또는 기존 허용 B) · copy SSOT = `T.home.hero.*` |
| Subtitle | 퍼뜩 AI가 전 세계 데이터를 살펴보고 참여 가능한 기회를 알려드립니다 |
| CTA | **`기회 확인` / `기회 확인하기`** · primary first-visit |
| Forbidden alone | `오늘 벌 수 있는 기회` 단독 복원 |

### 07.3 Timeline (C07 · 기존 계약 승)

```text
AI 스캔 → 기회 발견 → 참여 매칭 → 진행 → 정산 완료
```

| 금지 | |
|---|---|
| Reference「실행」용어 | ❌ |
| Reference 5단 그대로 복제 | ❌ |

### 07.4 Illustration

| Do | Do not |
|---|---|
| Brand-approved static AVIF/WebP (**기본·선호**) | Visual Master 없는 WebGL / Three.js · 런타임 생성 마스코트 |
| `fetchPriority` above-fold 허용 | Illustration이 CTA contrast를 압도 |
| 현재 Home Master = static LOCK | 기술명만으로 “영구 금지” 선언 후 Master를 싸보이게 재해석 (`peotteok-performance-target.mdc`) |

### 07.5 Visual weight

Text → CTA → Data(있으면) → Illustration. Illustration never dominates CTA (z-order/contrast).

---

## 08 — Money Contract

| Surface | Bind | Rule |
|---|---|---|
| Balance | `principalUsdt` | Ledger SoT · KRW approx 표시 OK · FX 재계산 0 |
| Today possible | derived `sum(affordable.expectedProfitUsdt)` | 「가능」표현 유지 · 「실현/확정」금지 |
| Deposit CTA | `/wallet/deposit` | 기존 경로 |

### 08.1 Forbidden (C02 · C03)

| Forbidden | Why |
|---|---|
| 사용가능 / 참여중 이중 잔액 | Home Fact 없음 · buckets 임의 분할 금지 |
| 30일 차트 · `+12.34%` | series / growth % Fact 없음 |
| Balance/Profit count-up | Trust surface |
| Fake spark with mock series | Fact only · 현재 series 없음 → **차트 슬롯 자체 금지** |

### 08.2 Component

`HomePrincipalRail` **Adapt** · `home-principal-slots` child wire Keep.

---

## 09 — Opportunity Contract

| Item | Contract |
|---|---|
| Role | Main primary = 발견 + 참여 |
| Component | `BalanceAwareHome` · `OpportunityCard` Adapt |
| Buckets | affordable / nearMiss / lockedHigh Keep |
| Card CTA | **`수익 벌기`** (`T.execution.ctaEarn`) |
| Empty | status + nextAction + whyWait · mock filler ❌ |
| Grid | Main `@container` 1–3열 · 뷰포트 하드코딩 열 수 금지 |
| Forbidden | 성공률% · trader jargon · IT 용어 |

`hideScanHero` 유지 (Hero가 title Owns).

---

## 10 — RightRail Contract

### 10.1 Role

Secondary trust / status. Reference 정보량 억지 복제 금지 (C04).

### 10.2 Allowed blocks (Fact allowlist)

| Block | Fact | Display |
|---|---|---|
| Settlement / result area | `settlementCompletedToday` and/or `ledgerTotal` **as COUNT** | **건수** · 라벨 = 정산 완료 계열 |
| Today possible | same derived as Money | USDT OK (이 필드는 금액 Fact) |
| TOP3 | feed affordable slice(0..3) | 동일 CTA 규칙 |

### 10.3 Forbidden blocks (C01 · C04)

| Forbidden | |
|---|---|
| `ledgerTotal` + `USDT` 접미사 | ❌ P0 — COUNT를 금액처럼 보이게 함 |
| 목업 `+8,745.32 USDT` | ❌ 시각 참고만 |
| 도넛「12 진행 중」 | ❌ |
| scan / confirm / progress 숫자 행 | ❌ Fact ABSENT → **슬롯 제거 또는 완전 숨김** (0으로 가짜 채우기 금지) |
| 성공률 % | ❌ |

### 10.4 Binding correction (P0 · 현재 코드 결함)

현재 `HomePageClient`:

```text
totalResultValue = ledgerTotal > 0 ? `${ledgerTotal} USDT` : null  ← FORBIDDEN
```

**구현 시 필수 교정 (orchestration 최소 수정 허용):**

```text
ledgerTotal / settlementCompletedToday
  → count label (예: "오늘 정산 N건" / copy key)
  → NEVER `${n} USDT`
```

`HomePayoutCounter`에도 동일 의미 규칙 적용 (USDT 오인 금지).

### 10.5 Wire amend note (STEP 4)

`home-visual-v2.wire.json` rightRail note의 `progressStatus 스캔/확인/진행/정산` →  
**settle-only / Fact allowlist**로 개정.

---

## 11 — Partner Contract

| Rule | |
|---|---|
| Assets | Brand Kit `markets/*` **status=ready** only |
| PayPal | ❌ 현재 Brand 없음 · Founder/Brand 결정 전 추가 금지 (C09) |
| Owns | strip 1곳 (Main 하단 또는 Footer) · 중복 남발 금지 |
| Components | `MarketPartnerTrustStrip` · `SiteFooter` Adapt |

---

## 12 — Session Banner Contract

| Kind | When | Component |
|---|---|---|
| `guest` | 세션 없음 (제품 정책에 따라) | `HomeSessionBanner` |
| `expired` | feed/pulse 등 **401** + 쿠키/세션 만료 경로 | `HomeSessionBanner` |
| `null` | 정상 | 배너 없음 |

| Keep | |
|---|---|
| `HomePageClient` 401 감지 (`opportunity_feed_401` / `day_pulse_401` 등) | 🔒 구조 유지 |
| copy `T.home.session.*` | Adapt 허용 · IT 용어 0 |

R1 실측은 API 기동 후 · Contract 작성/구현 게이트 **아님**.

---

## 13 — Mobile Contract

### 13.1 Status

```text
Mobile Reference = Founder captures (320–430 · iPhone 14 Pro Max)
→ Mobile visual geometry = NOT FINAL (픽셀 QA 금지)
→ PC 목업 Fact를 모바일로 “축소 확정” 금지
→ geometry / density / CTA hierarchy만 Adopt
```

### 13.2 Provisional structural contract

스택 순서:

1. Header (축약)  
2. Hero — title keep-all 2줄 · timeline 2×2 · CTA full-width · art 128–160px  
3. Money — Fact-only · deposit CTA · balance text / profit green  
4. Opportunity — section title first · chips hide when empty · single primary CTA  
5. RightRail 내용 → 하단 보조 (있을 때)  
6. BottomNav 5 (`홈 · 기회 · 수익 · 지갑 · 내정보`)

| Hero mobile height | 320–420px |
|---|---|
| Motion | CSS ≤200–300ms · infinite glow/neon ❌ · count-up ❌ |

### 13.3 Deferred (final pixel lock)

- Mobile illustration asset variant 최종 Brand 승인  
- Mobile RightRail 밀도 최종  
- Pixel screenshot QA as Truth  

→ geometry polish는 본 절 + Founder capture 기준으로 STEP 5에서 진행.

---

## 14 — Responsive Breakpoints

SSOT: `packages/ui/tokens/breakpoints.ts`

| Name | px |
|---|---|
| xs | 320 |
| sm | 390 |
| md | 768 |
| lg | 1280 |
| xl | 1920 |
| 2xl | 3840 |

| Rule | |
|---|---|
| Opportunity columns | **Main `@container`** · FEED_COLUMNS는 힌트일 뿐 뷰포트 강제 금지 |
| Content rail | max 1680 |
| RightRail | desktop shell에서만 primary column · 모바일은 §13 스택 |
| Harness | structure diff · pixel screenshot QA ❌ |

---

## 15 — Typography

| Item | Contract |
|---|---|
| Font | Pretendard |
| fontScale | md / lg / xl (`1.0` / `1.15` / `1.3`) |
| Hero title | semibold · large · high contrast |
| Body | regular · muted secondary (`color.textMuted`) |
| Numbers | `tabular-nums` on money/settle counts |
| Surface copy | `packages/ui/copy/ko/*` only · JSX 하드코딩 금지 |

---

## 16 — Color / Token Mapping

SSOT: `peotteok-light.specification.md` → runtime `lux-fintech.ts` + `lux-theme.css`

| Token | Hex | Use |
|---|---|---|
| `color.bg` | `#F6F4FC` | App background |
| `color.surface` | `#FFFFFF` | Cards / sidebar |
| `color.border` | `#E4E0F0` | Dividers |
| `color.text` | `#14121F` | Primary |
| `color.textMuted` | `#6B6680` | Secondary |
| `color.accent` | `#6B3CFF` | CTA / active nav |
| `color.accentMuted` | `#8B6CFF` | Hover / soft |
| `color.profit` | `#12B76A` | Positive |
| `color.principal` | `#6B3CFF` | Balance emphasis |
| `color.heroGradientFrom/To` | `#2B1B6B` / `#5B3CFF` | Hero panel optional |

| Forbidden | |
|---|---|
| JSX ad-hoc hex | ❌ |
| Lux neon / glow aesthetic 복귀 | ❌ |
| Day-1 dual theme toggle | ❌ |

---

## 17 — Spacing / Radius / Shadow

| Category | Tokens |
|---|---|
| Spacing | xs4 · sm8 · md16 · lg24 · xl32 |
| Radius | sm8 · md12 · lg16 · xl20 |
| Shadow card | `0 1px 2px rgba(20,18,31,0.06), 0 4px 16px rgba(107,60,255,0.06)` |
| Shadow soft | `0 1px 3px rgba(20,18,31,0.04)` |
| Motion | CSS ≤200–300ms 기본 · count-up ❌ · gambling/jackpot particles ❌ · advanced motion은 예산+Master 조건부 |

---

## 18 — Asset Contract

| Asset | Rule |
|---|---|
| Logo / wordmark / AI avatar | Brand Kit ready |
| Hero illustration | Brand-approved static · desktop/mobile variant 정책은 mobile §13과 정합 |
| Opportunity thumbnails | runtime `assetImageUrl` · `ProductImage` |
| Market partners | `markets/*.svg` ready only · PayPal ❌ |
| Mockup PNG | Reference only · `docs/mockups/**` 재반입 ❌ |

---

## 19 — Data Binding Contract

### 19.1 Allowlist

| UI slot | Source | Type | Display |
|---|---|---|---|
| Money balance | `principalUsdt` | USDT amount | USDT + optional ₩ |
| Today possible | affordable expectedProfit sum | USDT amount | USDT ·「가능」 |
| Opportunity cards | feed items | models | mapper Keep |
| TOP3 | feed affordable slice | models | ≤3 |
| Header status | DayPulse | settle/idle | 쉬운말 · 실시간 FSM ❌ |
| Settle count | `settlementCompletedToday` | **count** | N건 |
| Growth counter | `ledgerTotal` | **count** | N건 · **USDT 금지** |
| Tier | membership Fact | label | null → hide |
| Session banner | 401 / guest | enum | copy SSOT |
| Partners | Brand manifest | assets | ready only |

### 19.2 Explicit null / absent → hide (만들지 말 것)

30일 series · growth% · available/locked split · scan/confirm/progress · VIP without Fact · PayPal · live AI scanning state · cumulative profit USDT without aggregate Fact.

### 19.3 Orchestration touchpoints (최소)

| File | Allowed change |
|---|---|
| `HomePageClient.tsx` | C01 binding fix · banner kind · props pass-through |
| `HomeExperience.tsx` | RightRail progress = settle-only · scan/confirm/progress 제거 |
| `HomeRightRail.tsx` | UI slots per §10 |
| `HomePayoutCounter` / lux counter | count semantics · USDT 오인 제거 |
| copy `ko/home*` | settle count labels · header idle |

SDK/Nest **호출 추가·변경 금지** (새 Fact 없으면 UI 숨김).

---

## 20 — Forbidden Changes

1. `HomePageV2` / 평행 홈  
2. PART9 fetch/SDK/mapper/Auth/API/DB/Ledger/Engine 재작성  
3. Reference 숫자·차트·도넛·VIP·PayPal·「실행」·`내거래` 복원  
4. `ledgerTotal` → USDT 표시  
5. Fake Fact / mock opportunity empty fill  
6. Visual Master 없는 WebGL / Three.js Hero (현재 Home LOCK = static · 변경=재승인+예산)  
7. Money count-up · gambling dopamine / jackpot particles  
8. IT jargon on user surface  
9. Mobile geometry를 PC 축소로 최종 확정  
10. PNG 픽셀 QA를 Truth로 사용  
11. Ad-hoc hex / 무단 토큰  
12. STEP 4·Founder 승인 전 대규모 UI 리라이트  

---

## 21 — Component / File Edit Boundary

### 21.1 Keep (orchestration / data)

| Path | Action |
|---|---|
| `apps/web/app/page.tsx` | Keep |
| `apps/web/app/HomePageClient.tsx` | Keep + **C01 minimal fix** |
| `apps/web/lib/opportunity-card-map.ts` | Keep |
| `@aipo/sdk/**` | Keep (no edit) |

### 21.2 Adapt / Polish (Experience)

| Path | Action |
|---|---|
| `packages/ui/components/home/HomeExperience.tsx` | Adapt §10 |
| `packages/ui/components/home/HomeHero.tsx` | Polish per §07 |
| `packages/ui/components/home/HomeHeroIllustration.tsx` | Brand asset only |
| `packages/ui/components/home/HomeRightRail.tsx` | Adapt §10 (settle-only) |
| `packages/ui/components/home/HomeSessionBanner.tsx` | Keep/Adapt copy |
| `packages/ui/components/opportunity/BalanceAwareHome.tsx` | Adapt |
| `packages/ui/components/opportunity/*` (cards/rail) | Adapt Money/Opp |
| `packages/ui/components/shell/AppHeader.tsx` | Adapt §06 |
| `packages/ui/components/shell/*` (nav/chrome) | IA Adapt |
| `packages/ui/components/trust/MarketPartnerTrustStrip.tsx` | Adapt §11 |
| `packages/ui/copy/ko/home.ts` (및 관련) | Copy lock |
| CSS / theme consumers | Token only |

### 21.3 New (필요 시에만 · 평행 홈 금지)

새 파일은 **기존 Experience 트리 안**에서만. `HomePageV2*` ❌.

### 21.4 Do not edit (본 트랙)

`services/api-nest/**` · `workers/**` · `apps/admin/**` · engine · ledger migrations · SDK packages.

---

## 22 — Regression Gates

구현 슬라이스 후 (로컬 저사양: 관련 verify만 · 풀 `pnpm -r` 금지):

| Gate | Why |
|---|---|
| `verify:home-live-wire` | PART9 live path |
| `verify:home-principal-slots` | Money slots |
| `verify:canon-surfaces` | wire registration |
| `verify:ia-tabs` | 5탭 라벨 |
| `verify:no-it-jargon` | 유저 surface |
| `verify:cta-earn-profit` | 카드 CTA |
| `verify:brand-consumer` | 퍼뜩 |
| `verify:lux-theme-sync` | token mirror |
| `verify:mockup-governance` | PNG SSOT화 방지 |
| `verify:gate:fast` | T0 commit |

**추가 수동 체크 (C01):** RightRail/Counter에 `ledgerTotal`+`USDT` 문자열 결합 **0**.

---

## 23 — Acceptance Criteria

### 23.1 Document acceptance (STEP 3 done)

- [x] §01–§23 명시  
- [x] PC Reference = geometry SSOT · Fact = data SSOT  
- [x] Mobile = structural provisional only  
- [x] STEP 2 C01–C10 반영  
- [x] Edit boundary + regression gates  
- [x] **Founder 3 LOCKS** (Data SSOT · Geometry-only Reference · Protected boundary)  
- [x] Founder ACK (STEP 3) — **APPROVED / LOCKED** (2026-08-10)  

### 23.2 Implementation acceptance (STEP 5 · STEP 4.4 승인 후만)

구현은 다음을 **모두** 만족해야 완료:

1. Desktop 3-column geometry가 §03–§04를 만족  
2. IA = `홈 · 기회 · 수익 · 지갑 · 내정보`  
3. Hero copy/timeline = §07 (「실행」·목업 제목 복원 0)  
4. Money = `principalUsdt` + today possible only  
5. RightRail = Fact allowlist only · scan/confirm/progress UI 0  
6. **`ledgerTotal` never rendered as USDT** (count-only OR hide)  
7. 누적 수익 USDT 슬롯 = 데이터 계약 전 **미표시**  
8. Partner = Brand ready only · PayPal 0  
9. Tier null 숨김 · 실시간 AI FSM claim 0  
10. PART9 orchestration/SDK/mapper 회귀 PASS  
11. Mobile은 구조 스택만 · visual final claim 0  
12. §22 gates PASS · **C01 regression 우선**  

### 23.3 Non-acceptance

- 「레퍼런스랑 픽셀이 같다」  
- 「없어 보여서 목업 숫자를 넣었다」  
- 「모바일도 PC 줄여서 완료」  
- STEP 3 ACK 직후 STEP 4 없이 구현 착수  

---

## STEP 4 Handoff (ACK 후 · 코드 아님)

> **ACK 직후 구현 금지.** Forensic → Conflict → Contract 체계를 유지하려면 STEP 4 amend를 먼저 닫는다.

```text
STEP 4
 ├─ 4.1 ADR / Contract amendment
 │    ├─ C01 ledgerTotal binding 제거 / 건수 의미 확정
 │    ├─ RightRail fact surface 확정
 │    ├─ Money fact surface 확정
 │    └─ Mobile provisional boundary 명시
 │
 ├─ 4.2 Wire amendment
 │    ├─ Shell geometry
 │    ├─ Hero
 │    ├─ Money
 │    ├─ Opportunity
 │    └─ RightRail
 │
 ├─ 4.3 Token amendment
 │    ├─ spacing · radius · typography
 │    ├─ hero proportions
 │    └─ local visual states
 │
 └─ 4.4 Founder approval
       ↓
STEP 5 Implementation   ← 여기부터 코드
       ↓
C01 binding fix (첫 슬라이스 · semantic defect)
       ↓
Shell → Hero → Money → Opp → Rail
       ↓
verification gates
```

### 4.1 산출 포인터 (문서)

| Amend | Path |
|---|---|
| ADR | `ADR-017-peotteok-home-light-theme.md` (+ STEP 3 pointer · 3 LOCKS) |
| Visual Contract | `peotteok-home-visual-contract.v1.md` (C01/C02/C04/Mobile와 충돌 절 정리) |
| Mapping | `home-visual-implementation-mapping.v1.md` (§21 · STEP 5 큐) |

### 4.2 Wire

`home-visual-v2.wire.json` — Shell/Hero/Money/Opp/RightRail · forbidden에  
`ledgerTotal_as_usdt` · `cumulative_profit_without_fact` · `scan_confirm_progress_without_fact` 등.

### 4.3 Token

`peotteok-light.specification.md` — spacing/radius/type/hero proportions/local states 정합  
(이미 APPLIED인 hex 체계 무단 확장 금지).

### STEP 5 첫 슬라이스 (C01) — 시각보다 의미

```text
ledgerTotal
  = today successful trade execution COUNT
  → count semantic
  → count-only presentation  OR  hide
  → NEVER "${ledgerTotal} USDT"
```

C01 PASS + regression gate 후에만 Shell→Hero→Money→Opp→Rail 시각 슬라이스.

---

## One-line Verdict

> STEP 3는 **APPROVE WITH 3 LOCKS** 상태다. ACK 후에는 **STEP 4 amend → 4.4 승인 → STEP 5(C01 먼저)** 만 허용한다.  
> 최위험은 UI 차이가 아니라 `ledgerTotal` COUNT→USDT **semantic data-binding defect**이다.
