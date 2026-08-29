# Peotteok Home — Visual Contract v2 (H5 · Desktop + Mobile · ADR-018 §9)

| | |
|---|---|
| Status | **CONTRACT COMPLETE — VISUAL AUTHORITY DERIVED** (Implementation Contract·Visual Lock은 아직 없음) |
| Date | 2026-08-16 |
| Todo | `redesign-r1-home-visual-contract` (H5) — `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` |
| Authority class | **Visual Authority** (ADR-018 §3 사다리 2단계) — Functional Authority(H4)와 분리 유지 |
| Governs | Home(`/`) 화면의 **Desktop(`home-visual-desktop`) + Mobile(`home-visual-mobile`) 시각 계약**(구성·위계·타이포·색·카드·네비·반응형·접근성). API/DB/Money/Engine/Auth는 범위 밖 |
| Supersedes (시각 authority만) | [`peotteok-home-visual-contract.v1.md`](./peotteok-home-visual-contract.v1.md) — v1은 삭제하지 않고 HISTORICAL로 보존(이미 ADR-018 §4 배너 적용됨). 본 v2가 Home 시각 authority의 **현재 활성 Contract**다 |
| Inputs | `peotteok-home-visual-master-intake.v1.md`(H1) §1/§3/§4/§5/§6/§9/§11 · `peotteok-home-product-contract.v1.md`(H4) 전체 · `home-visual-v2.wire.json` functional fields · `home-principal-slots.wire.json` · `packages/ui/tokens/peotteok-light.specification.md` · `packages/ui/tokens/putduk.ts` · `packages/ui/tokens/breakpoints.ts` · ADR-018 §1~§14 |
| Runtime code changed by this document | **0** |
| Next step | H6 New Implementation Contract(`redesign-r1-home-implementation-contract`) — 본 문서는 그 착수를 승인하지 않으며 요구사항만 넘긴다(§20) |

---

## 0. 이 문서가 하는 일 / 하지 않는 일

```text
한다:   H1(intake)에서 등록된 Founder-approved Desktop/Mobile Visual Master로부터
        시각 계약(구성·위계·타이포·색·카드·네비·반응형·접근성)을 파생한다.
        정확한 px 값을 증명할 수 없으면 관계/범위/제약으로 표현하거나 PENDING_CALIBRATION으로 명시한다.
        H4의 미해결 기능 항목을 그대로 승계한다(해소하지 않음).

하지 않는다: React/CSS/API/DB/Money/Engine/Auth 변경 · component 매핑(H6) · 자산 생성/확정(Brand Assets Part B)
            · Visual Lock 등록 · ADR-017 geometry 재사용 · 정확한 Founder-approved px 값 발명
```

**중요한 사실 제약:** 본 세션은 Desktop/Mobile Visual Master 원본 이미지를 픽셀 단위로 재측정할 수 없다(원본 파일은 ADR-013/ADR-018 §9에 따라 레포에 저장되지 않으며, 본 세션은 H1 intake가 이미 텍스트로 추출한 구성/의도 서술에만 접근한다). 따라서 본 문서는 **관계·위계·제약** 중심으로 계약하며, 숫자가 필요한 자리는 `PENDING_CALIBRATION_FROM_MASTER`로 명시한다(Task 지시 "Visual Master Authority Rule" 준수).

---

## 1. Visual Authority References

| 계층 | 문서/자산 | 역할 |
|---|---|---|
| ADR | `packages/ui/canon/contracts/ADR-018-peotteok-visual-master-reset.md` §3(Visual Authority Hierarchy)·§9(intake 절차)·§10(PC/Mobile 분리) | 본 문서의 상위 authority |
| Master 등록 | `packages/ui/canon/contracts/peotteok-home-visual-master-intake.v1.md`(H1) §1.1 `PEOTTEOK_HOME_DESKTOP_VISUAL_MASTER_V1` · §1.2 `PEOTTEOK_HOME_MOBILE_VISUAL_MASTER_V1` | 본 문서가 파생하는 원천(§9 intake 완료 기록) |
| Functional Authority | `packages/ui/canon/contracts/peotteok-home-product-contract.v1.md`(H4) | 본 문서와 분리되나 모든 데이터 바인딩 판정의 SSOT — 본 문서는 H4가 확정한 판정을 재확정하지 않는다 |
| Canon wire(기능) | `packages/ui/canon/surfaces/home-visual-v2.wire.json`(`route`/`navLabels`/`navHrefs`/`heroTimeline`/`factSurface`/`forbidden`) · `packages/ui/canon/surfaces/home-principal-slots.wire.json` | 참조만, 재정의 금지(H5 todo 명시) |
| 기존 승인 토큰(Layer 1) | `packages/ui/tokens/peotteok-light.specification.md`(색·spacing·radius·shadow·fontScale 스케일) · `packages/ui/tokens/putduk.ts` · `packages/ui/tokens/breakpoints.ts`(일반 viewport tier) | "existing approved design tokens" — 본 문서가 인용 가능한 유일한 수치 근거. **Home 전용 적용값**(sidebar/rightRail/hero px 등)은 ADR-018 §1.2로 금지되어 인용하지 않음 |
| 절차 SSOT | `.cursor/rules/visual-master-intake.mdc` · `.cursor/rules/mockup-governance.mdc` | Emoji/Missing Asset/LOCK 절차 |
| Change Control | `governance/platform-redesign/change-control.v1.md` §6.5 `cc.adr018.peotteok-visual-master-reset`(L3) — 본 문서는 그 §17 NEXT AUTHORIZED STEP 계열의 연속이며 별도 L3 변경을 새로 열지 않음(§4.2 L2 Contract 절차로 충분) |

**surfaceId 선언(ADR-018 §10 — Desktop/Mobile 별도 authority):**

```text
home-visual-desktop  ← PEOTTEOK_HOME_DESKTOP_VISUAL_MASTER_V1 단독 파생
home-visual-mobile   ← PEOTTEOK_HOME_MOBILE_VISUAL_MASTER_V1 단독 파생
```

Desktop 절(§2)은 Mobile Master를 참고하지 않았고, Mobile 절(§3)은 Desktop Master를 참고하지 않았다. 공통점은 §4(Shared Design Language)에서만 별도로 확인한다 — 한쪽에서 다른 쪽 geometry를 추론하지 않았다.

---

## 2. Desktop Composition Contract (`home-visual-desktop`)

3-column shell: **Left Sidebar · Main content column · Right Rail**(H1 §4).

### 2.1 Left Sidebar

| 구성 | 계약 |
|---|---|
| 역할 | 영구 좌측 컬럼 · 브랜드 마크(상단) · 5탭 IA · 하단 프로필 앵커 |
| IA 잠금 | `홈 · 기회 · 수익 · 지갑 · 내정보`(순서 고정) — `home-visual-v2.wire.json navLabels/navHrefs`와 라벨·href·순서 100% 일치(MATCH, H1 §4 재확인) |
| 폭 관계 | Main보다 뚜렷하게 좁음 · Right Rail과 비슷하거나 그보다 좁은 좁은 고정폭 컬럼(정확한 폭 비율=`PENDING_CALIBRATION_FROM_MASTER`) |
| 하단 앵커 | 프로필/초대 진입(기존 `AppHeader`/inviteCard 계열 슬롯과 기능 중복 없이 재사용, §13) |

### 2.2 Main content column — 상단→하단 순서(잠금)

```text
1. Greeting
2. 퍼뜩 AI summary 카드
3. Large asset(Money) summary 카드
4. Opportunity discovery 티저
5. 3-category Opportunity 카드 그리드
```

| # | 블록 | 계약 |
|---|---|---|
| Greeting | 개인화 인사 1줄("OO님, 반가워요" 계열) · Main 내 최상단 · **신규 카피 슬롯**(H4 §8 FUNCTIONAL_BINDING_REQUIRED, 이름 표시 방식은 H6에서 확정) · 타이포는 §6 참고(카드 숫자보다 작음) |
| 퍼뜩 AI summary | 로봇 존재감(§11) + 3-stat row(발견한 기회 건수·평균 수익률·평균 처리시간) · 각 stat = 별도 FUNCTIONAL_BINDING_REQUIRED(H4 §8) · 데이터 미도달 시 기존 `scanIdle`/`scanEmpty` 카피 상태로 대체(발명 금지, H4 §9) |
| Asset(Money) summary | KRW-primary/USDT-secondary(§9) · 원금/예상수익/실제수익 3-슬롯 분리(§9) · 입금 CTA(기존 `T.feed.ctaDeposit` 재사용) + 출금 CTA(Home 신규 진입점, H4 §10 FUNCTIONAL_BINDING_REQUIRED) |
| Opportunity discovery 티저 | 로봇(§11) + 보조 그래픽(§16) + "기회 확인/기회 보기" 계열 CTA — **H6에서 기존 Hero CTA·sticky CTA와 반드시 단일화**(중복 CTA 생성 금지, H1 §9 CTA 중복 위험 재확인) |
| 3-category 카드 그리드 | 시계(`filterCategoryWatch`)·카드(`filterCategoryCard`)·가방(`filterCategoryBag`) 3개 **동시 노출**(단일 필터 뷰 아님) · 카드 내부 위계=§10 |

### 2.3 Right Rail

| 구성 | 계약 |
|---|---|
| 폭 관계 | Main보다 훨씬 좁은 영구 컬럼 · Desktop 전용(§14 — Mobile에 직접 대응 컬럼 없음) |
| Zone A — 처리/신뢰 pulse | **기존 COUNT 기반 fact 유지**(오늘 정산 건수=COUNT, C01 lock·`ledgerTotal_as_count`) — USDT 금액으로 재해석 금지(`home-visual-v2.wire.json forbidden: ledgerTotal_as_usdt` 불변) |
| Zone B — "진행 현황"(개별 참여 스테퍼) | Visual Master가 보여주는 개별 참여건 단계(분석완료/처리중/완료대기)는 **Zone A와 다른 데이터 축**(H1 §9) — 이 슬롯은 시각적으로만 계약하며 실제 FSM 바인딩은 H4가 이미 FUNCTIONAL_BINDING_REQUIRED로 남겨둔 상태를 그대로 승계(§18) · Zone A의 COUNT 표시를 대체하지 않음(둘 다 존재 가능, 혼동 표기 금지) |
| Zone C — Update 슬롯 | §12 |
| Zone D — Trust 리스트 | §12 |
| Zone E — 퍼뜩 인사이트 티저 | `market-weekly-briefing` surface로의 링크 의도(H1 §9) — 실제 라우팅 배선은 H6 |

---

## 3. Mobile Composition Contract (`home-visual-mobile`)

Desktop의 단순 축소가 **아니다**(H1 §5 재확인). 단일 컬럼 stack:

```text
1. Header (브랜드 마크 + 알림 + 아바타)
2. Greeting + AI summary (1열 재배치, Desktop과 동일 3-stat row)
3. Large asset summary 카드 (원금/예상수익/실제수익 3-슬롯 · 입금/출금 풀와이드 버튼)
4. ONE dominant featured opportunity 카드 + carousel dots
5. Update/Trust 2열 압축 카드
6. Bottom Navigation (fixed · 5탭)
```

| # | 블록 | 계약 |
|---|---|---|
| Header | 기존 `AppHeader` 알림(`notificationHref="/me/inbox"`)/아바타 슬롯 재사용(MATCH, H1 §9) |
| Greeting + AI summary | Desktop과 **동일한 3-stat 데이터**, 1열로 재배치(카드를 나란히 두지 않고 위아래로 쌓음) |
| Asset summary | 원금/예상수익/실제수익 3-슬롯(§9)을 **Desktop처럼 2-col 배치가 아니라** 카드 전체 폭 사용 · 입금/출금 = 풀와이드 버튼(inline 텍스트 링크가 아님, H1 §5) |
| Featured opportunity | **단일 지배 카드** — `BalanceAwareHome`의 기존 `hero = affordable[0]` 강조 로직 재사용(데이터 관점 MATCH, H1 §9/§6) · Desktop 3-그리드를 압축한 것이 아니라 **완전히 별도의 Mobile 전용 프레젠테이션** |
| Carousel 시각 의도 | dot indicator(`●○○○○` 계열)로 "더 많은 기회가 있음"을 신호 · 스와이프 가능 intent · 정확한 dot 개수/카드 크기=`PENDING_CALIBRATION_FROM_MASTER`, 기존 feed 데이터 재사용(신규 endpoint 금지) |
| Update/Trust | Desktop의 4-zone Rail이 아니라 **2열 압축 카드**(H1 §5) — 콘텐츠는 §12와 동일, 배치만 Mobile 전용 |
| Bottom Navigation | 5탭, Sidebar와 동일 라벨/순서/href(§13), 홈 active |

### 3.1 Density / Touch

- Mobile의 수직 리듬은 Desktop보다 조밀함(정확한 spacing step=§7 참고, PENDING_CALIBRATION).
- 모든 탭 가능 요소(바텀내비 아이템·CTA 버튼·carousel dot)는 §15 터치 타깃 요건을 만족해야 한다.

---

## 4. Shared Design Language (Desktop + Mobile 공통 · H1 §3 승계)

**허용 방향(두 Master 모두 일치):**

```text
Light-first · White · Premium Purple · Soft Lavender
Consumer Fintech · AI Intelligence
Rounded premium geometry · Soft dimensional card · Clean spacing
High trust · Friendly premium 3D 퍼뜩 AI 로봇(단일 캐릭터, §11)
```

**금지 방향(두 Master 모두 해당 없음 — 이탈 시 즉시 conflict):**

```text
crypto exchange / trading terminal / admin dashboard / casino
dark-first / neon / candlestick-centric / order book / BUY-SELL interface
```

이 방향은 현재 `theme-peotteok-light`(`apps/web/app/layout.tsx`) · `pd-fintech.ts` Light 토큰 방향과 상충하지 않는다(MATCH, H1 §3 재확인). 정확한 hex/spacing/radius 수치는 §7~§8에서 기존 토큰 스케일 범위 내로만 다룬다.

---

## 5. Layout Hierarchy (관계/범위 · px 발명 금지)

| 관계 | 계약 |
|---|---|
| Desktop 컬럼 폭 순서 | Main > (Sidebar ≈ Right Rail, 둘 다 Main보다 뚜렷히 좁음) — 정확 폭/비율 `PENDING_CALIBRATION_FROM_MASTER` |
| Desktop Main 내부 시선 우선순위(위→아래) | Greeting < AI summary < Asset summary < Opportunity discovery < Category cards (아래로 갈수록 "먼저 훑는 순서"가 아니라 **읽는 순서**다 — 숫자 시각 크기는 §6에서 별도로 정의하며 순서와 크기가 반드시 비례하지 않음: 예를 들어 Asset summary 숫자가 Greeting 글자보다 시각적으로 더 크더라도 순서상 3번째다) |
| Mobile stack 순서(위→아래) | Header < Greeting+AI summary < Asset summary < Featured opportunity < Update/Trust < BottomNav(고정) |
| Right Rail 존재 범위 | Desktop 전용 — Mobile에는 해당 컬럼이 없음(§14) |

**명시적 미확정(구현 전 재측정 필요, ADR-018 §1.2에 따라 옛 수치 재사용 금지):**

```text
정확한 sidebar/main/rightRail px 또는 % 폭
정확한 카드 높이·간격 px
정확한 hero/티저 블록 높이 px
```

이 값들은 옛 ADR-017 수치(sidebar 240px · rightRail 320–360px · header 64px · hero 480–600px · illustration ≤46%)로 **대체 채움 금지**(ADR-018 §1.2/§6). H6 구현 단계에서 실제 Master 이미지 재측정 또는 Founder 재확인으로 확정한다(§20).

---

## 6. Typography Hierarchy (관계 · 기존 fontScale 토큰 참고)

| 순위 | 콘텐츠 | 비고 |
|---|---|---|
| 1 (가장 큼/굵음) | 원금(principal) 숫자 | Money summary의 headline 숫자 — KRW 우선(§9) |
| 2 | 예상수익·실제수익 숫자(서로 동급) | 원금보다 작으나 본문 텍스트보다 큼 · 서로 크기는 동일, 색·레이블로만 구분(§9) |
| 3 | 섹션 제목류(Greeting·카드 타이틀·AI summary 헤딩) | 숫자보다 작음 |
| 4 | 본문/카피 텍스트(카드 설명·트러스트 문구) | |
| 5 (가장 작음) | meta/caption(업데이트 타임스탬프류·안내 라벨) | §12 |

- 전역 확대 허용치 = 기존 `fontScale.md/lg/xl`(1.0/1.15/1.3, `peotteok-light.specification.md`) — 새 스케일 발명 금지, §15 재확인.
- 숫자(금액) 표기는 기존 money 표시 컴포넌트의 자리맞춤 관행을 유지(신규 숫자 서체 처리 발명 금지).
- 정확한 px/rem 값 = `PENDING_CALIBRATION_FROM_MASTER`.

---

## 7. Card / Geometry Contract (기존 토큰 스케일 참고 · 신규 수치 발명 금지)

| 속성 | 계약 | 근거 |
|---|---|---|
| Roundness | 카드 단위는 "일관되게 둥근, 프리미엄 소프트 지오메트리" 방향 · 후보 토큰 = `radius.lg`(16px)/`radius.xl`(20px) 스텝(입력 요소용 `radius.sm/md`보다 큰 스텝) | `peotteok-light.specification.md` §radius(기존 Layer-1 토큰) — 정확한 스텝 선택은 H6 |
| Soft dimensional 처리 | 카드는 평평하지 않고 얕은 입체감 — 후보 토큰 = `shadow.card`(기존 dual-layer soft shadow, 퍼플 틴트 포함) | 동일 spec §shadow — 신규 shadow 값 발명 금지 |
| 카드 독립성 | 각 카드는 `color.surface`(#FFFFFF) 배경의 경계가 있는 독립 표면 — edge-to-edge/무경계 섹션이 아님 | H1 §3 "Soft dimensional card" 방향 |
| 카드 간 간격 | 기존 spacing 스텝(`xs4/sm8/md16/lg24/xl32`) 중 하나를 일관 사용 — Home 전용 새 스텝값 발명 금지 · 정확한 스텝 선택 = `PENDING_CALIBRATION_FROM_MASTER` | 동일 spec §spacing |

---

## 8. Color / Tone Contract (기존 토큰만 인용 · 신규 hex 발명 0)

| 역할 | 후보 토큰(기존) | 적용 방향 |
|---|---|---|
| 배경 | `color.bg` `#F6F4FC`(라벤더 틴트 뉴트럴) | 전체 페이지 배경 |
| 카드 표면 | `color.surface` `#FFFFFF` | 모든 카드/사이드바 |
| 강조/CTA/active nav | `color.accent` `#6B3CFF`(Premium Purple) | CTA 버튼·활성 nav·강조 요소 — **대면적 채움이 아니라 강조용**(White가 지배적, Purple은 포인트) |
| 수익(양수) | `color.profit` `#12B76A` | 실제/예상 수익의 양수 표기(§9) — 색만으로 전달하지 않음(§15) |
| 경고/에러 | `color.warning` `#F79009` / `color.danger` `#F04438` | 기존 의미 그대로, Home 전용 재정의 없음 |
| Hero/보조 그래픽 그라디언트(선택적) | `color.heroGradientFrom/To`(`#2B1B6B`→`#5B3CFF`) | Opportunity discovery 티저 보조 그래픽에 한해 후보(§16, 자산 제작 시 확정) |

White/Purple/Lavender **비율**은 "White·Lavender가 넓은 배경/표면을 차지하고 Purple은 CTA·활성상태·강조 텍스트에 집중"이라는 방향만 계약한다 — 텍스트 서술만으로는 정확한 면적 비율을 측정할 수 없으므로 수치화하지 않는다(H6 스크린샷 단계에서 정성 확인).

---

## 9. Money Visual Hierarchy

### 9.1 KRW / USDT

- **KRW = primary**, **USDT = secondary**(H1 §6 · H4 §4 방향 MATCH) — 이미 `HomePrincipalRail`에 분기 로직 존재, 배선 gap은 H4 §4 FUNCTIONAL_BINDING_REQUIRED로 승계(§18).
- 환율 재계산 UI 금지(`fx_recalc_in_ui`, 기존 forbidden 불변) — 서버가 계산해 내려주는 값만 표시.

### 9.2 원금 / 예상수익 / 실제수익 — 3-슬롯 분리(합산 금지)

```text
원금(principal) · 예상 수익(estimated) · 실제 수익(actual)  = 서로 분리 · 병합/합산 표시 금지
```

(Money §49.2a bucket-invariant와 동일 원칙 — 이 3개를 더해 "총 자산" 같은 새 숫자를 만들지 않는다.)

| 위계 | 슬롯 | 시각 처리 |
|---|---|---|
| 1차(가장 큼) | 원금 | Asset summary 카드의 headline 숫자 · KRW 큰 값 + USDT 보조(§6) |
| 2차(동급) | 예상 수익 | 원금보다 작은 동일 등급 숫자 · 레이블로 구분 |
| 2차(동급) | **실제 수익** | 예상 수익과 **같은 크기 등급**(둘 중 하나가 다른 하나를 지배하지 않음) · 양수일 때 `color.profit` + "+" 접두(§8/§15) · ⓘ 정보 아이콘 동반 가능(신규 UI affordance, 데이터 영향 0, H1 §9) |

### 9.3 실제 수익 — ACTUAL PROFIT (필수 보존 조항)

```text
ACTUAL_PROFIT_VISUAL_SLOT     = APPROVED
ACTUAL_PROFIT_RUNTIME_BINDING = UNRESOLVED
```

- 본 문서는 "실제 수익" 슬롯의 **시각 위치·위계·타이포·원금/예상수익과의 관계**(위 표)만 계약한다.
- 본 문서는 `WalletBuckets.profitUsdt` 또는 그 어떤 Money 필드도 이 슬롯의 런타임 바인딩으로 **선택하지 않는다**(H4 §5 판정 그대로 승계 — name-match만으로 확정하지 않음, hard guard 해제는 Founder/Money-owner 결정 필요).
- H6은 이 슬롯을 구현할 때 반드시 §18을 다시 확인해야 하며, 바인딩이 Founder/Money-owner 승인으로 해소되기 전까지는 이 슬롯에 실제 데이터를 연결하지 않는다(플레이스홀더 숨김 또는 "준비 중" 상태 등 구체적 처리는 H6/Founder 결정).

### 9.4 입금 / 출금

- 입금 CTA = 기존 `T.feed.ctaDeposit`(`/wallet/deposit`) 재사용 — 신규 CTA 생성 금지.
- 출금 CTA = Home에 신규 진입점(현재 없음, H4 §10 FUNCTIONAL_BINDING_REQUIRED) — mutation 자체는 기존 wallet withdraw API 재사용, 신규 API 금지. 시각 위치는 Asset summary 카드 내부, 입금 CTA와 대칭적 위계(Mobile은 §3 풀와이드 버튼).

---

## 10. Opportunity Visual Hierarchy

### 10.1 카드 내부 위계(Desktop/Mobile 공통)

```text
1. 카테고리 라벨(시계/카드/가방)
2. 대표 이미지(기존 adapter 자산 재사용 · MATCH)
3. 필요 금액(requiredCapitalUsdt · MATCH)
4. 예상 수익(expectedProfitUsdt · 범위 표기는 FUNCTIONAL_BINDING_REQUIRED, §18)
5. AI 신뢰도(aiConfidenceScore · MATCH)
6. 처리 시간 예상(estimatedDurationSec 매핑 · FUNCTIONAL_BINDING_REQUIRED, §18)
7. CTA "수익 벌기"(기존 product lock 재사용 · 신규 CTA 문구 금지)
```

### 10.2 Desktop vs Mobile 프레젠테이션

| | Desktop | Mobile |
|---|---|---|
| 카드 수 | 3개(시계·카드·가방) 동시 노출, 서로 동등한 시각 비중 | 1개 지배 카드(다른 카드보다 명확히 큰 시각 비중) + carousel dots |
| 데이터 | feed가 이미 여러 카테고리를 반환(MATCH, 신규 데이터 불필요) | `hero = affordable[0]` 강조 로직 재사용(MATCH) |
| 발견 방식 | 그리드 스캔 | 캐러셀 탐색(스와이프) |

---

## 11. AI Visual Treatment

### 11.1 캐릭터 동일성

퍼뜩 AI는 Home 안에서 **단일 캐릭터**로 나타난다(다른 포즈여도 같은 정체성). 최소 2개 포즈가 필요하다(§16):

```text
peotteok-ai-robot-home-summary-v1   — AI summary 카드 포즈
peotteok-ai-robot-home-cta-v1       — Opportunity discovery 티저 포즈
```

기존 `avatar-512.png`(다크/추상)·`hero-illustration-*`(robot+globe)는 스타일 불일치로 재사용 금지(ADR-018 §13, §19 재확인).

### 11.2 역할 경계(재확인)

퍼뜩 AI = 시장 탐색·가격 비교·기회 설명·상태 설명·처리 안내로 한정(H1 §8 · H4 §8). 자금 자동운용·자동매매·수익보장·자금 직접이동을 암시하는 카피/시각 요소는 포함하지 않는다 — 기존 `ai-coach-fact-only.cjs`/`ai-coach-no-autonomy.cjs` 정책과 동일 축.

### 11.3 영구 이모지(👋/✨) 처리 — H5 결정

Visual Master의 Greeting/AI summary 인접부에 보이는 `👋`/`✨`는 **"따뜻함/강조" 시각 의도**를 나타낸다. 이 의도 자체는 보존하지만:

- Home Greeting/AI summary는 **영구 Product UI**(내비·카드·상태 계열)이며, `.cursor/rules/visual-master-intake.mdc` §Emoji의 Toast/snackbar/guide-title/peotteok-chat 등 기존 `EMOJI_CAPS` 예외 카테고리에 포함되지 않는다.
- 따라서 리터럴 `👋`/`✨` Unicode emoji를 런타임 요구사항으로 계약하지 않는다.
- **H5 결정:** 강조는 타이포그래피(굵기/크기, §6)·색(`color.accent`, §8) 조합만으로 표현한다. 별도 장식 마크(예: 브랜드 승인 아이콘) 도입은 이 문서가 결정하지 않는다 — 기존 `BrandMark ✦`도 legacy candidate(§19)라 자동 대체 근거가 될 수 없다. 필요하다면 별도 브랜드 자산 결정으로 다뤄야 하며, 본 계약은 "이모지 없이도 강조가 성립한다"는 것만 확정한다.

---

## 12. Update / Trust Presentation

### 12.1 Update 슬롯

리터럴 "다음 기회 업데이트 예정 · 오늘 오후 2:00"은 `NOT_SUPPORTED_AS_LITERAL_RUNTIME_TRUTH`(H4 §9 재확인) — 스케줄 개념을 새로 만들지 않는다.

**본 계약이 승인하는 대체 표현(H4 §9 후보 중 구현 시 택1, 데이터 가용성에 따라 H6 결정):**

| 대체 옵션 | SSOT | 시각 처리 |
|---|---|---|
| 최근 확인/갱신 시각 | `DayPulseResponse.asOf` | "최근 확인: {시각}" 계열 짧은 상태 줄 |
| AI가 살펴보는 중 | `T.home.header.scanIdle` | 스캔 상태 아이콘/문구 |
| 오늘 요약 준비 중 | `T.home.header.scanEmpty` | 준비 상태 문구 |

이 슬롯의 **시각 목적**(짧은 1줄 상태 표시, Right Rail Zone C / Mobile Update·Trust 압축 카드 내)은 그대로 유지한다 — 어떤 옵션을 쓸지는 데이터 가용성 문제이므로 H6이 확정한다.

### 12.2 Trust 리스트

"안전하고 신뢰할 수 있어요" 계열 짧은 트러스트 문구 목록(원금 상태 확인·처리 상태 확인·개인정보 보호) — 신규 카피+블록(H4 §9 FUNCTIONAL_BINDING_REQUIRED 승계), 방향성은 ADR-018 §14 메타 원칙과 상충 없음. 새로운 법적 주장을 만들지 않는다(기존 `trust.ts`/`objections.ts` 톤 유지).

### 12.3 퍼뜩 인사이트 티저

`market-weekly-briefing` surface(이미 존재, PART8b)로의 링크 의도 — 실제 라우팅 배선은 H6, 신규 콘텐츠 발명 금지.

---

## 13. Navigation Presentation

| | Desktop(Sidebar) | Mobile(Bottom Nav) |
|---|---|---|
| 컴포넌트 계열 | 기존 반응형 `BottomNav5` 패턴(REWIRE, H1 §10) | 동일 컴포넌트 계열의 반응형 표현 |
| IA(라벨/순서/href) | `홈 · 기회 · 수익 · 지갑 · 내정보`(잠금, MATCH) | 동일(잠금) |
| Active 상태 | 기존 `color.accent` fill · high-contrast(기존 spec 원칙, 신규 발명 아님) | 동일 |
| 시각 스킨(아이콘·브랜드 마크 내부 처리) | §19 legacy candidate 재검토 대상(`BrandMark ✦`) — 본 문서가 대체안을 확정하지 않음 | 동일 |
| Sidebar 하단 프로필 vs Header 아바타 | Sidebar 하단 앵커(§2.1) | Header 내 아바타 슬롯(§3, MATCH) |

두 표현은 같은 IA의 서로 다른 geometry일 뿐 — 라벨 세트나 순서를 플랫폼별로 다르게 만들지 않는다.

---

## 14. Responsive Intent (Desktop ↔ Mobile 관계 · 신규 3rd 디자인 발명 금지)

Desktop과 Mobile은 **각자의 승인된 authority**(§1)이며, 본 절은 그 사이의 **전환 관계**만 정의한다 — 새로운 태블릿 전용 디자인을 발명하지 않는다.

| 대상 | 관계 계약 |
|---|---|
| Sidebar | Desktop-tier 뷰포트에서만 존재 · 좁은 뷰포트에서는 기존 `BottomNav5`의 반응형 전환 로직(REWIRE 대상)을 재사용해 Bottom Nav로 전환 — 전환 임계값은 기존 구현값을 재확인해 재사용하고, 본 문서가 새 px 임계값을 발명하지 않음 |
| Right Rail | **Desktop 전용 컬럼** · Mobile에 직접 대응하는 컬럼이 없음 — 콘텐츠(Update/Trust)는 Mobile §3의 2열 압축 카드로 리플로우 · "진행 현황"(Zone B) 서브블록은 데이터 축이 실제로 바인딩되지 않는 한 Mobile에 억지로 자리를 만들지 않음(H6 결정) |
| Bottom Navigation | 좁은 뷰포트 전용 · fixed 위치 · Sidebar와 동시 화면 표시 금지(단일 내비게이션 surface 원칙, 기존 반응형 패턴 유지) |
| 카드 스태킹 | Desktop 3-그리드 → Mobile 1-지배+캐러셀은 "3장을 세로로 쌓기"가 **아니다** — §3의 별도 Mobile 조합이 완전히 대체한다 |
| Opportunity/Asset summary 리플로우 | 다열(Desktop) → 단일열 풀와이드(Mobile) 일반 리플로우 원칙만 계약 · 신규 px 없음 |
| 콘텐츠 밀도 | Mobile은 동시 노출 비필수 항목을 줄이고(3카드→1카드) 더 조밀한 spacing 스텝을 사용하는 방향(정확 스텝=§7 PENDING_CALIBRATION) |
| Overflow | Desktop 3-카테고리 그리드는 가로 스크롤을 요구하지 않음(고정 3-up) · Mobile 캐러셀은 **의도된** 가로 스와이프/overflow(dot indicator로 신호, 버그 아님) |
| Sticky/fixed 충돌 위험 | Mobile Bottom Nav(fixed) + 기존 sticky CTA(`home-sticky-cta`)가 동시에 화면 하단을 점유하면 안 됨(H1 §9 Safety-B 중복 CTA 위험 재확인) — H6은 반드시 **하단에 한 번에 하나의 액션 요소**만 남도록 통합해야 한다 |

---

## 15. Accessibility Visual Requirements (계약만 · 구현 0)

| 요건 | 계약 |
|---|---|
| 대비(contrast) | 모든 텍스트/숫자-표면 조합은 기존 spec이 이미 요구하는 "high contrast" 정성 기준(Hero title·Nav active·CTA)을 Home 전체로 확장 적용 — 정확한 WCAG 비율 검증은 H6/QA 실측 과제 |
| 포커스 가시성 | 모든 상호작용 요소(nav 항목·CTA·카드·carousel dot)는 hover와 구분되는 명시적 focus 표시가 있어야 함 — 새 focus 스타일 발명이 아니라 기존 컴포넌트 레벨 focus 처리 재사용 |
| 터치 타깃 | Mobile 상호작용 요소(바텀내비·CTA·carousel dot)는 기존 `responsive-device-tier`(PART8c completed) 터치 타깃 기준을 재사용 — 신규 기준 발명 금지 |
| 텍스트 확대 허용 | 기존 `fontScale.md/lg/xl`(1.0/1.15/1.3) 전 구간에서 레이아웃 겹침/잘림 없이 유지되어야 함 |
| 모션 저감 | carousel 자동 전환·카드 진입 애니메이션·AI "스캔 중" 모션은 `prefers-reduced-motion`을 존중해 정적 등가물로 대체 — 기존 `MotionCTA`/reduced-motion 원칙 재사용 |
| 색만으로 전달 금지 | 수익 양수 표기는 초록색만이 아니라 "+" 기호/레이블 텍스트를 동반(예시 `+₩32,000`의 "+" 자체가 이미 이 원칙과 일치) · 카테고리 카드는 색이 아니라 아이콘+라벨 텍스트로 구분(기존 패턴 MATCH) |

---

## 16. Asset Requirement Matrix (식별만 · 제작/생성 0)

| Asset | 용도 | Desktop/Mobile | 상태 | 비고 |
|---|---|---|---|---|
| `peotteok-ai-robot-home-summary-v1` | AI summary 카드 로봇 포즈 | 공유(동일 identity) | **ASSET_PRODUCTION_REQUIRED** | 기존 `avatar-512.png` 재사용 불가(스타일 불일치) |
| `peotteok-ai-robot-home-cta-v1` | Opportunity discovery 티저 로봇 포즈 | 공유 | **ASSET_PRODUCTION_REQUIRED** | 위와 동일 사유 |
| `peotteok-home-hero-support-graphic-v1` | Greeting/AI summary 보조 그래픽 | Desktop/Mobile 별도 필요 여부는 자산 제작 단계에서 확정 | **ASSET_PRODUCTION_REQUIRED** | H1 §11A 승계 |
| Featured opportunity 대표 이미지(시계/카드/가방) | 카드 내 상품 이미지 | 공유 | **REUSE(신규 제작 아님)** | 기존 `ProductImage`/`assetImageUrl` adapter 경로 재사용 가능성 높음(MATCH) |
| Trust 리스트 보조 일러스트 | 트러스트 카드 장식 | 선택적 | **DEFER(H6에서 필요 여부 확정)** | 텍스트만으로도 성립 가능(H1 §11B) |
| 퍼뜩 인사이트 아이콘 | 인사이트 티저 | 공유 | **INVESTIGATE(기존 Brand Kit 벡터 재사용 검토 우선)** | 신규 제작을 기본값으로 가정하지 않음 |

**원칙 재확인:**

```text
DO NOT GENERATE ASSETS NOW · DO NOT FINALIZE NEW ASSET FILES NOW
Brand Assets Part B(`redesign-r1-home-visual-asset-production`)는 H6 completed 이후에만 착수(YAML 위치 고정, H6.5 다음·H7 이전)
```

**금지 대체물(재확인):** emoji robot · cheap SVG robot · clipart · CSS-built mascot · random stock imagery · legacy dark avatar(`avatar-512.png`) 강제 재사용.

---

## 17. VISUAL_ONLY_EXAMPLE Handling

Task/H1에서 제시된 아래 리터럴 값은 **예시일 뿐**이며, 본 문서는 이들을 특정 필드에 역-매핑하지 않는다(어떤 예시가 원금/예상수익/실제수익/기타 중 무엇에 대응하는지 추측하는 것 자체가 "증명되지 않은 값 발명"이므로 시도하지 않았다):

```text
₩1,720,000 · 1,250.00 USDT · ₩1,560,000 · ₩128,000 · +₩32,000
7건 · 2.8% · category 예상 금액/수익률 범위 · 오늘 오후 2:00
```

- 이 값들은 형식(₩ 포맷·USDT 소수 2자리·"+"기호 관행) 참고에만 쓰였고, §6/§9/§10의 위계·관계 서술에 **수치로서** 반영되지 않았다.
- 어떤 코드/설정/seed/placeholder/기본값에도 이 리터럴을 하드코딩하지 않는다(H1 §6·H4 §12 재확인).
- "7건"/"2.8%" 등도 실제 값이 아니라 형식 예시이며, 실제 값은 §18에 승계된 FUNCTIONAL_BINDING_REQUIRED 항목이 해소된 후 서버에서 와야 한다.

---

## 18. H4 Unresolved Functional-Binding Carry-Forward (해소하지 않고 그대로 승계)

| H4 항목 | 판정(H4) | H5 처리 |
|---|---|---|
| "실제 수익" = `profitUsdt`? | `FUNCTIONAL_BINDING_UNRESOLVED` | §9.3에서 슬롯/위계만 계약, 바인딩 미선택 유지 |
| KRW `principalKrwApprox` 배선 | `FUNCTIONAL_BINDING_REQUIRED`(FX 인프라 존재, 배선 gap) | §9.1에서 KRW-primary 시각은 계약, 배선은 H6/Money-adjacent 과제로 유지 |
| `itemCount`/평균 수익률/평균 처리시간 집계 | `FUNCTIONAL_BINDING_REQUIRED`(다수) | §2 AI summary 3-stat 슬롯 계약, 서버 집계는 미해결 |
| `estimatedDurationSec` → 카드 매핑 | `FUNCTIONAL_BINDING_REQUIRED` | §10.1 카드 위계에 슬롯 반영, 매핑 자체는 미해결 |
| 예상 수익률(%)·범위 표기 | `FUNCTIONAL_BINDING_REQUIRED`(서버 필드 없음) | §10.1에 슬롯 반영, 신규 서버 필드는 H5 범위 밖 |
| Update Schedule 리터럴 | `NOT_SUPPORTED_AS_LITERAL_RUNTIME_TRUTH` | §12.1 대체 옵션 3종으로 시각 목적만 유지 |
| 출금 CTA(Home 신규 진입점) | `FUNCTIONAL_BINDING_REQUIRED` | §9.4에 시각 위치 계약, 배선은 H6 |
| AI 진입점(퍼뜩 채팅) Home 내 링크 | `FUNCTIONAL_BINDING_REQUIRED`(Master 이미지에 명시적 요구 없음) | 본 문서는 Master가 요구하지 않는 새 내비 어포던스를 발명하지 않음 — 추가하지 않음 |
| 영구 UI 이모지(👋/✨) | H4가 H5로 결정 위임 | §11.3에서 확정(리터럴 emoji 미계약) |

```text
FUNCTIONAL_BINDING_UNRESOLVED (H5 이후에도 그대로) = 1   (실제 수익)
FUNCTIONAL_BINDING_REQUIRED (H5 이후에도 그대로)   = 다수 (위 표)
NOT_SUPPORTED (H5 이후에도 그대로)                 = 1   (Update Schedule 리터럴)
H5가 데이터 레벨에서 해소한 항목                    = 0
```

Money/backend 계약은 본 문서로 변경되지 않는다(Task 지시 재확인).

---

## 19. Forbidden Legacy Visual Reuse

### 19.1 ADR-018 §13 Legacy Visual Candidates(재확인 — 본 계약의 §8/§13/§16에 모두 적용)

| 대상 | 판정 |
|---|---|
| `BrandMark.tsx` `✦` 별 마크 | LEGACY VISUAL CANDIDATE — §13 nav 스킨 재검토 대상, 본 문서가 대체 확정 안 함 |
| BottomNav5 inline star | 동일 |
| `wordmark-dark` | 동일 — 재사용 금지 |
| robot+globe hero illustration(`hero-illustration-*`) | 동일 — §16 신규 자산으로 대체(제작은 미착수) |
| AI avatar(`avatar-512.png`, 다크/추상) | 동일 — §11/§16 신규 자산으로 대체(제작은 미착수) |
| `pd-dark`/`putdukTokensLegacyDark` 토큰 | 동일 — §8 색 계약에서 인용하지 않음 |

### 19.2 ADR-018 §1.2 옛 Home geometry 값(재확인 — §5~§8 어디에도 미사용)

```text
sidebar 240px · rightRail 320–360px · header 64px
hero 480–600px · illustration ≤46%
old spacing/typography/Hero/RightRail/Sidebar 적용값 · old shadow/radius 결정
old responsive 임계값(mobile 320–420 provisional stack)을 새 시각 기준으로 사용
```

본 문서 §5~§8은 위 수치를 인용하지 않았으며, 대신 기존 **Layer-1 일반 토큰**(색 hex·spacing/radius/shadow 스텝·fontScale·일반 breakpoint 이름)만 "existing approved design tokens" 근거로 사용했다(§1 표 재확인).

---

## 20. H6 Handoff Requirements (New Implementation Contract가 결정할 것 — 본 문서는 착수하지 않음)

```text
1. Safety-A KEEP/REWIRE/REMOVE_FROM_RUNTIME/REPLACE/INVESTIGATE 최종 분류(H1 §10 preview → 확정)
2. §5~§8/§14에 PENDING_CALIBRATION_FROM_MASTER로 남긴 모든 px/비율/스텝을 실제 Master 재측정 또는
   Founder 재확인으로 확정(ADR-017 수치 대체 채움 금지)
3. CTA 단일화(기존 Hero CTA + sticky CTA + 신규 discovery 티저 CTA + 카드 내 참여 CTA → Safety-B 준수 단일 체계)
4. Right Rail Zone B("진행 현황" 개별 스테퍼) 데이터 축 결정 — 실제 FSM 소스에 바인딩하거나, 바인딩 불가하면
   이 서브블록을 드롭(발명 금지)
5. Update 슬롯 대체안 3종(§12.1) 중 택1 — 데이터 가용성 기반 결정
6. 이모지 슬롯 최종 처리(§11.3) — 타이포/색만 유지할지, 별도 브랜드 마크를 새로 검토할지 Founder 확인
7. 자산 제작 순서 계획 — 본 문서 §16 매트릭스를 `redesign-r1-home-visual-asset-production`(H6 completed 이후에만
   착수 가능) 입력으로 사용, H7 착수 전 자산 리드타임을 고려해 순서를 짤 것
8. Visual Lock(`visual-locks.v1.json`)은 구현+QA+Founder visual approval 이후에만 등록(ADR-018 §11) — H6/H6.5/H7
   어느 단계에서도 본 문서 하나로 LOCK을 앞당기지 않음
```

---

## Document Control

| | |
|---|---|
| Fake binding count | 0 |
| New backend feature invented | 0 |
| Runtime implementation | 0 |
| Fabricated Founder-approved pixel values | 0(모두 관계/범위 또는 `PENDING_CALIBRATION_FROM_MASTER`) |
| VISUAL_ONLY_EXAMPLE 리터럴을 실 데이터로 전환 | 0 |
| Desktop surfaceId | `home-visual-desktop` |
| Mobile surfaceId | `home-visual-mobile` |
| v1(`peotteok-home-visual-contract.v1.md`) | 변경 0 · HISTORICAL로 그대로 보존 |
| H6/H6.5/H7/Brand Assets Part B/Visual Lock started by this document | NO |
| Next authorized step | H6 New Implementation Contract(`redesign-r1-home-implementation-contract`) |
