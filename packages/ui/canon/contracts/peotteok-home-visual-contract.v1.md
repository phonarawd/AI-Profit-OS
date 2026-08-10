# Peotteok Home Visual Contract v1

> **트랙:** Peotteok Home Visual Upgrade / Home Experience Layer (PART9 아님)  
> **권위:** 본 문서 = Visual Contract SSOT · PNG = Visual Reference only · Wire/Token/코드는 후속 STEP  
> **선행:** STEP1 Gap Analysis Founder 승인 · PART9 live fetch/SDK/Auth/Wallet **보존**  
> **금지:** HomePageV2 신설 · PART9 재오픈 · PNG 픽셀 QA · 본 문서 승인 전 구현/ADR/Token 착수  

**버전:** v1.4 (STEP 4.1 Fact / RightRail / Mobile provisional amend · STEP 3 Implementation Contract 승)  
**범위:** `/` Home + App Shell (Sidebar/Header/Footer) · 탭 라벨 IA 잠금 포함 · 탭 외 화면 전면 리터치 제외  
**권위 충돌 시:** [`peotteok-home-visual-implementation-contract.v1.md`](./peotteok-home-visual-implementation-contract.v1.md) + STEP 2 Conflict Resolution **승**  
**트랙 순서 (잠금):** STEP 4 ADR/Wire/Token amend → 4.4 Gate 승인 → **STEP 5** 코드 (C01 먼저) · 본 STEP 4에서 React/CSS **금지**

**구현 에이전트 절대 규칙:** PNG = Geometry Reference only. **Fact = Backend SSOT.** Contract 없는 UI 생성 금지. 「사진처럼 만들어」금지.

---

## 0. Founder Lock (불변)

| ID | 잠금 |
|---|---|
| Q1 | Theme = **Light + Purple** 출시 SSOT · Lux Dark = **legacy/archive** |
| Q2 | 1차 = Home + Shell only (탭 라벨 IA는 셸 계약에 포함) |
| PNG | Reference only · SSOT 아님 · 수치/카피 Truth 아님 |
| PART9 | `HomePageClient` 등 **확장·재스킨** · 평행 홈 금지 · 데이터 계층 유지 + Experience Layer 교체 |
| Success | Visual Contract 항목 유지 (픽셀 동일 목표 금지) |
| Audience | 한국 **20~70대** Capital Participant · 거래자/트레이더 아님 |

**검증 축:** Layout hierarchy · Information priority · Navigation · Card composition · Color · Typography · Illustration placement · CTA · Interaction · **Age accessibility (3초 인지)** · **Performance budget**

---

## 0.1 Age Accessibility Rule — 3초 인지 (필수)

첫 방문 **3초 안**에 사용자는 아래 **3가지**만 이해하면 된다.

| # | 질문 | 이해 |
|---|---|---|
| 1 | 이 서비스가 무엇인가? | AI가 글로벌 기회를 찾는 서비스 |
| 2 | 내가 무엇을 하는가? | 참여 가능한 기회를 확인한다 |
| 3 | 내 결과는 어디서 보는가? | 잔액 / 수익 / 정산 |

### 유저 surface 금지 용어 (노출 0)

화면·탭·토스트·빈상태·히어로에 아래 **내부 용어 노출 금지:**

`SDK` · `Engine` · `Rule` · `Ledger` · `Arbitrage` · `API` · `JWT` · `Nest` · 기타 IT/원장 은어  

> 제품명 **퍼뜩**·일상어 **AI**는 브랜드/설명용으로 허용하되, “AI SDK/엔진/룰” 결합 금지.  
> 기술 문서·Admin·verify 스크립트는 본 절 범위 밖.

---

## 1. Theme

| 항목 | Contract |
|---|---|
| Mode | Light primary |
| Accent | Purple (hex는 STEP3 Token) |
| Profit | Green / positive emphasis |
| Surface | White / light gray cards · soft elevation |
| Legacy | Lux Dark → archive after STEP3 · Day-1 dual toggle **0** |
| Type | Pretendard · fontScale 3단(md/lg/xl) 유지 방향 |

---

## 2. Desktop Shell — Desktop Home Layout v1

### 2.1 IA 레이아웃

```
┌──────────────┬─────────────────────┬──────────────┐
│ Sidebar      │ Main                │ Right Rail   │
│ 240px        │ Flexible            │ 320~360px    │
│ Logo         │ Hero                │ Total result │
│ 5 Tabs       │ Money surface       │ Top3         │
│ Invite Card  │ Opportunity         │ Status       │
└──────────────┴─────────────────────┴──────────────┘
```

| Region | Width | Role |
|---|---|---|
| Sidebar | **240px** | Brand + IA + Invite |
| Main | flexible | 기회 발견 + 참여 (primary) |
| Right Rail | **320–360px** | 신뢰·현황 보조 only |
| Header | **~64px** | Status + identity |

### 2.1a Main Content Internal Grid (v1.3 신설)

> 기존 "Main: Flexible"에는 내부 규정이 없었음 — 본 절은 신규 조항이며 상위 §2.1 잠금(Sidebar 240 / Right Rail 320–360)을 변경하지 않는다.

| 순서 | Block | 폭 규칙 |
|---|---|---|
| 1 | Hero | Main 100% |
| 2 | Money row (Balance+Profit) | 2열 고정 |
| 3 | Opportunity grid | 컨테이너 실제 렌더 폭 기준 1~3열 (auto-fit) |
| 4 | Partner/trust strip | Main 100% |

- 열 수는 **뷰포트가 아니라 Main 컨테이너의 실제 렌더 폭**(`container-type: inline-size` + `@container`)으로 결정한다 — Sidebar/Right Rail 유무로 Main 실제 폭이 달라지므로, 뷰포트 기준 하드코딩 열 수는 금지.
- Content 전체 폭(Sidebar+Main+Rail 합)의 울트라와이드(≥1920px) 상한은 토큰 SSOT(`--content-rail-max`)를 따른다 — 무한 스트레치 금지(카드가 비정상적으로 커지는 것 방지), 초과분은 배경으로 처리.

### 2.2 Navigation IA Lock (Founder 확정 추천 · STEP3 `verify:ia-tabs` 반영)

**유저 대면 라벨 (5탭 · 순서 고정):**

`홈 · 기회 · 수익 · 지갑 · 내정보`

| order | Label | href (STEP3 매핑) | 의미 (Capital Participant) |
|---|---|---|---|
| 1 | 홈 | `/` | 오늘 경험 · Hero |
| 2 | 기회 | `/profits` | 참여 가능 기회 탐색·상세 |
| 3 | 수익 | `/trades` | 내 참여·진행·정산 **결과** |
| 4 | 지갑 | `/wallet` | 잔액·입출금 |
| 5 | 내정보 | `/me` | 프로필·설정 |

**폐기 라벨:** `내거래` — 사고팔기·주문·트레이딩 오해 유발 · Capital Participant 정의와 충돌.

> STEP3 전 코드/`USER_TABS` 변경 금지. 본 절이 IA SSOT이며 구현 시 `routes.ts` + `verify:ia-tabs` + 관련 copy를 **한 슬라이스**로 맞춤.

### 2.3 Sidebar

| Block | Contract | Reuse |
|---|---|---|
| Logo / wordmark | Brand Kit ready only | brand assets |
| 5 navigation | §2.2 라벨 | `BottomNav5` Adapt |
| Active state | Purple filled / high contrast | — |
| Invite surface | 하단 초대 카드 | invite copy Adapt |

### 2.4 Header (~64px)

| Block | Contract | Truth |
|---|---|---|
| AI scan status | 쉬운말 현황 칩 | DayPulse/growth 등 **실측만** · 가짜 실시간 매매 claim 0 |
| Notification | 진입 슬롯 | ops-inbox pointer |
| Avatar | Brand AI avatar ready | `brand/assets/ai/avatar-512.png` |
| Tier badge | 등급 Fact 있을 때만 | membership · 없으면 숨김 |

---

## 3. Hero (3초 이해)

### 3.1 Hero Objective (고정)

> **「퍼뜩은 AI가 글로벌 기회를 찾고, 사용자는 참여 가능한 기회를 확인하는 플랫폼이다.」**  
> (§0.1 3초 인지와 동일 축)

### 3.2 Hero copy structure (고정 · 광고/투자/쇼핑 혼동 방지)

**큰 제목 (둘 중 하나 · copy SSOT는 STEP4에서 `T.feed` 키로 잠금):**

- 권장 A: `AI가 찾은 오늘의 글로벌 기회`  
- 권장 B: `전 세계 기회, AI가 먼저 찾아드립니다`  

**폐기(단독 사용 금지):** `오늘 벌 수 있는 기회`만 덩그러니 — 광고·투자·쇼핑·금융앱 혼동.

**Hero Copy Contract — 허용**

- AI가 찾은 기회  
- 참여 가능한 기회  
- 현재 확인 가능한 기회  
- 정산 결과 확인  

**Hero Copy Contract — 금지**

- 매일 돈 버는 기회  
- 확정 수익  
- AI 자동 수익  
- 1분 수익 보장  
- 누구나 벌기 가능  

**설명 (부제):**

> 퍼뜩 AI가 전 세계 데이터를 살펴보고  
> 참여 가능한 기회를 알려드립니다.

**구조:** 큰 제목 → 무엇인지 설명 → 내가 할 행동(타임라인 + Hero CTA).

### 3.3 Information priority + Visual Weight Lock (A)

| 우선순위 | 층 |
|---|---|
| 1 | Text |
| 2 | Action (CTA) |
| 3 | Data (있다면) |
| 4 | Illustration (Robot/Globe) |

| Rule | Contract |
|---|---|
| Hero visual area | Illustration(+맵) 합쳐 **최대 ~46%** hero 영역 (v1.3 상향 · Founder 승인) |
| Desktop Hero height | **480–600px** 권장 (v1.3 상향) |
| Mobile Hero height | **320–420px** 권장 (불변) |
| Robot/Globe role | **장식(composition anchor)** · 정보 전달 영역 아님 |
| Dominance | Illustration **never** dominates CTA — 면적이 아니라 **z-order/명도 대비**로 판단(흰색 CTA 버튼이 항상 최고 contrast 유지) |
| Feel | 금융 신뢰 · 게임/카지노 캐릭터 과대 금지 |

### 3.4 Process timeline (유저 카피 · 고정)

내부「실행」금지. **유저 대면:**

```
AI 스캔 → 기회 발견 → 참여 → 정산 확인
```

(상세 5단이 필요하면: `AI 스캔 → 기회 발견 → 참여 매칭 → 진행 → 정산 완료` · 유저 surface는 쉬운말만)

### 3.5 Robot & Globe — composition anchors only

Robot and Globe are **composition anchors**.

| Do | Do not |
|---|---|
| **(v1.3) Brand-approved high-fidelity static illustration** — AI 생성 → 목업/브랜드 가이드 기반 프롬프트 → 육안 검수(금지 항목 0건 확인) → Brand Kit 등재(status: ready) | 방향성 없는 random illustration |
| Static AVIF/WebP asset · `fetchPriority="high"`(above-the-fold이므로 lazy 금지) | random AI-generated character (검수 절차 생략) |
| Static image only — Canvas/WebGL/Three.js/런타임 3D **여전히 금지** | random 3D model · Three.js / WebGL |

| Robot tone | friendly · trustworthy · not humanoid worker · not trading bot |
| Globe meaning | global opportunity symbol · not market chart · not financial prediction |

- fake realtime / geo performance claim **0**  
- PNG 좌표 absolute 복제 **0**

### 3.6 Hero CTA (see §3.7 CTA Lock)

Hero primary = **`기회 확인하기`** (또는 `기회 확인`) · 첫 방문 “보기” 행동.

### 3.7 CTA Lock (C)

| Context | CTA | Role |
|---|---|---|
| Hero / 첫 방문 / empty | **`기회 확인`** (`기회 확인하기`) | **Primary** — 보기·탐색 |
| Opportunity card · 참여 확정 | **`수익 벌기`** | **Participate primary** — 기존 제품 CTA 잠금(`T.execution.ctaEarn`) 유지 |
| Deposit gate | 입금 / 입금하고… | Secondary path |

첫 방문자는 아직 참여 전 → Hero에서 いきなり `수익 벌기`만 강조 **금지**.

### 3.8 Hero Rules

- No fake AI realtime claim · No geo performance claim · No guaranteed profit  

---

## 4. Money Surface — Trust Surface Lock (B)

Money surface is a **trust surface**.

| Surface | Contract | Truth |
|---|---|---|
| Balance | 내 잔액 경험 | `principalUsdt` only (Home DTO) |
| KRW | 크게 OK | ≈₩ display only · FX UI 재계산 0 |
| Deposit | 입금 | `/wallet/deposit` |
| Profit | 오늘 가능한 수익 경험 | affordable expectedProfit **derived** aggregate |
| Chart | **Forbidden (현재)** | 30-day series / growth% Fact **ABSENT** (C03) |

### 4.1 Money Fact surface (v1.4 · STEP 4.1)

| Allow | Forbid |
|---|---|
| `principalUsdt` | 사용가능 / 참여중 이중 잔액 (Home에 Fact 없음 · buckets 임의 분할 금지) |
| today possible profit (derived) | 누적 수익 USDT 슬롯 (전용 데이터 계약 전 미표시) |
| Deposit CTA | 30일 차트 · `+N%` growth · mock 숫자 |

**금지 (카지노/도파민 · Trust 강화):**

- Balance 숫자 **count-up 애니메이션 금지**  
- Profit **실시간 증가 연출 금지**  
- Chart **성장 과장 그래프** · Fact 없는 spark 슬롯  
- huge profit animation / jackpot / flashing green / particles / gambling patterns  

**Reuse:** `HomePrincipalRail` Adapt.

---

## 5. Opportunity Surface

| Item | Contract |
|---|---|
| Role | Main primary = 기회 발견 + 참여 |
| Card | Image · 쉬운 분류/경로 · Fact 기댓값 · CTA **`수익 벌기`** |
| Buckets | affordable / nearMiss / lockedHigh 유지 |
| Empty | §5.1 Empty State Lock |
| Card CTA | **`수익 벌기`** (participate) |
| Forbidden | 성공률% · trader jargon · 내부 용어(§0.1) |

**Reuse:** `BalanceAwareHome` · `OpportunityCard` · chips · `ProductImage` · SDK feed.

### 5.1 Empty State Lock (E)

빈 화면 = 실패로 오해하지 않게. Empty는 반드시:

1. **현재 상태**  
2. **다음 행동**  
3. **기다리는 이유** (해당 시)

예시(카피 키는 STEP3/4):

- `아직 참여 가능한 기회를 찾는 중이에요`  
- `입금 후 AI 분석이 시작됩니다`  
- Primary: `[입금하기]` 또는 `[기회 확인]` (§3.7)

하드코딩 목업 상품·가짜 카드로 empty를 가리지 **말 것**.

---

## 6. Right Rail — 정보 보조

### 6.1 Role

Main = 기회+참여 · Right = 신뢰+현황 (Secondary). Reference 정보량 억지 복제 금지 (C04).

### 6.2 Allowed Fact surface (v1.4 · STEP 4.1)

| Block | Fact | Display |
|---|---|---|
| Settlement / result | `settlementCompletedToday` and/or `ledgerTotal` | **COUNT only** · 건수 라벨 |
| Today possible | derived (Money와 동일) | USDT ·「가능」 |
| TOP3 | feed affordable slice ≤3 | 동일 CTA 규칙 |

### 6.2a C01 — `ledgerTotal` semantic lock (P0)

```text
ledgerTotal = today successful trade execution COUNT
           ≠ cumulative profit USDT
```

| Rule | |
|---|---|
| Presentation | count-only **또는** hide |
| Forbidden | `` `${ledgerTotal} USDT` `` · 목업 `+8,745.32 USDT` 주입 |
| Defect class | semantic data-binding defect (스타일 이슈 아님) |

### 6.2b Removed pattern (supersedes v1.3 scan/confirm/progress rows)

`스캔/확인/진행 {n}` 행 · 도넛「N 진행 중」— Fact ABSENT → **슬롯 제거/완전 숨김** (0으로 가짜 채우기 금지).  
정산 건수(`settle` / `settlementCompletedToday`)만 허용.

### 6.3 Forbidden

- 성공률 % (예: 92%)  
- 확정 수익처럼 보이는 예상 숫자  
- 호가창·틱 트레이딩감  
- 가짜 인원·가짜 체결  
- `ledgerTotal` USDT 재해석 · mock 누적 수익  
- scan / confirm / progress 숫자 · 도넛  

---

## 6.4 Growth / Counter Owns

`HomePayoutCounter` / growth public-surface `ledgerTotal` = **COUNT semantics** (C01와 동일). USDT 접미사·금액 오인 금지.

---

## 7. Footer Trust

Partner/trust strip · Brand markets ready only · `SiteFooter` · 면책 이모지 0 · Owns 중복 시 strip 1곳.

---

## 8. Responsive Rules

### Desktop

3 column: Sidebar 240 · Main flex · Right 320–360 · Header ~64  
PC Reference = **geometry SSOT** (밀도·비율·위계) · 목업 Fact 복제 금지.

### Mobile (provisional · Founder captures 320–430)

> Mobile visual geometry **NOT FINAL** (픽셀 확정 금지).  
> Founder iPhone 14 Pro Max / 320–430 실측 캡처 = **Mobile Reference geometry** · PC 목업 Fact 축소 확정 **금지**.

**구조 스택 (잠금):**

1. Header 축약  
2. Hero (title 2줄 · timeline 2×2 · CTA full-width · illustration compact)  
3. Balance / Profit (Fact-only · 사용가능/참여중·차트 금지)  
4. Opportunity (제목 우선 · 빈 필터 숨김 · 단일 primary CTA)  
5. Right-rail 내용(있으면) 하단 보조  
6. Bottom nav 5 (§2.2 라벨)

Hero mobile height **320–420px** · 무한 glow/neon/count-up 금지.

---

## 9. Home Performance Budget + Animation Lock (D)

| 항목 | Budget |
|---|---|
| Desktop initial JS | Target **&lt; 300KB** (STEP4 측정) |
| Hero | **Static asset only** · composition placeholder OK |
| Chart | **Canvas / WebGL prohibited** · CSS/SVG spark OK |
| Animation | **CSS transition only** |
| Images | optimized · `ProductImage` lazy/priority |
| Robot / Globe | **lazy loaded** · placeholder first |

**Animation 금지:**

- money counting animation  
- particle effects  
- flashing rewards  
- gambling dopamine patterns  
- Three.js / WebGL / 무거운 Lottie를 Hero에 기본 탑재  

저사양(Phase0): web 1프로세스.

---

## 10. Component mapping (코드 작성 금지 · STEP3/4용)

| Contract block | Keep / Adapt / New |
|---|---|
| Live fetch | **Keep** `HomePageClient` |
| Nav labels + shell | **Adapt** `BottomNav5` + `USER_TABS` (§2.2) |
| Header | **New** |
| Hero + timeline | **New** |
| Money | **Adapt** `HomePrincipalRail` |
| Opportunity | **Adapt** feed components |
| Right rail status | **New** |
| Footer | **Keep/Adapt** |
| DayPulse/Ticker/Counter | **Adapt** · Header/Hero와 Owns 접기 (wire에서 확정) |

---

## 11. Explicit non-goals (v1)

- PART9 API/SDK/세션 재구현  
- HomePageV2  
- PNG 레포 반입 · Pixel QA  
- WebGL / 런타임 AI 생성 일러스트  
- 「내거래」라벨 유지  
- 성공률% 도넛  
- Admin/PWA/Infra 착수  

---

## 12. Exit criteria → STEP3

Founder가 **v1.2** 승인 시 허용 순서:

1. ADR unlock (Light SSOT · Lux Dark legacy · Reference · 본 Contract pointer)  
2. Canon **home wire v2** (`blocks[]` ↔ 본 문서 1:1 · empty/CTA/hero weight 블록 포함)  
3. Design Token Light+Purple + theme mirror  
4. Component mapping + **구현 큐** (셸→Hero→Money→Opportunity→Rail→polish)  
5. IA: `USER_TABS` + `verify:ia-tabs` · copy: Hero title/subtitle · `기회 확인` + 기존 `수익 벌기`

**그 전 React/CSS/컴포넌트 생성 금지.**  
**금지 프롬프트:** 「이 사진처럼 만들어줘」  
**허용 프롬프트:** Contract v1.2 절대 기준 · PNG 참고 · ADR→Wire→Token 후 구현 · Contract 없는 UI 생성 금지.

---

## 13. Document control

| | |
|---|---|
| Status | **v1.4 — STEP 4.1 Fact / RightRail / Mobile provisional** (Implementation Contract STEP 3 ACK 정합) |
| Prev | v1.3 (Desktop Grid) |
| Added v1.4 | §4.1 Money Fact surface · §6.2 Fact allowlist · §6.2a C01 ledgerTotal COUNT lock · §6.2b scan/confirm/progress 폐기 · §6.4 Counter Owns · §8 Mobile provisional · Authority → Implementation Contract |
| Added v1.3 | §2.1a Main Content Internal Grid · Hero illustration 46% · Hero desktop 480–600 · brand-approved illustration · content-rail-max |
| Added final (v1.2) | Hero copy 허용/금지 · Money count-up 금지 · STEP3 Wire→Token |
| Owner track | Home Visual Upgrade (not UI PART9) |
| Code | STEP 4 구간 변경 **0** · STEP 5 = Implementation Gate 승인 후 · C01 첫 슬라이스 |
