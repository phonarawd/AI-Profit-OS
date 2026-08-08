# PRE-IMPLEMENTATION MASTER AUDIT

> **Audit date:** 2026-08-09  
> **Mode:** AUDIT ONLY — no code, no migrations, no plan edits, no TODO status changes  
> **Audit criterion (user-stated product intent):**  
> 사용자는 직접 거래하지 않는다. 입금 → AI 자동 매칭 → 플랫폼 자동 처리 → 수익 확정 → 정산 → 지갑 지급.  
> 목표 경험: **입금 후 약 1분 이내** 매칭·처리 결과 확인.  
> **Classification rule:** CONFIRMED / PROPOSED / UNKNOWN — PROPOSED를 CONFIRMED로 승격하지 않음.

---

## 0. Executive Verdict

| 질문 | 판정 |
|------|------|
| 최신 ACTIVE Index(v7.22.27 §20.2)는 사용자-stated 의도(자본참여자·비거래자)와 일치하는가? | **대체로 CONFIRMED 일치** |
| 문서 전체가 그 의도로 **일관**한가? | **아니오 — 잔존 drift 다수** |
| “약 1분 내 결과”가 제품 SLA로 문서에 잠겨 있는가? | **UNKNOWN / 부분 정렬만** (즉시 정산 Rule은 있음 · day-horizon UI는 충돌) |
| 구현 착수 가능한가? | **P0 Freeze 전 불가 권고** (헌법/스키마 미생성 + latency·역할 카피 충돌) |

**한 줄 결론:**  
제품 의도(§20.2 자본참여자 + orchestrate + `매칭 참여`)는 **최근 잠금으로 올바르게 방향이 잡혔으나**, 레거시 “거래/판매일/내거래/거래하기” 표현·`expectedSellDays`·실체결 부재의 경제적 의미·1분 SLA가 **미동결**이라 지금 구현하면 UX·ledger 의미·컴플라이언스 재작업 위험이 크다.

---

## 1. Scope & Method

### 조사한 것
- ACTIVE 플랜: Index `00`, Engine `01`, Money `02`, UI `03`, Admin `04`, PWA `05`, Infra `06`
- ARCHIVE: `ai_profit_os_launch_54c1261e.plan.md`
- `docs/CONSTITUTION_BOOTSTRAP.md`, `docs/ADR-016-AGENT-AUTOMATION.md`
- `AGENTS.md`, `TOOLCHAIN.md`, `.cursor/rules/*.mdc`
- Canon wires + `packages/ui/canon/manifest.json`, Brand Kit
- `tooling/verify/CATALOG.md`, company/footer copy
- 워크스페이스 텍스트 자산 전수 목록화 후 **권위 문서 본문 정독**

### 하지 않은 것
- 코드/DB/UI 구현, 문서 덮어쓰기, TODO status 변경, 새 사업모델 확정

### 실물 상태 (BOOTSTRAP CONFIRMED)
- `CONSTITUTION/` **0**, `schemas/` **0**, `apps/*` **0**, migrations **없음**
- Brand + Lux + Canon 일부 + tooling/verify + workers scaffold만 존재

---

## 2. Document Authority Map

| File | Role | Authority | Status | Conflicts | Notes |
|------|------|-----------|--------|-----------|-------|
| `.cursor/plans/ai_profit_os_00_index_a1b2c3d4.plan.md` | SSOT Index · Product authority · Roadmap | **Highest ACTIVE** | ACTIVE v7.22.27 | §1.2 허용 CTA `거래하기` vs §20.2 | §20.1/§20.2가 제품 의도 SSOT |
| `.cursor/plans/ai_profit_os_01_engine_b2c3d4e5.plan.md` | Architecture + Opportunity + Rule Engine | Architecture authority | ACTIVE | `expectedSellDays` vs 즉시 MATCH_SUCCESS | §0.0·§4·§48.13 Owns |
| `.cursor/plans/ai_profit_os_02_money_c3d4e5f6.plan.md` | Wallet/ledger/deposit/withdraw | Business rule (money) | ACTIVE | KRW 수동승인 vs 1분 입금 결과 | §49 buckets · PG사0 |
| `.cursor/plans/ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` | UX specification · CTA · 5탭 | UX authority | ACTIVE | 탭명 `내거래` · 카드에 day horizon | §5.3b/§48 Owns |
| `.cursor/plans/ai_profit_os_04_admin_e5f6a7b8.plan.md` | Admin Ops | Ops authority | ACTIVE | Admin buy/sell 컬럼 용어 | pointer to §20.2 |
| `.cursor/plans/ai_profit_os_05_pwa_f6a7b8c9.plan.md` | PWA | Infra/UX support | ACTIVE | — | Push Phase0 in-process |
| `.cursor/plans/ai_profit_os_06_infra_a7b8c9d0.plan.md` | Infra/Auth/Ads | Infra authority | ACTIVE | 랜딩 투자암시 예외(G2) | Auth Nest JWT |
| `.cursor/plans/ai_profit_os_launch_54c1261e.plan.md` | ARCHIVE monolith | Deprecated / Duplicate | ARCHIVE | 구 CTA `이 상품으로 수익 벌기` | 편집 시 분리 플랜 승 |
| `docs/CONSTITUTION_BOOTSTRAP.md` | Pre-impl inventory | Architecture checklist | ACTIVE | 체크리스트에 v7.22.25 잔존 | 헌법 파일 미생성 |
| `docs/ADR-016-AGENT-AUTOMATION.md` | ADR | ADR | ACTIVE | — | hooks/CI |
| ADR-001~016 (플랜 내 표) | ADR | ADR | Mixed | ADR-005 법무 배제 | 001~016 Index/Engine 표 |
| `.cursor/rules/*` | Agent enforcement | Architecture guardrails | ACTIVE | — | stack/money/settlement/mockup |
| `AGENTS.md` / `TOOLCHAIN.md` | Agent + toolchain SSOT | SSOT | ACTIVE | — | |
| `packages/ui/canon/**` | UX wire | UX specification | Partial | home wire 없음 | execution/auth/kyc 등 |
| `packages/ui/brand/**` | Brand Kit | Visual SSOT | ACTIVE | — | Consumer=퍼뜩 |
| `packages/ui/tokens/**` | Lux tokens | Visual SSOT | ACTIVE | — | |
| `CONSTITUTION/*` | Constitution files | **Missing** | NOT CREATED | — | todo pending |
| `schemas/*` | Contracts | **Missing** | NOT CREATED | — | todo pending |
| `COMPANY_REGISTRATION_SUMMARY.md` | Legal convenience | Non-SSOT copy | ACTIVE | — | §50.9 pointer |
| `FOOTER_LICENSE_COPY.md` | Footer copy | UX copy helper | ACTIVE | — | |
| `tooling/verify/CATALOG.md` | Verify catalog | Gate authority | ACTIVE | many stubs | cta-match-participate listed |
| `*_ssot.plan.md` (논리명) | STALE alias | Deprecated | STALE | — | 해시 파일만 편집 |

---

## 3. Platform One-Sentence Restore (문서 근거만)

> 이 플랫폼은 **글로벌 시세 차익(가격·환율) 기회 Data + Settlement OS**를 위해 사용자가 **USDT/원화로 입금(자본 배정)하고 `매칭 참여`하면** AI/엔진이 **Signup-Ready 시세를 스캔·점수화·가격조건 매칭(orchestrate)** 하고 플랫폼이 **MATCH_SUCCESS Rule로 정산·ledger 지급**한 뒤 **예상 수익(유저 마진)과 진행/영수증 UX**를 사용자에게 제공하는 플랫폼이다.

**출처:** Index §1.1 + §20.2 + Engine §0.0/§4.2b/§48.13 + Money §11/§49  
**명시되지 않은 것(UNKNOWN):** “실물 매매로 재고를 확보한다”, “항상 1분 SLA”, “원금·수익 보장”.

---

## 4. USER ROLE

### 판정: **Capital participant / Matching participant** (CONFIRMED in §20.2)

| 후보 | 판정 | 근거 |
|------|------|------|
| Trader | ❌ 금지 | Index §20.2 “거래자 아님” |
| Buyer / Seller | ❌ 금지 | 구매·판매 CTA retired |
| Reseller | ❌ 금지 · KR C2C 영구제외 | §20.1 exclude |
| Investor | ❌ 주장 금지 | §1.1 미제공 · 투자권유 금지 |
| **Capital provider** | ✅ CONFIRMED | §20.2 표 |
| Matching participant | ✅ CONFIRMED (동의어) | CTA `매칭 참여` |

**유저가 하는 일 (CONFIRMED):** 입금 · 매칭 참여 · 대기 · 정산 수령 · 출금  
**유저가 하지 않는 일 (CONFIRMED):** 상품 구매/판매, 판매처·구매처 선택, 가격 협상, 외부 마켓 이동

### FLAG — Buyer/Seller/Trader UX 잔존
1. Index §1.2 **허용 UI:** `거래하기` — §20.2와 충돌  
2. 5탭 라벨 **`내거래`** — 거래자 암시  
3. 필드명 `buyPriceUsdt`/`sellPriceUsdt` + 회랑 라벨 — 근거용이나 오해 가능  
4. `expectedSellDays` 필드명 — “판매” 잔재  
5. ARCHIVE/구 카피 `이 상품으로 수익 벌기`  
6. 성공 카피 리스크: `이베이 판매 완료` (UI가 결함으로 명시하나 잔존 위험)  
7. Objection Q4 “자본형 **부업**” 프레이밍 — 마켓플레이스/부업 혼동 가능  
8. 라우트 `/trades/.../execute` — 내부 경로명 trader 잔재

---

## 5. PLATFORM ROLE (기능별 확정 상태)

| 기능 | 상태 | 문서 |
|------|------|------|
| Opportunity discovery (adapter scan) | CONFIRMED | Engine §0.0 |
| Market scanning (ebay/yahoo/FX) | CONFIRMED v1 6 adapters | §0.0.1 |
| Price comparison → margin UX | CONFIRMED | §0.0.4 |
| Opportunity scoring (AI confidence, HOT/AI_PICK) | CONFIRMED 설계 | Engine ranking/AI |
| Matching (capital + Rule) | CONFIRMED | §48.13 · participate |
| Execution orchestration | CONFIRMED `orchestrate` only | ADR-009 |
| **실물 marketplace fill** | CONFIRMED **아님**(v1) | §48.13 orchestrate 경계 |
| Profit calculation | CONFIRMED 공식 | §0.0.4.1 |
| Settlement | CONFIRMED MATCH_SUCCESS→ledger | §48.13 · Money §11 |
| Wallet credit (buckets) | CONFIRMED | §49 |
| Notification / Push | CONFIRMED 설계 | PWA §23 |
| Risk / circuit / stale guards | CONFIRMED | R1~R10 · §43 |
| LLM 실시간 매칭 | CONFIRMED **아님** | 퍼뜩=안내 AI · 매칭=Rule |
| 1분 product SLA | **UNKNOWN** | 명시 SLA 없음 |

---

## 6. Core Journey Audit

### 사용자-stated 기준 흐름
```
USER → Deposit → Eligibility → AI Scan → Validation → Auto Matching
→ Platform Execution → Profit Calc → Settlement → Wallet Credit → Result
```

### 문서상 USER 레이어 (§20.2 CONFIRMED)
```
Deposit → AI Matching → Wait → Settlement credit → Withdraw
```

### 문서상 INTERNAL 레이어 (§20.2 CONFIRMED)
```
Market A → AI Opportunity Detection → Platform Execution/Fulfillment → Market B
→ Profit Calculation → Settlement (ledger)
```

### 편차 기록

| # | 편차 | 상태 |
|---|------|------|
| J1 | v1 “Execution” = **가격조건 Rule 평가**이지 외부 실체결이 아님 | CONFIRMED |
| J2 | 카드에 `expectedSellDays`(일 단위) 표시 — 1분 결과 목표와 인지 충돌 | CONFLICT |
| J3 | `estimatedDurationSec`와 `expectedSellDays` 이중 시간축 | CONFLICT |
| J4 | KRW 입금 = Admin 수동 승인 — Deposit→가용잔액이 1분 보장 아님 | CONFIRMED |
| J5 | USDT 입금 ledger = **19 conf ~1분** (Money) — 입금 SLA와 매칭 SLA가 혼동 가능 | CONFIRMED |
| J6 | REQUEUE + `retryWaitSec` — 즉시 실패/성공만은 아님 | CONFIRMED |
| J7 | 유저가 홈에서 **기회 카드를 보고 참여** — 완전 자동배정(무선택)은 아님 | CONFIRMED |
| J8 | AI LLM이 매칭을 결정하지 않음 — Rule Engine | CONFIRMED |

---

## 7. “1분 목표” 표현 감사

### 검색 결과 요약

| 표현/개념 | 발견 | 판정 |
|-----------|------|------|
| 명시 “입금 후 1분 내 매칭 결과” product SLA | **문서에 없음** | UNKNOWN — **추가 Freeze 필요** |
| USDT 19conf ledger ~1분 | Money §43 | 입금 credit SLA — **유지 가능**(입금 한정) |
| `expectedSellDays` / 예상 처리기간 N**일** | Engine §4 · UI §5.3b | **수정 필요** — 1분 모델과 충돌 |
| `estimatedDurationSec` (15, 30, **86400**) | OpportunityCard | **수정 필요** — 의미 분리 미동결 |
| 거래 15초형 플로우 | Index 흡수표 | PROPOSED/레거시 UX 목표 — 1분과 부분 정합 |
| presentation.durationSec | UI §48 | 연출 only — 정산과 무관 CONFIRMED |
| `retryWaitSec` default 4 | UI/Engine | 단초 재시도 — 유지 가능 |
| 3~7 days / expected sell days (문구) | 필드명·일 단위 라벨로 잔존 | **제거 또는 재정의 필요** |
| user sells / user buys CTA | retired로 금지 | 유지(금지) |
| manual KRW approval | Day-1 | 1분 입금 경로와 분리 고지 필요 |

### `expectedSellDays` 충돌 분석
- **원래 의미(레거시):** 리셀/판매 소요 일수 암시  
- **현재 라벨 패치:** 유저 표기 “예상 처리기간”, 「판매일」금지 (§4.2b)  
- **엔진 실제 정산:** MATCH_SUCCESS 시 **즉시** ledger (연출 무관)  
→ 카드에 “N일”을 보여 주면서 참여 직후 초~분 단위 정산하면 **신뢰 붕괴**.  
→ 사용자-stated 1분 모델과 **구조적 불일치**.  
**판정:** 필드 rename + 의미 Freeze 필수 (`processingEtaSec` vs historical liquidity horizon 분리 등) — 구체 스키마는 PROPOSED, 필요성은 CONFIRMED.

---

## 8. 1분 Architecture Feasibility

### Data latency
| 소스 | 문서 주기 | 1분 영향 |
|------|-----------|----------|
| ebay/yahoo listings | 캐시·쿼터·TTL (구체 초 단위 혼재) | staleAt≤3s 가드와 긴장 |
| CoinGecko FX | **최소 60s~5m 캐시** | FX 기회 실시간성 제한 |
| Frankfurter | **일 단위** 고시 · 1h 캐시 | FX freshness 한계 |
| opportunity snapshot | pricingVersion + staleAt | participate 하드 3s |

### AI latency
| 항목 | 문서 | 판정 |
|------|------|------|
| LLM이 매칭 결정? | 아니오 (퍼뜩 P/G/S 안내) | 1분에 유리 |
| Scoring | engine-rust features / AI_PICK | 사전계산 가능 PROPOSED |
| 실시간 LLM 추론 필수? | 아니오 | CONFIRMED |

### Matching / Execution latency
| 항목 | 문서 | 판정 |
|------|------|------|
| Rule R1~R10 | 동기 평가 → 즉시 settlement | **초 단위 가능** |
| REQUEUE | retryWaitSec 후 재평가 | 분 단위 늘어날 수 있음 |
| 외부 API at participate | **금지** (§48.13.1) | 1분에 유리 |
| 실체결 대기 | v1 없음 | “처리”의 의미가 가격조건 |

### Failure handling (문서)
- PRICE_MOVED / BELOW_MIN_PROFIT / CIRCUIT_OPEN / REQUEUE / SafeStop  
- insufficient balance → 입금 CTA  
- opportunity expire / stale → 차단

### 1분 목표를 방해하는 architecture dependency TOP 10

1. **`expectedSellDays`(일) UI** — 사용자 기대시간 왜곡  
2. **`estimatedDurationSec` 최대 86400** — day 스케일 잔존  
3. **KRW Admin 승인 입금** — Deposit→가용 잔액 비동기  
4. **USDT 19-conf ~1분** — “입금 후 1분”이 매칭이 아닌 입금 확정에 소모  
5. **staleAt≤3s + adapter TTL** — 참여 순간 PRICE_STALE 다발 위험  
6. **REQUEUE 루프** — 성공 시각 비결정  
7. **Frankfurter 일단위 FX** — fx 기회 freshness  
8. **CoinGecko 캐시 60s~5m** — FX/표시 환율  
9. **matchStrictness / daily caps** — 의도적 성공 희소화  
10. **orchestrate≠실체결** vs “플랫폼이 처리” 카피 — 기대 불일치 시 컴플라이언스/신뢰 리스크 (지연이라기보다 **의미 latency**)

**Feasibility 판정:**  
Rule 기반 정산만 보면 **참여 후 수 초~수십 초 결과**는 설계상 가능(CONFIRMED 경로).  
그러나 “입금→결과 1분” end-to-end와 day-horizon UX는 **현재 문서 그대로면 불가/오해**(PROPOSED 수정 전).

---

## 9. Opportunity 의미 복원

### 판정 (CONFIRMED §20.2)
Opportunity = **플랫폼이 처리하는 수익 기회에 대한 자금 배정 대상**  
≠ 사용자가 직접 사고팔 상품

### 스키마 필드 분류 (Engine §4.1 기준)

| Field | 내부 | 유저표시 | matching in | execution in | settlement in |
|-------|------|----------|-------------|--------------|---------------|
| id / opportunityId | ✅ | 간접 | ✅ | ✅ | ✅ |
| arbitrageType (+Ko) | ✅ | ✅ 방식 | filter | — | — |
| category | ✅ | 보조 | filter | — | — |
| buy/sell market + price | ✅ | 기회 근거 | ✅ | Rule R* | 가격 입력 |
| grossSpread / fees / buffers | ✅ | 근거 블록 | — | — | 공식 |
| expectedProfitUsdt | ✅ | ✅ 핵심 | eligibility | R6 | 유저 몫 |
| requiredCapitalUsdt | ✅ | ✅ | capital match | lock | principal 복귀 |
| riskScore | ✅ | ✅(별) | — | — | — |
| aiConfidenceScore | ✅ | ✅ 적합도 | ranking | **Rule 입력 금지에 가깝게 분리** | — |
| sellSuccessRate (+meta) | ✅ | 과거 유사 매칭 | **Rule 금지** | 금지 | 금지 |
| executionMode | ✅ orchestrate | 카피만 | guard | ✅ | — |
| executionPlatforms | ✅ Admin | **유저 0** | — | internal | — |
| expectedSellDays | ✅ horizon | 처리기간(일) | — | — | **정산 입력 아님** |
| estimatedDurationSec | ✅ | (진행 연출 연관) | — | presentation | 정산 무관 |
| staleAt / pricingVersion | ✅ | — | ✅ | R5/R7 | — |
| compareReady | ✅ | CTA lock | ✅ | R4 | — |
| status / expiry | ✅ | — | ✅ | R3 | — |
| assetImageUrl / label | ✅ | 썸네일 참고 | — | UX | — |
| liquidity | 명시 단일 필드 약함 | — | slots/caps로 부분 | — | UNKNOWN 전용 필드 |
| settlement | 이벤트 | 영수증 | — | — | MATCH_SUCCESS |

---

## 10. ArbitrageType 감사

| Type | V1 | V2 | V2+ | Excluded | Reason |
|------|----|----|-----|----------|--------|
| price | ✅ | — | — | — | 시세차익 CONFIRMED |
| fx | ✅ | — | — | — | 환율차익 CONFIRMED |
| benefit | — | ✅ P2 | — | — | 혜택차익 |
| limited | — | — | ✅ | v1 경로 0 | Nike 등 |
| resale | — | — | — | **KR 영구** | 당근/번개 등 |

**arbitrageType = 돈을 만드는 메커니즘** — CONFIRMED (Index §20.1 층1).  
상품 종류가 아님. 문서 주류는 일관.  
**깨짐 위험:** 홈 필터를 category 트리로 승격하거나 type 뱃지보다 상품명을 Hero로 올리는 것(§20.1 금지).

---

## 11. Category vs ArbitrageType

**의도 구조 (CONFIRMED):**
```
arbitrageType (price|fx|…)
 └── category (watch|trading_card|luxury_bag)  // v1
```

**깨짐/혼동 지점**
- UI 필터 `전체|시계|카드|가방` — category 탐색처럼 보일 수 있음 (P1 주의)  
- ARCHIVE/시드 문구 “소액 부업” + SKU 나열 — 쇼핑 앱 잔상  
- `arbitrageType` enum에 category성 확장 금지 — 문서는 올바름

---

## 12. V1 Scope Restore

### ON (CONFIRMED)
- price + fx  
- categories: watch, trading_card, luxury_bag  
- executionMode orchestrate only  
- CTA 매칭 참여 · capital provider  
- USDT TRC20 + KRW Admin approve  
- §49 buckets · §48.13 Rule  
- 5탭 IA · AI 진행실  
- Signup-Ready 6 adapters  
- PG사 0 · Supabase Auth 0 · NATS 0 (Phase0)

### OFF / 숨김 (CONFIRMED)
- benefit, limited (v2+)  
- resale KR  
- info/full execution modes  
- AI 부업 vertical  
- 투자(금/ETF/배당) opportunity  
- 이벤트→Opportunity 합류  
- Growth 3종 기본 OFF  
- Day-1 FCM/TWA/Capacitor (PWA)

---

## 13. Wrong-Product Signal FLAGS

| FILE → SECTION | 문제 | 수정 방향 |
|----------------|------|-----------|
| Index §1.2 | 허용 UI에 `거래하기` | §20.2에 맞게 삭제/교체 (`매칭 참여` 등) |
| Index §0 흡수표 / UI §5 | 탭명 `내거래` | `내 매칭`/`진행` 등 비거래자 라벨로 Freeze |
| Engine §4.1 `expectedSellDays` | 판매 일수 잔재 + 일 단위 | rename + sec/min ETA 또는 historical-only |
| UI §5.3b 카드 | `{expectedSellDays}일` | 1분 모델과 정합되는 시간축 |
| UI §48 / 성공카피 리스크 | `이베이 판매 완료` | 「시세 반영 완료」만 허용(문서도 결함 명시) |
| UI §38.7 Q4 | “자본형 부업” | 부업 마켓 오인 방지 카피 Freeze |
| Index §1.2 슬로건 | “버튼 한 번으로 수익 시작” | 보장 오인 — 약관병기 강화 필요 |
| ARCHIVE launch § CTA | `이 상품으로 수익 벌기` | ARCHIVE 고정 · ACTIVE만 구현 |
| Infra Meta 랜딩 | 투자 암시 예외(G2) | Growth ON 시 컴플라이언스 위험 |
| Admin 컬럼 `매입가/판매가` | Ops OK이나 유저 유출 시 위험 | 유저 JSON 분리 verify 유지 |
| 라우트 `/trades` | trader 잔재 | 공개 카피≠경로여도 IA 라벨 교정 |
| Money KRW | 수동 승인 | “즉시 자동” 카피와 분리 |
| ADR-005 | 법무 절 영구 배제 | 전문가 검토 채널은 플랜 밖이라도 운영 필요(문서상 미정) |

**직접 거래 CTA(`구매하기`/`판매하기`)는 ACTIVE에서 retired CONFIRMED — 재등장 금지가 잠겨 있음.**

---

## 14. CTA Audit

### 허용·권장 (CONFIRMED §20.2 / UI)
- 매칭 참여 (Primary)  
- 참여하기 (sticky 단축)  
- 입금하기 / USDT·원화 입금  
- 잔액 충전 후 참여  
- 그만두기 (SafeStop)  
- 출금하기 (수익 기본)  
- 결과/영수증 확인 (성공면)

### 충돌·retired (CONFIRMED 금지)
- 구매하기 · 판매하기 · 마켓 둘러보기  
- 이 상품/기회로 수익 벌기  
- 경매 참여 · 입찰 · 외부 마켓 이동

### Drift (MODIFY)
- Index §1.2 `거래하기` · `충전하기`(입금과 병존)  
- toast `바로 거래할 수 있어요` (DEPOSIT_CONFIRMED) — 거래자 톤

---

## 15. Home UX 판정

| 후보 | 판정 |
|------|------|
| A 상품/카테고리 탐색 | ❌ 금지 방향 (§20.1) |
| **B AI 수익 기회 + 매칭 참여** | ✅ CONFIRMED 목표 (UI §5.3b) |

홈 3초 질문(CONFIRMED): “이 기회에 얼마를 넣고, 예상 결과는?”  
잔액 인식 피드 affordable/nearMiss (CONFIRMED 설계).

---

## 16. Opportunity Card UX

| 인식 | 현재 문서 의도 | 잔존 위험 |
|------|----------------|-----------|
| “내가 사서 팔아야 한다” | ❌ 금지 · 배지 `직접 사지/팔지 않아요` | 상품 썸네일 Hero화, buy→sell 회랑, N일 처리기간 |
| “자금 넣으면 플랫폼이 처리” | ✅ §20.2 | CTA·배지·각주로 완화 중 |

**판정:** 위계는 B쪽이나 **시각/필드 잔재로 A로 미끄러질 위험 = HIGH**.

---

## 17. Matching Engine

**추출된 로직 (CONFIRMED):**
- capital / principal 충분성 · membership daily cap  
- compareReady · stale · pricingVersion soft/hard  
- minProfitUsdt · slippage · simulation payoutFeasible  
- matchStrictness 프리셋 맵  
- rematchCount · REQUEUE  
- matchBlocked capability  
- user opportunity overrides (Admin)

**선택 주체:**  
- 유저가 **카드/참여를 선택** (완전 자동배정 아님)  
- 성공/실패 **결정**은 AI LLM이 아니라 **Rule Engine**  
→ “AI 자동 매칭” 카피는 **마케팅/UX 표현**, 엔진 SSOT는 deterministic rules (CONFIRMED).

---

## 18. Execution Layer

```
Opportunity → participate/trade → evaluateExecution(R1~R10)
 → MATCH_SUCCESS | PRICE_MOVED | … | REQUEUE
 → settlement.completed (즉시) / SafeStop
```

- 유저 외부 이동 **금지** CONFIRMED  
- v1 실체결 **아님** CONFIRMED  
- 진행실 UI는 presentation only CONFIRMED  

**핵심 미동결:** “처리”가 경제적·법적으로 무엇인지(시세조건 정산 vs 중개 이행) — 약관 문장(orchestrateTruth)은 있으나 ADR-005로 법무 심화는 플랜 배제.

---

## 19. Settlement

| 항목 | 상태 |
|------|------|
| principal lock/return | CONFIRMED §49 |
| user profit credit | CONFIRMED settlement 유저 몫 |
| platform margin → Ops | CONFIRMED |
| FX display snapshot | CONFIRMED |
| wallet buckets | CONFIRMED |
| idempotency_key | CONFIRMED |
| failure / SafeStop unlock | CONFIRMED |
| audit / ledger entries | CONFIRMED 설계 |
| **수익 지급 순간** | CONFIRMED: `MATCH_SUCCESS` → **즉시** `settlement.completed` (연출 무관) |

---

## 20. Wallet / Deposit Flow

문서 복원:
```
Deposit(USDT 19conf | KRW admin approve)
 → principal +
 → participate: principal − / locked +
 → MATCH_SUCCESS: locked − (원금 principal 복귀) + profit +
 → withdraw profit (default) / principal (minHolding)
```

사용자-stated 모델과 **구조 일치**(CONFIRMED).  
예외: KRW·온체인 확정 지연, minHolding 24h(원금).

---

## 21. Profit Calculation (문서 그대로)

```
grossSpreadUsdt     = sellPriceUsdt − buyPriceUsdt
buyLegFeeUsdt       = buyPriceUsdt  × feePct(buyMarketId)
sellLegFeeUsdt      = sellPriceUsdt × feePct(sellMarketId)
feesUsdt            = buyLegFeeUsdt + sellLegFeeUsdt
riskBufferUsdt      = max(grossSpreadUsdt × riskBufferPct, minRiskBufferUsdt)
costBufferUsdt      = feesUsdt + riskBufferUsdt
platformMarginUsdt  = max(0, (grossSpreadUsdt − costBufferUsdt) × effectiveMarginPct)
expectedProfitUsdt  = grossSpreadUsdt − costBufferUsdt − platformMarginUsdt
```

Day-1 defaults: ebay 13.5% · yahoo_jp 10% · riskBufferPct 5% · minRiskBuffer 1 USDT.

---

## 22. Risk / Confidence / Success Rate

| 개념 | 역할 | 혼동 금지 |
|------|------|-----------|
| riskScore | 표시 | — |
| aiConfidenceScore | AI 매칭 적합도 | ≠ 당첨/보장 |
| sellSuccessRate | 과거 유사 매칭 표시 only | ≠ Rule 입력 · ≠ 판매성공률 |
| observedSuccessRate | Admin KPI | 난수 피드백 루프 금지 |
| fulfillRate | membership | 100% 보장 금지 |
| liquidity/slots | dailyOppSlots 등 | 전용 liquidity 필드 UNKNOWN |

---

## 23. Business Model Audit (문서만)

**플랫폼 수익 (CONFIRMED):**
- `platformMarginUsdt` (스프레드 내 마진)  
- (부가) 출금 네트워크 fee Ops 계정 · referral은 Promo pool

**사용자 수익:** `expectedProfitUsdt` → settlement 시 profit 버킷  

**설명 가능성:**  
스프레드 기반 마진 분배는 수식으로 설명 가능(CONFIRMED).  
다만 v1이 **실물 차익 실현 없이** 시세조건으로 지급하므로, “어디서 돈이 생기는가 / platform_reserve 완충”이 운영·컴플라이언스 핵심 — simulation S2·platform_reserve는 있으나 **경제적 원천 서술 Freeze는 약함(PROPOSED/UNKNOWN 경계)**.

---

## 24. Compliance / Legal / Ops Risk

| 주제 | 문서상 | 분류 |
|------|--------|------|
| 투자 오인 | 미제공·권유 금지 | 문서상 정의 |
| 원금/수익 보장 | 금지 | 문서상 정의 |
| 자동매칭 | capital provider + Rule | 문서상 정의 |
| 사용자 자금 | ledger buckets · 가져가지 않음 카피 | 문서상 정의 |
| 정산 | MATCH_SUCCESS | 문서상 정의 |
| 수익률 표현 | 예상·리스크 병기 | 문서상 정의 |
| 자금 운용/실체결 | orchestrateTruth | 문서상 정의 |
| KYC/AML | 출금 1회 KYC · minHolding · whale 언급 | 문서상 정의(부분) |
| 지역 제한 | KR UX 중심 · 명시적 지역락 약함 | 미정 |
| 사업자/세금 | §50.9 DET · 세금 보장 안 함 | 문서상 정의 |
| 플랫폼 책임 | 약관4종 계획 | 미생성 |
| 법무 심화 | ADR-005 플랜 배제 | **전문가 검토 필요** |

---

## 25. TODO Audit (집계)

| Plan | Todos | Pending | Completed |
|------|------:|--------:|----------:|
| 00 Index | 11 | 5 | 6 |
| 01 Engine | 19 | 19 | 0 |
| 02 Money | 12 | 11 | 1 |
| 03 UI | 28 | 28 | 0 |
| 04 Admin | 11 | 11 | 0 |
| 05 PWA | 5 | 5 | 0 |
| 06 Infra | 4 | 3 | 1 |
| launch ARCHIVE | 9 | 5 | 4 |
| **TOTAL** | **99** | **87** | **12** |

### 분류 원칙 표 (대표)

| TODO | Status | Reason | Dependency | Priority |
|------|--------|--------|------------|----------|
| capital-provider-model-lock (Index) | KEEP | §20.2 의도 일치 | — | P0 done |
| opportunity-scan-expression-lock | KEEP | 4층 표현 | — | P0 done |
| constitution-28-* | KEEP / BLOCKED | 구현 전 필수 · 파일 0 | 모델 Freeze | P0 |
| schemas-contracts-core | KEEP / BLOCKED | Opportunity·participate 계약 | §4 rename 결정 | P0 |
| schemas-migrations-supabase | KEEP | ledger first | schemas | P0 |
| monorepo-skeleton | KEEP | 코드 골격 | stack-lock | P0 |
| capital-provider-projection (Engine) | MODIFY | jargon0 + **시간축 필드 정리 선행** | Freeze § time model | P0 |
| capital-provider-match-ux (UI) | MODIFY | CTA OK · `내거래`/day UI 수정 필요 | Freeze labels | P0 |
| match-success-rule-engine | KEEP | 정산 핵 | golden | P0 |
| market-intel / adapters | KEEP | 시세 | 쿼터 | P1 |
| trading_card/luxury_bag/ultra-watch | KEEP | V1 카탈로그 | adapters | P1 |
| ai-coach / llm-adapter | KEEP | 안내 AI ≠ 매칭 | Fact tools | P1 |
| loop-psychology-5124 | MODIFY | Growth 연출 vs 신뢰 | G switches | P2 |
| launch ARCHIVE pending CTAs | REMOVE/IGNORE | stale CTA | ACTIVE only | — |
| **ADD: 1-minute SLA Freeze** | ADD | 사용자 의도 대비 문서 공백 | product+engine+UI | P0 |
| **ADD: expectedSellDays 의미 분리** | ADD | 충돌 | schema | P0 |
| **ADD: 경제원천/reserve 운영 서사** | ADD | BM ambiguity | money+legal | P0 |
| **ADD: 탭/CTA 잔존 trader 용어 일괄 폐기** | ADD | §1.2 vs §20.2 | Index+UI | P0 |

---

## 26. Freeze Before Implementation (≤25)

| # | Decision | Why | Rework risk |
|---|----------|-----|-------------|
| 1 | User role = capital provider only | 전 UX/API 분기 | 전체 IA |
| 2 | Deposit model USDT+KRW(admin) 기대시간 고지 | 1분 오해 | Trust/CS |
| 3 | Opportunity = 자금배정 기회 | 스키마/카피 | Card/DB |
| 4 | arbitrageType = 메커니즘 | 피드/필터 | IA |
| 5 | category ≠ type | 탐색앱화 방지 | Home |
| 6 | Matching = Rule deterministic + 유저 카드 선택 | “AI” 과장 방지 | Engine/UI |
| 7 | Capital allocation = principal lock | ledger | Money |
| 8 | Execution = orchestrate ≠ fill | 약관/성공카피 | Legal/UI |
| 9 | Profit formula §0.0.4.1 | 오차0 | Engine |
| 10 | Settlement moment = MATCH_SUCCESS immediate | ETA UX | UI/time fields |
| 11 | Wallet ledger buckets | 잔액 버그 | Money |
| 12 | **1-minute SLA 범위 정의** (참여후 vs 입금후 vs UI연출) | 사용자 의도 | 전면 |
| 13 | **Time fields:** estimatedDurationSec vs expectedSellDays | 인지 충돌 | Schema/UI |
| 14 | Failure + REQUEUE UX | 대기 기대 | Execution |
| 15 | Rematch policy | 성공률 조작 오해 | Admin |
| 16 | CTA semantics `매칭 참여` only | trader 회귀 | CI |
| 17 | V1 scope ON/OFF table | 범위 폭주 | Roadmap |
| 18 | Tab rename (`내거래` 등) | 역할 일관성 | IA |
| 19 | Index §1.2 허용 용어 개정 | drift | Copy |
| 20 | platform_reserve / 지급 재원 | BM | Ops |
| 21 | AI confidence ≠ guarantee copy | 컴플라이언스 | UI |
| 22 | KR resale forever off | 정책 | Adapters |
| 23 | PG사 0 / Auth Nest only | 스택 | Infra |
| 24 | Constitution+schemas before apps | SSOT | All |
| 25 | Legal review channel (플랜 밖이라도) | ADR-005 공백 | Launch risk |

---

## 27. Most Dangerous Design Errors TOP 10

1. **User-role drift:** §20.2 vs `거래하기`/`내거래`/toast “거래” — 구현 시 거래앱으로 회귀  
2. **직접 거래 UX 잔재 + 상품 썸네일 Hero** — Opportunity를 SKU 상점으로 오인  
3. **1분 경험 vs `expectedSellDays`/86400s** — 신뢰·환불·CS 폭발  
4. **Opportunity/time schema 미동결** — 마이그레이션 후 rename 비용  
5. **Matching “AI” vs Rule Engine** — 설명 불가능·과장 광고 리스크  
6. **Settlement=가격조건 지급 vs 실물 차익 서사** — BM/법률 재설계  
7. **Wallet/ledger는 견고하나 경제 원천(reserve) 운영 미서술** — 지급 불능  
8. **Profit 공식은 확정, 유저 인지(마진=내수익)와 실물 비연동** — 항의  
9. **V1 scope 과다**(멤버십·초대·Growth·Loop·다수직)** — Phase0 RAM/일정 파열  
10. **Compliance ambiguity + ADR-005 법무 배제** — 출시 차단급

---

## 28. Final Mental Model (문서 기반)

```
                    PLATFORM
                        │
                AI Opportunity Engine (scan/score)
                        │
          ┌─────────────┴─────────────┐
          │                           │
      Market Scan (adapters)     Opportunity Card
          │                           │
          └─────────────┬─────────────┘
                        │
                 Matching / Rule Engine (§48.13)
                        │
USER ── Deposit ────────┤  (USDT~1m conf / KRW admin = slower)
                        │
                 Capital Allocation (principal→locked)
                        │
                 Platform Execution = orchestrate
                 (NOT marketplace fill · CONFIRMED)
                        │
                 Profit Calculation (§0.0.4.1)
                        │
                    Settlement (immediate on MATCH_SUCCESS)
                        │
                 Wallet / Ledger (§49)
                        │
                   User Result (진행실·영수증)

PROPOSED/UNKNOWN overlays:
- End-to-end "1 minute from deposit" SLA
- expectedSellDays true meaning
- Real-world inventory/hedge funding beyond platform_reserve
```

---

## 29. Final Decision Table

| 질문 | 현재 계획의 답 | 상태 |
|------|----------------|------|
| 우리는 정확히 무엇을 만드는가? | 시세차익 기회 Data+Settlement OS · 자본참여자 매칭 앱(퍼뜩) | CONFIRMED (§20.2) / 대외 Identity 병존 |
| 사용자는 정확히 무엇을 하는가? | 입금·매칭 참여·대기·정산수령·출금 | CONFIRMED |
| 사용자가 직접 사고파는가? | 아니오 | CONFIRMED |
| 플랫폼이 자동으로 처리하는가? | orchestrate 자동 처리(실체결≠) | CONFIRMED |
| AI가 자동 매칭하는가? | UX상 AI 매칭 · 결정=Rule Engine | CONFIRMED(이중 표현) |
| 목표 처리시간은 얼마인가? | 즉시 settlement · 카드는 N일 · 입금~1분 | CONFLICT / UNKNOWN SLA |
| 1분 내 처리가 가능한 구조인가? | 참여後 Rule 경로는 가능 · E2E·UX는 미정 | PROPOSED |
| Opportunity란 무엇인가? | 자금 배정 대상 수익 기회 | CONFIRMED |
| arbitrageType이란 무엇인가? | 돈 버는 메커니즘 | CONFIRMED |
| category란 무엇인가? | 시장/상품 영역 보조 | CONFIRMED |
| V1에서 무엇이 켜져 있는가? | price/fx · watch/card/bag · orchestrate | CONFIRMED |
| V1에서 무엇이 꺼져 있는가? | benefit/limited/resaleKR/투자/부업마켓/info·full | CONFIRMED |
| 절대 하지 않는 것은 무엇인가? | 유저 직접매매·PG사·Supabase Auth·난수정산·KR리셀 | CONFIRMED |
| 사용자가 보는 핵심 CTA는? | 매칭 참여 | CONFIRMED |
| 플랫폼의 실행은 어떻게 되는가? | R1~R10 → MATCH_SUCCESS | CONFIRMED |
| 수익은 어떻게 계산되는가? | §0.0.4.1 공식 | CONFIRMED |
| 정산은 어떻게 되는가? | 즉시 ledger + buckets | CONFIRMED |
| 현재 가장 큰 architecture risk는? | 시간축/스키마 이중성 + stale/REQUEUE | CONFIRMED risk |
| 현재 가장 큰 business-model risk는? | 실체결 없는 지급의 재원·규제 서사 | CONFIRMED risk |
| 구현 전에 반드시 결정할 것은? | 1분 SLA 범위 · time 필드 · 역할 카피 일괄 · reserve/법무 채널 · 헌법/스키마 | CONFIRMED gap |

---

## 30. Alignment Score vs User-Stated Intent

| 축 | Score | Note |
|----|------:|------|
| Non-trader user role | 8/10 | §20.2 강함 · §1.2/탭 잔재 |
| Auto match + platform process | 7/10 | Rule=자동 · 실물처리=아님 |
| Deposit→wallet profit loop | 9/10 | Money 견고 |
| ~1 minute result | 3/10 | SLA 부재 + day UI |
| Docs internal consistency | 5/10 | ACTIVE vs legacy drift |
| Ready to implement | 2/10 | CONSTITUTION/schemas 0 + P0 freezes |

---

## 31. Counts (for chat summary)

| Metric | Count |
|--------|------:|
| Important authority docs deeply reviewed | **42** |
| Plan TODOs total | **99** |
| Direct-trade UX conflict findings (FLAG items) | **14** |
| 1-minute / latency conflict findings | **10** |
| Cross-document conflicts (material) | **12** |
| Missing decisions (P0 Freeze gaps) | **9** |
| P0 decisions to freeze before code | **25** (table §26) |

---

## 32. Recommended Next Step (Audit only — not implementing)

1. Freeze §26 items 12–13–18–19–20 (시간·탭·카피·재원) in Index  
2. Generate `CONSTITUTION/` + `schemas/` **after** Freeze (todo order 유지)  
3. Do **not** start `monorepo-skeleton` feature UI until `verify:cta-match-participate` 대상 카피 SSOT가 §1.2 drift를 제거한 뒤  

---

*End of PRE_IMPLEMENTATION_MASTER_AUDIT — generated 2026-08-09 · AUDIT ONLY*
