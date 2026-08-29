# Peotteok Home — Visual Master Intake Record (H1 · ADR-018 §9)

| | |
|---|---|
| Status | **INTAKE COMPLETE — VISUAL AUTHORITY REGISTERED** (Visual Contract·Implementation Contract·Visual Lock은 아직 없음) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-visual-master-intake` (H1) — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Procedure SSOT | `.cursor/rules/visual-master-intake.mdc` · `packages/ui/canon/contracts/ADR-018-peotteok-visual-master-reset.md` §3/§9/§10 |
| Governs | Home(`/`) 화면의 **Desktop/Mobile Visual Authority 등록만**. 기능/데이터/보안/API/DB 계약은 §9 Functional Conflict Matrix로 분리 기록하며 본 문서가 그 자체로 승인하지 않는다. |
| Runtime code changed by this record | **0** |
| Visual Contract / Implementation Contract / Visual Lock | **아직 없음** — 본 문서는 ADR-018 §9 intake 단계까지만 수행한다 |
| Next authorized step | H5 New Visual Contract (`redesign-r1-home-visual-contract`) — **선행조건**: H4 Product Contract(`redesign-r1-home-product-contract`) available |

---

> **2026-08-16 SUPERSEDED BY V2 · HISTORICAL FOR GEOMETRY/COMPOSITION · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION.**
> Founder가 Home visual direction을 업그레이드하여 새 Desktop/Mobile Visual Master(V2)를 제공했다. 이 결정은 당시에는 유효했지만,
> 새 Visual Master V2 Rebase에 의해 시각 authority(geometry·구성·px 가정)가 superseded되었다.
> 승계 authority: [`peotteok-home-visual-master-intake.v2.md`](./peotteok-home-visual-master-intake.v2.md).
> 본 문서의 **비시각 지식**(§6 Money Semantics Lock·§7 Processing-Time Semantics Lock·§8 AI Role Lock·§9 Functional Conflict Matrix의
> 코드 실측 결과)은 V2에서도 동일하게 재확인되어 계속 유효하다(V2 §7/§8/§9가 명시적으로 재확인) — 본문 내용은 삭제·수정하지 않는다.

---

## 0. Founder Approval Declaration

Founder가 본 세션에서 첨부한 이미지 2장을 다음과 같이 명시적으로 승인 지정했다:

```text
ATTACHMENT A → APPROVED VISUAL MASTER — DESKTOP HOME
ATTACHMENT B → APPROVED VISUAL MASTER — MOBILE HOME
```

Desktop과 Mobile은 **SAME DESIGN LANGUAGE, SEPARATE VISUAL AUTHORITIES**로 취급한다(ADR-018 §10). Desktop geometry를 Mobile에, Mobile geometry를 Desktop에 상호 추론하지 않는다.

---

## 1. Provenance Registry

원본 이미지 파일은 본 레포에 저장하지 않는다(ADR-013 · ADR-018 §9 · `.cursor/rules/visual-master-intake.mdc` §0/§5 불변). 아래는 텍스트 provenance만 기록한다.

### 1.1 PEOTTEOK_HOME_DESKTOP_VISUAL_MASTER_V1

| 항목 | 값 |
|---|---|
| Founder designation | `APPROVED VISUAL MASTER — DESKTOP HOME` |
| Session reference (Cursor project cache · repo 자산 아님) | `c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_346a29256ffbb8b95dfbb19147b08cc5_images_ChatGPT_Image_2026__8__16_____03_45_13-c66c5e7c-e644-4c41-bcdd-9f564e9e5ea4.png` |
| Original filename (best-effort 재구성 · 캐시 파일명 인코딩 기반 · 검증 불가) | `ChatGPT Image 2026-8-16 03_45_13(...)` 계열 — OS 원본 파일명 자체는 Cursor 캐시 아티팩트로만 존재, 독립 확인 불가 |
| SHA-256 | `a5c0f19114003b7856cc2ecbc1f730d2cc962a807561ddc12ef391dce32c7cab` |
| Dimensions | 1024 × 768 px |
| Aspect ratio | 4:3 (mockup 캔버스 비율 — 실제 타깃 모니터 해상도 그대로가 아니라 desktop web breakpoint 레이아웃 의도를 담은 캔버스로 해석) |
| Bytes | 147,378 |
| Device class | Desktop web (sidebar + main + right rail 3열) |
| Screen | Home (`/`) |
| State | Authenticated · `ready_data`(자산/기회 값이 채워진 상태) — 예시 값이며 §6 Money Semantics 참고 |
| Founder approval declaration | 본 세션에서 명시 확인(§0) |
| Intake timestamp | 2026-08-16 (세션 timestamp 03:54 KST 기준 접수) |

### 1.2 PEOTTEOK_HOME_MOBILE_VISUAL_MASTER_V1

| 항목 | 값 |
|---|---|
| Founder designation | `APPROVED VISUAL MASTER — MOBILE HOME` |
| Session reference (Cursor project cache · repo 자산 아님) | `c__Users_PC_AppData_Roaming_Cursor_User_workspaceStorage_346a29256ffbb8b95dfbb19147b08cc5_images_ChatGPT_Image_2026__8__16_____03_50_33-2e527c6f-a564-46f5-bdf9-0eee178eef33.png` |
| Original filename (best-effort 재구성 · 검증 불가) | `ChatGPT Image 2026-8-16 03_50_33(...)` 계열 — 위와 동일 사유로 독립 확인 불가 |
| SHA-256 | `e5b60c458489028f140ae4b817b6720ad446430c9778272a47d301ae9d6d06c1` |
| Dimensions | 576 × 1024 px |
| Aspect ratio | 9:16 (mobile portrait mockup 캔버스) |
| Bytes | 113,238 |
| Device class | Mobile web/PWA portrait (단일 컬럼 + 하단 고정 내비게이션) |
| Screen | Home (`/`) |
| State | Authenticated · `ready_data` — 예시 값, §6 참고 |
| Founder approval declaration | 본 세션에서 명시 확인(§0) |
| Intake timestamp | 2026-08-16 (세션 timestamp 03:54 KST 기준 접수) |

두 이미지는 동일 세션에서 5분 간격으로 생성된 한 쌍(desktop 03:45:13 → mobile 03:50:33)으로, 동일 디자인 언어 산출물임을 시간 근접성으로도 뒷받침한다.

---

## 2. Visual Authority Registration

`packages/ui/canon/contracts/ADR-018-peotteok-visual-master-reset.md` §3 Visual Authority Hierarchy에 따라, Home(`/`) 화면에 대해 다음을 **최상위 Visual Authority**로 등록한다:

```text
1. PEOTTEOK_HOME_DESKTOP_VISUAL_MASTER_V1  (§1.1) — Desktop Home
2. PEOTTEOK_HOME_MOBILE_VISUAL_MASTER_V1   (§1.2) — Mobile Home
```

- 등록 지점(텍스트 pointer): 본 문서 + `packages/ui/canon/surfaces/home-visual-v2.wire.json` 신규 필드 `visualMasterIntakeRef`(§4 참고).
- 아직 등록되지 않은 것: Visual Contract(H5) · Implementation Contract(H6) · Visual Lock(`visual-locks.v1.json` — §19 원칙상 본 단계에서 생성 금지).
- ADR-017 기반 Home 시각 authority(geometry·spacing·Hero composition·RightRail/Sidebar 비율·색 적용·shadow/radius)는 이미 ADR-018로 종료됨(historical/non-authoritative) — 본 등록으로 재확인만 하며 새로 종료하지 않는다.
- R2~R5 Hybrid state model(03 plan §R2~R5 Hybrid Rebase) 기준, Home(`/`)의 상태는 `WAITING_FOR_MASTER` → **`MASTER_INTAKE`(본 문서로 완료)** → 다음 `VISUAL_CONTRACT`(미시작)로 전이한다.

---

## 3. Shared Visual Language Lock (Desktop + Mobile 공통)

두 이미지에서 공통으로 확인되는 디자인 intent를 아래와 같이 lock한다 — H5/H6는 이 방향에서 벗어나지 않는다:

**허용 방향(양 이미지 일치):**

```text
Light-first · White · Premium Purple · Soft Lavender
Consumer Fintech · AI Intelligence
Rounded premium geometry · Soft dimensional card · Clean spacing
High trust · Friendly premium 3D 퍼뜩 AI 로봇
```

**금지 방향(양 이미지 모두 해당 없음 — 이탈 시 즉시 conflict):**

```text
crypto exchange / trading terminal / admin dashboard / casino
dark-first / neon / candlestick-centric / order book / BUY-SELL interface
```

이 방향은 현재 코드의 `theme-peotteok-light`(`apps/web/app/layout.tsx`)·`pd-fintech.ts` Light 토큰 방향과 **상충하지 않는다**(MATCH) — 정확한 hex/spacing/radius 수치는 ADR-018 §6 원칙에 따라 새로 추출해야 하며 본 문서가 확정하지 않는다.

---

## 4. Desktop Visual Intent — PEOTTEOK_HOME_DESKTOP_VISUAL_MASTER_V1

```text
Left Sidebar (로고 · 홈/기회/수익/지갑/내정보 · 하단 프로필)
Main content
  ├─ Greeting ("김퍼뜩님, 반가워요!")
  ├─ 퍼뜩 AI summary 카드 (로봇 + 발견한 기회 건수 · 평균 수익률 · 평균 처리 시간)
  ├─ Asset summary 카드 (KRW 중심 · USDT 보조 · 원금/예상수익/실제수익 · 입금/출금)
  ├─ Opportunity discovery 티저 (로봇 + 차트/도넛 그래픽 + "기회 보기" CTA)
  └─ Featured category 3카드 (Watches · Trading Cards · Luxury Bags)
Right Rail
  ├─ 진행 현황(개별 opportunity 단계 스테퍼)
  ├─ 다음 업데이트 예정
  ├─ 안전/신뢰 리스트
  └─ 퍼뜩 인사이트 티저(글로벌 아이콘 + 더보기)
```

Sidebar IA = `홈 · 기회 · 수익 · 지갑 · 내정보` (5개, 순서 고정) — 기존 `USER_TABS`/`navLabels`와 라벨·순서 일치(§9 MATCH).

---

## 5. Mobile Visual Intent — PEOTTEOK_HOME_MOBILE_VISUAL_MASTER_V1

Desktop의 단순 축소가 **아니다**:

```text
Mobile header (로고 + 알림 + 아바타)
Greeting + AI summary (동일 3-stat row, 1열 재배치)
Large asset summary 카드 (KRW 중심 · USDT 보조 · 원금/예상수익/실제수익 · 입금/출금 버튼 풀와이드)
ONE dominant featured opportunity 카드 + carousel dots(●○○○○) + "기회 보기 →" CTA
다음 업데이트 예정 + 안전/신뢰 카드 (2열 배치)
Bottom Navigation (홈 활성)
```

- Featured opportunity = **단일 지배 카드 + 캐러셀 intent**(dot indicator) — Desktop 3카드 그리드를 그대로 압축한 것이 아니다(§11 REQUIRED 준수 확인).
- Bottom Navigation 라벨/순서 = Desktop Sidebar와 동일(`홈 · 기회 · 수익 · 지갑 · 내정보`), 홈 active.

---

## 6. Money Semantics Lock

```text
KRW = primary
USDT = secondary
원금(principal) · 예상 수익(estimated) · 실제 수익(actual) = 서로 분리 · 병합 금지
```

Visual Master 내 숫자는 예시 값이며 backend truth·hardcode 근거가 **아니다**. 아래 값은 어떤 구현 단계에서도 DB/API 기본값·seed·placeholder로 사용을 금지한다:

```text
₩1,720,000 · 1,250.00 USDT · ₩1,560,000 · ₩128,000 · +₩32,000
7건 · 2.8% · 각 category 예상 금액 범위 · 오늘 오후 2:00
```

실제 값은 §9 Functional Conflict Matrix에 표기된 기존 backend/ledger/product truth(존재하는 경우) 또는 신규 계약(H4)에서 와야 한다.

---

## 7. Processing-Time Semantics Lock

Visual Master 핵심 경험 = **분 단위**(`약 1~3분` · `약 1~2분`). 기존 legacy `expectedSellDays`(일 단위)는 이미 "유저 투영 0"(`02 Engine plan` v7.22.28)로 잠겨 있어 재사용 대상 자체가 없다 — 충돌 없음(MATCH 방향). 단 정확한 범위/카테고리별 표기는 Engine `Soft60/Hard90` SLA(§9 참고)로부터 재확인이 필요하며, Visual Master의 리터럴 문자열(`1~3분` 등)을 그대로 카피 SSOT에 고정하지 않는다(§6 예시 값 금지 원칙과 동일 축).

---

## 8. AI Role Lock

퍼뜩 AI = **시장 탐색 · 가격 비교 · 기회 설명 · 상태 설명 · 처리 안내**로 한정한다. Visual Master 어디에도 퍼뜩 AI가 사용자 자금을 직접 조종·매매·자동투자·수익보장·BUY/SELL을 수행하는 것으로 해석되는 표현은 없음을 확인했다(MATCH — 기존 `ai-coach-fact-only.cjs`/`ai-coach-no-autonomy.cjs` 정책과 상충 없음). H5/H6에서 로봇 카피·마이크로카피 작성 시 이 경계를 재확인해야 한다.

---

## 9. Functional Conflict Matrix

분류 값: `MATCH` · `VISUAL_ONLY_EXAMPLE` · `FUNCTIONAL_BINDING_REQUIRED` · `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT` · `NOT_SUPPORTED`.

| Visual element | Functional source (현재 repo) | Classification | Conflict / 비고 |
|---|---|---|---|
| Sidebar IA 5탭(홈·기회·수익·지갑·내정보) | `apps/web/routes.ts USER_TABS` · `BottomNav5.tsx` · `home-visual-v2.wire.json navLabels/navHrefs` | MATCH | 라벨·href·순서 완전 일치 |
| Bottom Navigation(Mobile) 5탭 | 위와 동일(`BottomNav5` 반응형 sidebar↔bottomnav) | MATCH | 없음 |
| Header 알림/아바타 | `AppHeader.tsx`(`notificationHref="/me/inbox"` · avatar 슬롯) | MATCH | 아바타는 현재 고정 이미지 슬롯 — 이니셜(예: "김") 표시 방식은 §11 참고 |
| **Greeting("김퍼뜩님, 반가워요! 👋")** | 없음 — 현재 Home에 개인화 인사 블록 자체가 없음(`T.home`에 `greeting` 키 없음) | FUNCTIONAL_BINDING_REQUIRED | 신규 block. **부가 conflict:** `👋` Unicode emoji가 영구 Product UI 헤딩에 사용됨 — `.cursor/rules/visual-master-intake.mdc` §Emoji("영구 Product UI = Emoji 금지 · Toast 예외")와 상충 가능성 → `VISUAL_FUNCTIONAL_CONTRACT_CONFLICT`로 별도 표기, H5에서 Founder 결정 필요(이모지 유지 예외 승인 또는 브랜드 아이콘 대체) |
| 퍼뜩 AI summary "✨" 표기(Mobile) | 없음 | VISUAL_FUNCTIONAL_CONTRACT_CONFLICT | 위 항목과 동일 클래스 — 영구 UI 이모지 정책과 재확인 필요 |
| AI summary "발견한 기회 N건" | `HomeReadModelResponse.opportunity.itemCount`(타입에 존재하나 `HomePageClient`/`HomeExperience`에 미배선) | FUNCTIONAL_BINDING_REQUIRED | 배선 gap만(신규 backend 불필요) — 단 "발견=전체 items" vs "발견=affordable만" 정의는 H4 확정 필요 |
| AI summary "예상 평균 수익률 2.8%" | 없음(`OpportunityFeedResponse`/`HomeReadModelResponse` 어디에도 평균 마진율 필드 없음) | FUNCTIONAL_BINDING_REQUIRED | 서버 계산 필드 신설 필요. **주의:** H2/H3 forensic(`redesign-r1-home-truth-preflight`)에서 클라이언트 sum 계산(`sumAffordableExpectedProfitUsdt`)을 이미 결함으로 제거한 전례가 있음 — 클라이언트 재계산 재도입 금지, 서버 derived만 |
| AI summary "평균 처리 시간 약 1~3분" | Engine `Soft60/Hard90` SLA(§48.13 · `soft-hard-requeue-timeout`) | FUNCTIONAL_BINDING_REQUIRED | 방향은 일치(분 단위)하나 집계 필드로 노출된 적 없음 — §7 참고 |
| 자산 카드 "원금" | `WalletBuckets.principalUsdt` → `home-principal-slots.wire.json principalBalance` → `HomePrincipalRail` | MATCH | 이미 라이브 배선 |
| 자산 카드 "예상 수익" | `todayPossibleProfitUsdt`(Engine server_derived) → `home-principal-slots.wire.json todayPossibleProfit` | MATCH | 이미 라이브 배선 |
| 자산 카드 **"실제 수익"(+₩32,000)** | `WalletBuckets.profitUsdt`("출금 가능 수익" · `01 Money plan` schemas/wallet-buckets.v1.json) — Money API에는 존재하나 `HomeReadModelResponse`/`home-visual-v2.wire.json factSurface.money`에는 없음. wire의 `forbiddenWithoutContract`에 `cumulativeProfitUsdt`가 이미 등재 | FUNCTIONAL_BINDING_REQUIRED | 배선 없는 것과 "계약 없이 금지"가 겹침 — H4 Product Contract가 `실제 수익` = `profitUsdt` 매핑(범위: 오늘 vs 전체 누적)을 명시해야 `forbiddenWithoutContract` 해제 가능. 임의 도입 금지 |
| KRW 중심 표시(₩ 큰 값 + ≈USDT 보조) | `HomePrincipalRail`에 `principalKrwApprox` prop·분기 로직 이미 존재 | FUNCTIONAL_BINDING_REQUIRED | 컴포넌트 로직은 있으나 `HomePageClient`가 `principalKrwApprox`를 전혀 채우지 않음(항상 null → 현재 런타임은 USDT-primary로만 표시) → FX 소스 배선 필요. Engine/Infra에 `fx-snapshot.service.ts`/frankfurter adapter 존재(§ Money·Infra) — 신규 발명이 아니라 배선 gap |
| 입금 CTA | `T.feed.ctaDeposit` → `/wallet/deposit`(`HomePrincipalRail`) | MATCH | 없음 |
| 출금 CTA(자산 카드 내) | 없음 — 현재 Home엔 출금 버튼 없음(지갑 탭에서만) | FUNCTIONAL_BINDING_REQUIRED | Home에 출금 진입점 추가 여부는 Product/Visual Contract 결정 사안 |
| 예상/실제 수익 옆 "ⓘ" 정보 아이콘 | 없음(현재 라벨에 툴팁 어포던스 없음) | FUNCTIONAL_BINDING_REQUIRED | 신규 UI affordance, 데이터 영향 없음 |
| Opportunity discovery 티저 문구 | `BalanceAwareHome` `scanHero`(`T.feed.homeTitle`/`homeScanSub`) 텍스트 블록과 역할 유사 | FUNCTIONAL_BINDING_REQUIRED | 텍스트 슬롯은 있으나 로봇+차트/도넛 그래픽 조합은 신규 |
| Featured 카테고리(Watches/Trading Cards/Luxury Bags) | `CategoryFilterChips`(`watch`/`trading_card`/`luxury_bag`) · `OpportunityCard` · `ProductImage`/`assetImageUrl` adapter | MATCH | 카테고리 키·이미지 소스 구조 일치 |
| 카테고리별 "예상 수익 범위 · 수익률 범위 · 처리 시간" 표기 | `OpportunityCard`는 단일 `expectedProfitUsdt`(범위 아님) 필드만 표시 | FUNCTIONAL_BINDING_REQUIRED | 범위(min~max) 표기는 카드 데이터 모델 확장 필요 — Engine 필드 재발명 금지, 존재하는 값의 표시 방식 문제인지 신규 필드 문제인지 H4 확인 필요 |
| Right Rail "진행 현황"(개별 opportunity 3단계 스테퍼: 분석완료/처리중/완료대기) | `HomeRightRail` progress rows(스캔/확인/진행/정산 **COUNT**, C01 lock) — 개별 아이템 단위 스테퍼가 아님 | FUNCTIONAL_BINDING_REQUIRED | 현재는 플랫폼 전체 COUNT 표시(C01 semantic lock, 변경 금지) — Visual Master는 "내가 참여한 특정 상품의 단계"로 보임 → 다른 데이터 축(참여 건 상태/FSM). Engine FSM 라벨링(participate→matching→settlement) 매핑은 H4에서 결정, C01 COUNT 표시는 그대로 보존해야 함(혼동 금지) |
| "다음 기회 업데이트 예정 · 오늘 오후 2:00" | 없음 — 스캔 주기/다음 갱신 시각 개념이 Engine/Admin 어디에도 없음(grep 0건) | NOT_SUPPORTED | 백엔드에 대응 개념 자체가 없음 — Founder/GPT 결정 필요(신규 스케줄 개념 도입 여부, §16) |
| "안전하고 신뢰할 수 있어요"(원금 상태 확인/처리 상태 확인/개인 정보 보호) | 없음(`trust.ts`/`objections.ts`에 해당 문구 없음) | FUNCTIONAL_BINDING_REQUIRED | 신규 copy+block, 단 방향성(안전/신뢰)은 ADR-018 §14 메타 원칙과 상충 없음 |
| "퍼뜩 인사이트" 티저(글로벌 아이콘 + 더보기) | `market-weekly-briefing.wire.json`(route `/me/guide/market-weekly`, PART8b — 아직 미구현) 존재하나 Home teaser 없음 | FUNCTIONAL_BINDING_REQUIRED | Home에서 이 surface로 링크할지, 별개 개념일지 H4 확인 필요. `investment_advice`/`buy_now_cta` 등 해당 wire의 `forbidden` 승계 필요 |
| Mobile 단일 지배 카드 + carousel dots | `BalanceAwareHome`의 `hero = affordable[0]` 단일 강조 로직 존재(그리드 카드와 별도) · dot indicator 없음 | FUNCTIONAL_BINDING_REQUIRED | 강조 로직은 이미 있음(재사용 가능) — 캐러셀 UI(스와이프+dots)만 신규 |
| Mobile sticky "기회 보기 →" / Hero "기회 확인하기" CTA | `HomeHero`(`ctaHref="#home-opportunity"`) · `BalanceAwareHome` 기존 sticky CTA(`data-testid="home-sticky-cta"`, "수익 벌기") 이미 존재 | FUNCTIONAL_BINDING_REQUIRED | **주의**: 새 카드의 CTA가 기존 Hero CTA·기존 sticky CTA와 별개로 추가되면 Legacy Replacement Safety Gate(Safety-B) "duplicate sticky CTA/Primary CTA=0" 위반 — H6에서 단일 CTA 체계로 통합 필수, 추가 아님 |
| 퍼뜩 AI 로봇 마스코트(전 포즈) | `avatar-512.png`(다크/추상 스파클) · `hero-illustration-*.webp/avif`(robot+globe) — 둘 다 ADR-018 §13 `LEGACY VISUAL CANDIDATE`로 이미 분류됨 | VISUAL_FUNCTIONAL_CONTRACT_CONFLICT | 스타일 충돌 확인(다크 vs Light+Purple, 추상 vs 3D 친근형) — §11 Asset Production 참고, 기존 자산 재사용 금지 |

---

## 10. Legacy Home Forensic Classification Preview

H6 Implementation Contract가 사용할 **presentation-component forensic 후보 목록**이다(Safety-A 5분류: `KEEP`/`REWIRE`/`REMOVE_FROM_RUNTIME`/`REPLACE`/`INVESTIGATE`). 본 H1 단계에서 최종 확정하지 않으며, 실제 분류·삭제·교체는 H6에서 수행한다.

| 파일 | 역할 | 분류 후보 | 근거 |
|---|---|---|---|
| `apps/web/app/page.tsx` | 서버 컴포넌트 진입점(session cookie read) | KEEP | 순수 데이터/세션 로직, 시각 요소 없음 |
| `apps/web/app/HomePageClient.tsx` | fetch 오케스트레이션(HomeReadModel/OpportunityFeed/DayPulse/Growth) | KEEP | ADR-018 §7 비시각 로직 보존 대상 — 단 §9의 `principalKrwApprox`/`itemCount` 등 필드는 REWIRE(추가 배선) 필요 |
| `packages/ui/components/home/HomeExperience.tsx` | presentation 조립(Hero+Money+Opportunity+RightRail 배치) | REPLACE | 레이아웃 골격 자체가 새 Master(그리팅+AI요약+비대칭 그리드)와 상이 |
| `packages/ui/components/shell/AppShellRoot.tsx` | Shell 골격(BottomNav5+Header+Footer) | INVESTIGATE | 골격 구조(사이드바/헤더/바텀내비 3분할)는 유지 가능성 높으나 정확한 판단은 H5 geometry 확정 후 |
| `packages/ui/components/shell/BottomNav5.tsx` | 반응형 sidebar↔bottomnav 단일 컴포넌트 | REWIRE | IA(5탭 라벨/href)는 MATCH, 시각(색상/아이콘/브랜드마크 `✦`)은 §13 legacy candidate와 연결 — 재검토 필요 |
| `packages/ui/components/shell/AppHeader.tsx` | 헤더(스캔칩/알림/티어뱃지/아바타) | REWIRE | 알림/아바타 슬롯 재사용 가능, 그리팅 블록은 신규 추가(REWIRE 범위 내 확장) |
| `packages/ui/components/home/HomeHero.tsx` + `HomeHeroIllustration.tsx` | 기존 Hero(4단 타임라인+robot/globe illustration) | REPLACE | 새 Master에 STEP5식 Hero+4단 타임라인 자체가 없음 — 완전히 다른 조합(그리팅+AI요약 카드) |
| `packages/ui/components/opportunity/HomePrincipalRail.tsx`(`HomeMoneySurface`) | 자산 카드(원금/오늘가능수익) | REWIRE | Fact 매핑은 대부분 MATCH, "실제 수익"/KRW 배선/출금 CTA 확장 필요 |
| `packages/ui/components/opportunity/BalanceAwareHome.tsx` | Opportunity 목록+필터+empty+sticky CTA | REWIRE | 카테고리 필터·hero 강조 로직·empty state 로직 재사용, 시각 레이아웃(캐러셀/카드 스킨)은 교체 |
| `packages/ui/components/opportunity/OpportunityCard.tsx` | 카드 시각(3단 위계) | REPLACE | 시각 skin 전면 교체 대상 — 내부 필드 바인딩(requiredCapital/expectedProfit/aiConfidence 등)은 REWIRE로 보존 |
| `packages/ui/components/opportunity/CategoryFilterChips.tsx` | 카테고리 칩(전체/시계/카드/가방) | KEEP | 카테고리 키·라벨 그대로 MATCH |
| `packages/ui/components/home/HomeRightRail.tsx` | 우측 레일(정산 카운트/TOP3/진행현황 COUNT) | INVESTIGATE | C01 COUNT 시맨틱은 KEEP 필수, "개별 진행 스테퍼"는 §9 대로 새 데이터축 필요 — 컴포넌트 분리(KEEP 부분 + REPLACE 부분) 검토는 H6 |
| `packages/ui/components/pd/LivePayoutTicker.tsx` / `HomePayoutCounter.tsx` | 티커/카운터(현재 `mode="off"`) | KEEP | 시각 영향 없음(숨김 모드), Growth Owns 로직 그대로 |
| `packages/ui/components/shell/SiteFooter.tsx` | 하단 푸터+파트너 스트립 | INVESTIGATE | Visual Master 스크린샷 범위 밖(스크롤 하단) — 별도 확인 필요 |
| `packages/ui/brand/assets/ai/avatar-512.png` | AI 아바타 아이콘 | REPLACE(§11 asset) | 다크/추상 — 새 Master 3D 로봇과 스타일 불일치(ADR-018 §13 기록과 일치) |
| `packages/ui/brand/assets/ai/hero-illustration-*.{webp,avif}` | Hero robot+globe illustration | REPLACE(§11 asset) | 위와 동일 사유 |

---

## 11. Asset Production Candidates (첨부 ADDENDUM 반영)

Visual Master 품질을 유지하려면 아래 핵심 시각 자산은 **placeholder/emoji로 구현하지 않고 별도 제작 후 등록**해야 한다. 본 H1 단계에서는 실제 자산을 제작하지 않으며, 아래는 **식별만** 한다(ADDENDUM "ASSET-FIRST IMPLEMENTATION RULE" 1~3단계까지만 · 4~5단계는 H6 이후).

### A. 고퀄리티 asset 제작이 거의 확실히 필요한 항목

| 후보 asset name(예시) | 용도 | desktop/mobile | 현재 상태 |
|---|---|---|---|
| `peotteok-ai-robot-home-summary-v1` | AI summary 카드 로봇 포즈 | shared(동일 identity, 배치만 다름) | **ASSET_PRODUCTION_REQUIRED** — 기존 `avatar-512.png`(다크/추상) 재사용 불가 |
| `peotteok-ai-robot-home-cta-v1` | Opportunity discovery 티저 로봇 포즈(차트/도넛 옆) | shared | **ASSET_PRODUCTION_REQUIRED** |
| `peotteok-home-hero-support-graphic-v1` | Greeting/요약 보조 그래픽(도넛 차트 등) | desktop/mobile 별도 검토 필요 | **ASSET_PRODUCTION_REQUIRED** |

### B. 화면 품질에 따라 asset 정리가 필요한 항목

| 후보 | 용도 | 비고 |
|---|---|---|
| Featured opportunity 대표 비주얼(시계/카드/가방) | `ProductImage`/`assetImageUrl` adapter 경로 | 기존 adapter 소스 이미지 재사용 가능성 높음(로봇과 달리 실물 상품 사진) — MATCH 방향, §9 참고 |
| "안전/신뢰" 카드 보조 일러스트 | 신뢰 리스트 옆 장식 | 필수 여부는 H5 Visual Contract에서 확정(없어도 텍스트만으로 성립 가능) |
| "퍼뜩 인사이트" 글로벌 아이콘 | 인사이트 티저 | Brand Kit 기존 벡터 재사용 가능성 검토(§13 legacy globe 아이콘과는 별개 — 신규 검토 필요) |

### 원칙 확인

```text
placeholder 우선 구현 → 나중에 교체  = 금지
필요 asset 식별 → 제작/등록 → 그 asset 기준 구현 = 필수 순서
```

위 asset들은 **H6 Implementation Contract**가 "runtime component vs image asset", "필수/placeholder 금지 여부", "desktop/mobile 공용 여부"를 명시할 때 이 목록을 상속한다. 자산이 없어 Visual Master 품질을 못 맞추는 요소는 H7에서 `ASSET_PRODUCTION_REQUIRED`로 보고하고 STOP하는 것이 원칙이며, 본 문서가 그 의무를 앞당겨 종료시키지 않는다.

---

## 12. Replacement Principle Confirmation

```text
OLD UI + NEW UI (overlay/reskin/hybrid) = FORBIDDEN
PRESERVED FUNCTIONAL/DATA/ACTION LOGIC → REWIRE → NEW PRESENTATION ONLY = REQUIRED
```

`.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md`의 **Legacy Replacement Safety Gate**(Safety-A/B/C, 2026-08-16 신설)가 이미 이 원칙을 R1~R5 공통 게이트로 잠가 두었다 — 본 문서는 그 게이트가 H1 intake 시점에도 유효함을 재확인하며 새로 만들지 않는다.

---

## 13. 본 문서가 아닌 것 (H1 Boundary 명시)

```text
Visual Contract(H5)            아님 — geometry/색/타이포/spacing 수치를 확정하지 않음
Implementation Contract(H6)    아님 — component 매핑 최종 결정을 하지 않음(§10은 preview일 뿐)
Visual Lock(H10)                아님 — visual-locks.v1.json에 등록 없음
Runtime 변경                    아님 — apps/**·services/**·CSS·API·DB 변경 0
Asset 제작                      아님 — §11은 식별만, 실제 파일 생성/등록 없음
```

---

## 14. Next Authorized Step

```text
H4 Home Product Contract (redesign-r1-home-product-contract)
```

단, `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` File-Serial(YAML todos 순서) 기준 **실제 다음 pending 항목**은 `redesign-r1-home-brand-assets`(R1-2, Part A만 착수 가능)이다 — H4는 그 다음이다. 본 문서는 착수를 승인하지 않으며 보고만 한다.
