# PRE-IMPLEMENTATION MASTER AUDIT

> **Audit date:** 2026-08-09  
> **Amendment A1:** 2026-08-09 — 실금액·Ops재원·내거래·1분 SLA 흡수  
> **Amendment A2:** 2026-08-09 — 유저 CTA=`수익 벌기` vs 도메인=`participate`  
> **Plan absorb:** 2026-08-09 — ACTIVE Index/UI/Engine/… **v7.22.28**에 A1+A2 반영 완료 (플랜=SSOT)  
> **Amendment A3:** 2026-08-09 — 흡수 후 stale 절 동기화 · CTA CRITICAL OPEN 문구 삭제 · Owns→Index §20.2  
> **Amendment A3.1:** 2026-08-09 — Alignment 재점수 (before/after · 채점 근거 · Ready 게이트)  
> **Amendment A4:** 2026-08-09 — REQUEUE vs 1분 Soft/Hard · 유저 카피 3줄 Freeze → Index **v7.22.29**  
> **Amendment A5:** 2026-08-09 — 착수 순서 잠금 (constitution→schemas→migrations→monorepo→Canon/copy)  
> **Amendment A6:** 2026-08-09 — 매칭 긴장감·등급대기 흡수 → Index/UI **v7.22.30** · §48.3b  
> **Amendment A7:** 2026-08-09 — JP번호 없음 → Day1 listing=ebay멀티\|admin · yahoo_jp Phase1+ · **v7.22.31**  
> **Amendment A8:** 2026-08-09 — Yahoo! JAPAN **영구 배제** · Phase1+ 철회 · **v7.22.32**  
> **Mode:** 감사 이력 + 잔여 gap · 앱 코드 구현 없음  
> **Classification:** CONFIRMED / PROPOSED / UNKNOWN  
> **CTA Owns:** Index **§20.2** — 유저 Primary=`수익 벌기` · domain=`participate` · `verify:cta-earn-profit`  
> **1분/REQUEUE Owns:** Index **§20.2** · Engine Rule · UI §48  
> **긴장감 Owns:** Index §20.2 원칙 · UI **§48.3b** · `verify:match-tension-surface`  
> **Listing Owns:** Engine **§0.0.1a · §0.0.2 v7.22.32** · `verify:listing-legs-day1`  
> **착수 순서 Owns:** Index §18 + `docs/CONSTITUTION_BOOTSTRAP.md` §9.1 · Audit A5=이력  
> **이 파일:** Audit 이력 · **플랜 대체 아님** · 충돌 시 Index/도메인 플랜 승

---

## A8. Yahoo! JAPAN 영구 배제 (흡수 · Owns→Engine §0.0.2)

| 잠금 | 값 |
|------|-----|
| `yahoo_jp` | **영구 FORBIDDEN** · Phase1+ 철회 |
| 워커/ENV | yahoo-jp-adapter · YAHOO_* **0** |
| listing | ebay 멀티 marketplace \| ebay×admin **only** |
| 유저 카피 | 「야후」·Yahoo 문자열 **0** · LabelKo 동적 |
| 금지 | stub·재제안·가상번호 우회·KR/Chrono24 대체 |

---

## A7. Listing legs — 일본 휴대폰 없음 (이력 · A8가 승계)

| 잠금 | 값 |
|------|-----|
| Day-1 자동 | ebay `EBAY_US` × `EBAY_GB`(또는 DE/AU) |
| Day-1 반자동 | ebay × admin |
| `yahoo_jp` | ~~Phase1+~~ → **A8 영구 FORBIDDEN** |
| 유저 카피 | 「야후」고정 0 · LabelKo 동적 |
| 금지 | KR/Chrono24/스크래핑 · 가상번호 우회를 SSOT화 |

---

## A6. 매칭 긴장감 · 등급 대기 (흡수 이력 · Owns→Index/UI)

> **의도:** Soft/Hard는 전 등급 동일 · 긴장감은 과정 Fact · 등급은 캡/기회/지위.  
> **현행 SSOT:** Index §20.2 · UI §48.3b · Engine pointer · CATALOG `match-tension-surface` · **v7.22.30**.

| 잠금 | 값 |
|------|-----|
| Soft60/Hard90 | 전 등급 동일 |
| 긴장감 | 로그 박자·적합도 표시 수렴·시세 Fact·Soft중반·성공직전 정적·아깝게실패 |
| 등급 | ≠대기특권 · =일일캡·기회·해금·지위 카피 |
| 금지 | 난수 틱·가짜 대기·당첨 게이지·연출=지급 |

---

## A5. 착수 순서 잠금 (오차0 · 건너뛰기 금지)

> **목적:** CTA/REQUEUE 문서 Freeze 후, 구현 채팅이 monorepo·화면부터 뛰지 않게 **M0 todo 순서**를 고정.  
> **Owns (현행):** Index §18 선행 순서 · BOOTSTRAP §9.1 · 본 절=잠금 이력.

### A5.1 즉시 실행 큐 (한 채팅 = 한 행)

| 순 | Index todo | 산출 | 선행 PASS |
|----|------------|------|-----------|
| 0 | *(게이트)* | `pnpm verify:stack-lock` · `verify:brand-consumer` | 툴체인 |
| 1 | `constitution-28-core` | `CONSTITUTION/` 14·17·20·22~28·35~46b | 0 |
| 2 | `constitution-28-ai-money-ops` | `CONSTITUTION/` 47~51·51r (+§47.12~14·§50.9) | 1 |
| 3 | `schemas-contracts-core` | `schemas/` Day-1 JSON | 1~2 |
| 4 | `schemas-migrations-supabase` | `supabase/migrations/` 초기 · 원격 Seoul | 3 |
| 5 | `monorepo-skeleton` | apps/web·admin · services · packages/{ui,sdk,schemas} | 1~4 + stack-lock |
| 6 | UI copy/Canon 슬라이스 | `packages/ui/copy/ko` `ctaEarn`·면책·SLA 3키 · Canon `primaryCta` | 5 |
| 7+ | 도메인 기능 todo | 한 채팅=한 todo · 접두사 모델 배정 | 해당 도메인 verify |

### A5.2 금지 (착수 drift)

- `CONSTITUTION/`·`schemas/` **없이** `apps/web` 화면·Nest 라우트 구현  
- monorepo와 constitution **병렬** (Phase0 서브에이전트 병렬 금지와 동일)  
- migrations를 Dashboard DDL로 대체  
- Canon/copy만 먼저 하고 헌법을 뒤로  
- launch ARCHIVE를 착수 SSOT로 사용  
- CTA/`매칭 참여` 재Freeze 채팅으로 회귀

### A5.3 Ready 연동 (A3.1)

| 완료 시 | Ready |
|---------|------:|
| 지금 (문서만) | 5/10 |
| 1~2 헌법 | ≈7 |
| 3~4 스키마·마이그레이션 | ≈8 |
| 5 monorepo | ≈9 |
| 6 Canon/copy | ≈10 |

**다음 채팅 권장:** Index todo **`constitution-28-core`** only.

---

## A4. REQUEUE vs 1분 — Soft / Hard · 카피 3줄 (Freeze · Owns→Index §20.2)

> **문제:** CTA 후 ≈1분은 문서에 있으나 soft/hard·REQUEUE 상한·초과 UX가 비어 제품 오차.  
> **판정:** 아래 Freeze. 구현·Admin 기본값은 기존 `maxRematchCount=2` · `retryWaitSec=4`와 정합.

### A4.1 시간축 (participateAcceptedAt = T0 · 입금 제외)

| 층 | 값 | 성격 | 유저 보장? |
|----|-----|------|-----------|
| Soft 목표 | **T0 + 60s** | 목표 · `estimatedDurationSec`≤60 | ❌ (면책·“보통”) |
| Hard wall | **T0 + 90s** | 강제 terminal | ❌ · 잔액 불변 |
| Presentation | 8~15s | 연출 only | 정산·성공 **무관** |
| 입금 체인 | Money SLA | **합산 금지** | — |

### A4.2 REQUEUE 규칙

1. `REQUEUE` 허용 조건: R1~R9 true · `rematchCount < maxRematchCount`(기본 2) · **`now + retryWaitSec < hardDeadline`(T0+90s)**  
2. 다음 대기가 hard를 넘기면 REQUEUE **금지** → 즉시 terminal (`PRICE_MOVED`/`BELOW_MIN_PROFIT` 중 Rule 해당 · 해당 없으면 **`MATCH_TIMEOUT`**)  
3. Soft(60s) 초과·아직 running: 진행 유지 + **소프트 초과 카피**(A4.3-② 계열) · settlement 연출로 위장 금지  
4. Hard 도달: **`MATCH_TIMEOUT`** → safe_stop · lock 해제 · ledger credit **0** · CS 자동 티켓 **불필요**(SYSTEM_FAILED와 분리)

### A4.3 유저 카피 3줄 (한글 · IT용어 0 · 고정)

| # | 키(제안) | 문장 | 사용 |
|---|----------|------|------|
| ① Soft 안내 | `T.execution.slaSoftHint` | **보통 1분 안에 결과가 나와요** | 진행실 footnote · 보장 톤 금지 |
| ② REQUEUE | `T.execution.requeueHint` | **조건을 다시 맞추는 중이에요 · 손댈 것 없음** | status=requeue |
| ③ Hard/timeout | `T.execution.matchTimeout` | **시간이 지나 안전하게 멈췄어요 · 잔액은 그대로예요** | `MATCH_TIMEOUT` safe_stop |

**금지:** “1분 보장” · “무조건 성공” · timeout/SLA/hard 영문 유저 노출 · 연출 끝=지급 암시.

### A4.4 흡수 체크

- [x] Audit A4 Freeze  
- [x] Index §20.2 · v7.22.29  
- [x] Engine §48.13 REQUEUE/hard · `MATCH_TIMEOUT`  
- [x] UI §48 copy 3줄  
- [ ] Canon/copy 실물 · verify stub (구현 시)

---

## A1. 운영자 피드백 흡수 — 동의 / 반대 / 교정 (이력)

> **규칙:** 피드백을 무비판 수용하지 않는다. 동의·반대를 분리한 뒤, 반대는 **문서 SSOT와 충돌하지 않게** 교정하여 흡수한다.  
> **Owns (현행):** Index §20.2 · 본 절=흡수 이력 · 이하 pointer.

### A1.1 동의 (Absorb as product intent · → v7.22.28 CONFIRMED)

| # | 피드백 | 흡수 판정 | 이유 |
|---|--------|-----------|------|
| A | profit / settlement / wallet = **실제 지급 금액**(포인트·순수 시뮬 UI 금지) | **동의** | Money §11/§49 ledger credit · practice≠profit 이미 잠금 |
| B | `platform_reserve` / 지급 재원 서사 = **제품 P0 Freeze 아님** · 운영/재무 영역 | **동의** | 엔진이 재원을 “생성”하지 않음 · Ops 책임 |
| C | 「운영자 지급」≠「수익 보장」 — 제품 로직과 운영 재원을 **분리** | **동의** | §1.1 보장 금지 유지 |
| D | 최종 모델 = **자동 수익 매칭 플랫폼**(사고파는 앱 아님) | **동의** | Index §20.2와 정합 |
| E | Primary CTA = `매칭 참여` only · 구매/판매/입찰 금지 | **부분 동의 → A2 승계·흡수** | 직접거래 CTA 금지 유지. 유저 Primary=`매칭 참여` only는 **철회** → `수익 벌기` |
| F | **1분 SLA** = **참여/수익벌기 CTA 이후** → 매칭→처리→수익확정 · **입금 체인과 분리** | **동의 · 문서 잠금** | Index §20.2 · Engine `estimatedDurationSec` 목표≤60 |
| G | `expectedSellDays` 시간축 제거/교체 | **동의 · 문서 잠금** | 유저 surface **0** (스키마 deprecated) |
| H | 탭명 **`내거래` 유지 가능** — “이력 조회”이면 거래자 UX 아님 | **동의 · 초판 FLAG 철회** | 금지 대상은 직접거래 **행동**이지 「거래」어휘 전면금지가 아님 |

### A1.2 반대 → 교정 흡수 (오차0)

| # | 피드백 표현 | 반대/교정 | 흡수 문장 (SSOT) |
|---|-------------|-----------|------------------|
| X1 | 「운영자가 실제 금액 지급」을 **건별 수동 Admin 송금**으로 읽히게 함 | Day-1 문서 SSOT는 `MATCH_SUCCESS` → **즉시 자동 ledger 분개**(§48.13). 수동 건별 지급으로 Freeze하면 Rule 핵과 충돌 | **제품:** 정산=실제 USDT 잔액 credit(자동). **운영:** 그 credit를 뒷받침할 지급 재원 확보는 Ops 책임(제품 P0 아님). |
| X2 | 「AI 자동 매칭」= LLM이 성공/실패 결정 | Engine SSOT는 deterministic **Rule R1~R10** · LLM 분기·난수 금지 | **제품 UX:** AI/엔진이 기회를 찾고 매칭·처리. **결정 SSOT:** Rule Engine. 퍼뜩 LLM=안내(P/G/S) only. |
| X3 | 「플랫폼 자동 처리」= 외부 마켓 실체결 | v1 `orchestrate` ≠ marketplace fill (ADR-009) | 유저 직접 매매 0 · 처리는 플랫폼 내부(가격조건·정산). 실체결 모드=v2+ 숨김. |
| X4 | (초판 Audit) `내거래`=거래자 암시 → rename P0 | **잘못된 FLAG** — IA 이력 탭은 유지 | `내거래` KEEP. 화면 내부 구매/판매/입찰 CTA만 0. |
| X5 | (초판 Audit) 지급 재원/`platform_reserve`를 구현 차단 P0 | **과대** — Ops로 강등 | simulation S2·`platform_reserve`는 Admin/Ops 가드 가능 · 제품 착수 blocker 아님. |

### A1.3 용어 잠금 (중복0 · 이하 전부 · A3)

| 표현 | 판정 | 이유 |
|------|------|------|
| 내거래 / 거래내역 / 거래 상세 | ✅ 유지 가능 | 참여한 매칭·처리·정산 **이력 조회** |
| 수익 벌기 (유저 Primary) | ✅ **CONFIRMED v7.22.28** | Index §20.2 Owns |
| 매칭 참여 | ⚙ **도메인/내부** (유저 메인 CTA 아님) | `participate` · matching 층 · 메인 ❌ |
| 구매하기 · 판매하기 · 입찰하기 · 거래소 이동 | ❌ 제거 | 유저=거래 당사자 UX |
| 거래하기 (Primary CTA) | ❌ 제거 (retired) | 직접거래·모호 CTA |
| 이 상품으로 수익 벌기 | ❌ 유지 금지 | 상품 거래 암시 (ADR-007) |
| 이 기회로 수익 벌기 | ✅ 상세 허용 | 기회≠상품 |
| 「거래」어휘 자체 | ❌ 전면금지 아님 | 직접거래 **행동**만 금지 |
| expectedProfit | 실제 예상 수익(지급 대상) | 시뮬 장난감 UI 금지 |
| settlement / wallet profit | 실제 금액 | practice 버킷과 혼용 금지 |
| platform_reserve | Ops/시뮬 입력 | **제품 P0 Freeze 제외** |
| 1분 목표 | CTA 후 처리 SLA (문서 잠금) | ≠ 입금 19conf · ≠ presentation 연출 · REQUEUE 정책=잔여 |
| AI 매칭(카피) | 허용 | 성공 결정=Rule (LLM 아님) |

### A1.4 제품 P0 (문서 Freeze 완료 · 재원 제외 · 구현 잔여 별도)

1. 사용자 역할 = **자본 참여자** ✅  
2. 사용자 직접 구매/판매/입찰 = **없음** ✅  
3. 유저 Primary CTA = **`수익 벌기`** · domain=`participate` ✅ v7.22.28  
4. AI/엔진 = 기회 탐색 + 자동 매칭(결정=Rule) ✅  
5. 플랫폼 자동 처리 (`orchestrate`) ✅  
6. 수익 = **실제 지급 금액** ✅ 문서 · copy 실물 잔여  
7. 정산 = **실제 금액** ledger ✅  
8. 목표 = **CTA 이후 약 1분 이내** 매칭→처리→수익확정 ✅ 문서 · REQUEUE UX=잔여  
9. **`expectedSellDays` 유저 surface 0** ✅ 문서  
10. 직접거래 행동 CTA/카피 제거 · **`내거래` 탭명 유지** ✅  

---

## A2. 유저 CTA = `수익 벌기` — 동의 / 반대 / 교정 (이력 · 흡수 완료)

> **이력:** A2 시점에는 플랜 Primary=`매칭 참여`와 운영자 의도=`수익 벌기`가 충돌했다.  
> **현행 (A3):** Index §20.2 · ADR-007 · `verify:cta-earn-profit` = **`수익 벌기` CONFIRMED**. 본 절 Owns 종료 → **Index §20.2가 승**.

### A2.1 동의

| # | 피드백 | 판정 | 이유 |
|---|--------|------|------|
| C1 | Primary를 결과 중심(`수익 벌기`)으로 | **동의 (UX)** | “누르면 무엇을 얻는가”가 즉시 전달 · 자본참여자 목적=수익 |
| C2 | `매칭 참여`=시스템/도메인 용어에 가깝다 | **동의** | 기술 과정명 · 유저 메인 CTA로 약함 |
| C3 | UI 라벨 ≠ domain (`participateInOpportunity` / matching / MATCH_SUCCESS) | **동의** | INTERNAL/USER 분리(§20.2)와 동일 패턴 |
| C4 | 상태 카피: 매칭 중→처리 중→수익 확정→지급 완료 | **동의** | 진행실·영수증과 정합 가능 |
| C5 | `수익 벌기`는 **보장 오인** 가능 → 예상수익·적합도·면책 병기 | **동의** | §1.1 보장 금지 · footnote 필수 |
| C6 | `내거래` 이력 탭 유지 | **동의** | A1.1-H |
| C7 | Audit의 “매칭 참여 only” 무조건 고정을 풀고 CTA를 먼저 Freeze | **동의 · 완료** | v7.22.28 |

### A2.2 반대 → 교정 흡수 (이력 → 해소)

| # | 피드백/위험 | 반대·교정 | 현행 (A3) |
|---|-------------|-----------|-----------|
| D1 | 유저 CTA=`수익 벌기`를 문서 CONFIRMED처럼 취급 | (당시) 플랜=`매칭 참여`와 충돌 | **해소** — Index §20.2 CONFIRMED=`수익 벌기` |
| D2 | 상세 CTA `이 기회로 수익 벌기` | `이 상품으로…`와 구분 | **CONFIRMED** 상세 허용 · 상품 문구 ❌ |
| D3 | Hero `오늘 수익 벌기` | FOMO·일일 보장 암시 | ✅ + 면책·예상 톤 (Index) |
| D4 | `수익 벌기`만으로 역할 설명 끝 | 직접거래 배지 약화 위험 | 배지 유지(§20.2) |
| D5 | sticky/단축 | 오차0 Freeze | sticky=`수익 벌기` **동일** (단축 추가 금지) |
| D6 | CI명 `cta-match-participate` | 라벨·verify 불일치 | **`verify:cta-earn-profit`** · 구명=alias |

### A2.3 층 분리 (오차0 · CONFIRMED)

| 층 | 값 | 유저 노출 |
|----|-----|-----------|
| UI Primary (카드/히어로) | **`수익 벌기`** | ✅ |
| UI sticky | **`수익 벌기`** (동일) | ✅ |
| UI 상세 진입 | **`이 기회로 수익 벌기`** | ✅ |
| UI 잔액부족 | **`입금하고 수익 벌기`** | ✅ |
| UI Hero (선택) | **`오늘 수익 벌기`** + 면책 | ✅ |
| UI 진행 시작 | 수익 처리 시작 / AI 매칭 중 … | ✅ 상태 |
| UI 성공/완료 | 수익 확정 · 수익 지급 완료 | ✅ |
| Domain API | `participate` / `participateInOpportunity` | ❌ |
| Engine | matching · Rule R1~R10 | ❌ |
| Settlement | `MATCH_SUCCESS` | ❌ |
| 구 유저 CTA `매칭 참여` | 메인 CTA 금지 · 도움말 부용어만 | 메인 ❌ |

### A2.4 카드 필수 동반 구조 (보장 오인 방지 · 동의 C5)

```
[ 수익 벌기 ]          ← Primary
예상 수익  +N USDT     ← 실금액 예상 (시뮬 장난감 금지)
AI 매칭 적합도  N%     ← ≠당첨/보장 (문서 필드 aiConfidenceScore)
면책 1줄: 예상 결과는 시장 상황에 따라 달라질 수 있습니다.
배지: 직접 사지 않아요 · 직접 팔지 않아요
```

### A2.5 CTA 판정표 (Index §20.2 승)

| 위치 | 문구 | 판정 |
|------|------|------|
| 홈 Hero | 오늘 수익 벌기 | ✅ + D3 면책 |
| Opportunity 카드 | 수익 벌기 | ✅ Primary |
| 잔액 부족 | 입금하고 수익 벌기 | ✅ |
| 상세 진입 | 이 기회로 수익 벌기 | ✅ · ≠상품 |
| sticky | 수익 벌기 | ✅ |
| 처리 시작 | 수익 처리 시작 | ✅ |
| 상태 | AI 매칭 중 | ✅ 과정 카피 |
| 성공 | 수익 확정 | ✅ |
| 완료 | 수익 지급 완료 | ✅ |
| 내역 탭 | 내거래 | ✅ KEEP |
| (내부) | 매칭 참여 / participate | ⚙ 도메인 |
| — | 구매/판매/입찰/거래소이동/거래하기/이 상품으로 수익 벌기/유저메인 매칭 참여 | ❌ |

### A2.6 Freeze 체크리스트 (CTA · 플랜 흡수 상태)

- [x] Index §20.2 Primary·retired 표 개정 → **v7.22.28**  
- [x] ADR-007 drift lock 문구 개정  
- [x] UI §5.3b/§7.3/§48 · copy keys (`ctaEarn` 등) 명세  
- [x] `verify:cta-earn-profit` CATALOG (구 cta-match-participate alias)  
- [x] 보장 면책·배지·예상수익 병기 명세  
- [x] sticky=`수익 벌기` 잠금  
- [ ] Canon wire `primaryCta` 문자열 · `packages/ui/copy/ko` 실물 (앱/monorepo 시)

**앱 Primary 하드코딩:** 플랜 SSOT 따름 · copy 패키지 미생성 시 구현 BLOCKED는 monorepo 이후.

---

## 0. Executive Verdict (A3)

| 질문 | 판정 |
|------|------|
| §20.2 자본참여자 모델 ↔ 운영자 의도 | **일치 CONFIRMED** |
| 유저 Primary CTA | **CONFIRMED=`수익 벌기`** (v7.22.28) · domain=`participate` |
| 문서 전체 일관성 | **양호** — CTA/시간축 흡수 완료 · REQUEUE·copy 실물 잔여 |
| profit = 실제 금액 | **문서 CONFIRMED** · UI 실물 잔여 |
| 1분 SLA (CTA 이후) | **문서 잠금** · HARD/REQUEUE UX=잔여 |
| `platform_reserve` blocker? | **아니오 (Ops)** |
| `내거래` rename P0? | **아니오** |
| 구현 전 | **헌법/스키마** + Canon/`ctaEarn` · CTA 재Freeze **불필요** |

**한 줄:**  
자동 수익 매칭 · 실금액 정산 · CTA=`수익 벌기` · CTA 후 ≈1분. **CTA 플랜 충돌은 해소됨.** 다음 blocker=`CONSTITUTION/`·`schemas/`·copy/Canon 실물.

---

## 1. Scope & Method

### 조사한 것
- ACTIVE 플랜 `00`~`06` · ARCHIVE launch  
- `docs/CONSTITUTION_BOOTSTRAP.md` · ADR-016 · `AGENTS.md` · `TOOLCHAIN.md` · rules  
- Canon / Brand / Lux · `tooling/verify/CATALOG.md`

### 하지 않은 것
- 앱 코드·migration · 플랜 TODO status 변경(본 Audit A3는 이 파일만)

### 실물 (BOOTSTRAP CONFIRMED)
- `CONSTITUTION/` 0 · `schemas/` 0 · apps 0 · migrations 없음  
- Brand·Lux·Canon 일부·verify·workers scaffold만

---

## 2. Document Authority Map (A3)

| File | Role | Authority | Status | Conflicts | Notes |
|------|------|-----------|--------|-----------|-------|
| `ai_profit_os_00_index_*.plan.md` | SSOT Index · Product | Highest ACTIVE | **v7.22.28** | — | §20.2 Owns CTA·역할 |
| `ai_profit_os_01_engine_*.plan.md` | Opportunity · Rule | Architecture | ACTIVE v7.22.28 | REQUEUE vs 1분 UX | `expectedSellDays` 유저0 · §48.13 |
| `ai_profit_os_02_money_*.plan.md` | Ledger · deposit | Money | ACTIVE | 입금 latency ≠ 처리 SLA (의도적 분리) | §49 · PG사0 |
| `ai_profit_os_03_ui_ux_*.plan.md` | UX · CTA · 5탭 | UX | ACTIVE v7.22.28 | copy/Canon 실물 0 | `내거래` KEEP |
| `ai_profit_os_04_admin_*.plan.md` | Admin Ops | Ops | ACTIVE | Admin 매입/판매 컬럼=내부 | 유저 유출 금지 |
| `ai_profit_os_05_pwa_*.plan.md` | PWA | Support | ACTIVE | — | |
| `ai_profit_os_06_infra_*.plan.md` | Infra · Auth | Infra | ACTIVE | G2 랜딩 투자암시 예외 | |
| `ai_profit_os_launch_*.plan.md` | ARCHIVE | Deprecated | ARCHIVE | 구 CTA (헤더 pointer) | 분리 플랜 승 |
| `docs/CONSTITUTION_BOOTSTRAP.md` | 착수 체크 | Checklist | ACTIVE | — | 헌법 미생성 |
| ADR-001~016 (플랜 내) | ADR | ADR | Mixed | ADR-005 법무 배제 | ADR-007 CTA 잠금 |
| `.cursor/rules/*` | Guardrails | Enforce | ACTIVE | — | |
| `AGENTS.md` / `TOOLCHAIN.md` | Agent SSOT | SSOT | ACTIVE | — | |
| `packages/ui/canon/**` | Wire | UX | Partial | home/opportunity primaryCta 잔여 | |
| `CONSTITUTION/*` · `schemas/*` | Missing | — | NOT CREATED | — | **착수 P0** |
| `this file` | Audit 이력 + gap | Audit | ACTIVE | — | **플랜 대체 아님** · Index 승 |

---

## 3. Platform One-Sentence

> 이 플랫폼은 **자동 수익 매칭**을 위해 사용자가 **실제 자금을 입금하고** 유저 CTA **`수익 벌기`**(domain=`participate`)하면 AI/엔진이 **수익 기회를 탐색·자동 매칭**하고 플랫폼이 **자동 처리**한 뒤 **실제 수익금을 정산·지갑 반영**하여 **출금**할 수 있게 하는 플랫폼이다.

| 층 | 상태 |
|----|------|
| Index §20.2 자본참여자 · CTA=`수익 벌기` | CONFIRMED |
| 실제 금액 지급 · CTA 후 ≈1분 | CONFIRMED (문서) · REQUEUE UX 잔여 |
| 원금·수익 보장 | CONFIRMED **미제공** |

---

## 4. USER ROLE

**판정:** Capital participant / Matching participant — CONFIRMED §20.2  

하는 일: 입금 · **수익 벌기** · 진행 확인 · 정산 수령 · 출금 · **내거래**  
안 하는 일: 구매·판매·입찰·마켓 선택·외부 거래소 이동·가격 협상  

### FLAG — 직접거래 **행동**만 (CTA 문서 Freeze 완료)

| # | 항목 | 판정 | 비고 |
|---|------|------|------|
| 1 | Primary `거래하기` | ❌ retired | ADR-007 |
| 2 | 탭 `내거래` | ✅ KEEP | A1 |
| 3 | 구매/판매/입찰 | ❌ | |
| 4 | `expectedSellDays` 유저 | ❌ 0 | v7.22.28 |
| 5 | `이 상품으로 수익 벌기` | ❌ | 상품 거래 암시 |
| 6 | 유저 Primary `수익 벌기` | ✅ | domain=`participate` |
| 7 | 성공 「이베이 판매 완료」 | ❌ | |
| 8 | toast 「바로 거래할 수 있어요」 | ⚠ | 수익 벌기 가능 톤으로 교체 |
| 9 | `/trades` · `participate` | ✅ 내부 | 유저 라벨≠경로 |

---

## 5. PLATFORM ROLE

| 기능 | 상태 | 비고 |
|------|------|------|
| Opportunity discovery | CONFIRMED | adapters |
| Matching | CONFIRMED | participate + Rule |
| AI/엔진 기회·매칭 표현 | CONFIRMED UX | 결정≠LLM |
| Platform auto process | CONFIRMED orchestrate | ≠실체결 |
| Profit = 실제 금액 | CONFIRMED 문서 | 시뮬 UI 금지 · copy 실물 잔여 |
| Settlement → wallet | CONFIRMED | 즉시 credit |
| Ops 지급 재원 | Ops · P0 제외 | A1.1-B |
| CTA 후 ≈1분 SLA | CONFIRMED 문서 | REQUEUE/HARD 정책 잔여 |
| LLM 성공 결정 | CONFIRMED 금지 | |

---

## 6. Core Journey

### 유저 surface (CONFIRMED §20.2)
```
[ AI가 기회 탐색 ] → 수익 기회 발견
USER ── 입금 ──→ [ 수익 벌기 ]  ← UI · domain=participate
 → 내 자금 배정 → AI 자동 매칭 → 플랫폼 자동 처리
 → 수익 확정 → 실제 금액 지급 → 내 지갑 → 출금
상태: 매칭 중 → 처리 중 → 수익 확정 → 지급 완료
```
(이력: **내거래** · 구 유저 메인 `매칭 참여` = retired)

### 제품 로직 vs 운영 (분리 · 중복0)

**[제품 로직]**  
매칭 성공 → 수익 계산 → 실제 정산 금액 생성 → ledger 지급 처리 → 사용자 잔액 반영  

**[운영]**  
운영자는 정산 credit를 뒷받침할 현금/USDT 등 **지급 재원을 확보·운영**한다.  
→ 투자/직접매매 구조로 해석하지 않음 · 제품 P0 Freeze 아님.

### 편차

| # | 내용 | 상태 |
|---|------|------|
| J1 | v1 처리 = Rule/orchestrate ≠ 유저 실체결 | CONFIRMED |
| J2 | `expectedSellDays` 유저 0 | **해소** (문서) · 스키마 deprecated 잔여 |
| J3 | `estimatedDurationSec` 목표≤60 | **문서 잠금** · day 스케일 금지 |
| J4 | 입금(USDT 19conf / KRW admin) ≠ 1분 처리 SLA | CONFIRMED 분리 |
| J5 | presentation duration ≠ settlement | CONFIRMED |
| J6 | REQUEUE vs Soft60/Hard90 | **해소(A4)** · hard→`MATCH_TIMEOUT` |
| J7 | 카드 선택 참여 (완전 무선택 배정 아님) | CONFIRMED |
| J8 | 성공 결정 = Rule ≠ LLM | CONFIRMED |

---

## 7. 1분 목표 감사 (A3)

| 항목 | 판정 |
|------|------|
| 의도 SLA | **수익 벌기/participate CTA 후** 매칭→처리→수익확정 ≈1분 · **문서 CONFIRMED** |
| 입금 체인 ~1분 | **별도**(Money) · 처리 SLA에 합산 금지 |
| UI presentation | 연출 only · SLA 아님 |
| 문서 명시 “CTA 후 1분” | **있음** — Index §20.2 · Engine overview |
| Soft / Hard · REQUEUE 초과 UX | **Freeze A4** — soft60 · hard90 · 카피3줄 · Index v7.22.29 |
| `expectedSellDays` | 유저 **0** (문서) |
| `거래하기` CTA | retired |

### `expectedSellDays`
레거시 판매일 잔재 · 유저 카드 시간축 **삭제** 잠금. 스키마 필드는 deprecated · Admin historical only 가능.

---

## 8. 1분 Architecture Feasibility

**범위:** 참여 후 처리만 (입금 latency 제외).

| 영역 | 요약 |
|------|------|
| Data | staleAt 3s · adapter TTL · FX 캐시 — PRICE_MOVED 위험 |
| AI/LLM | 매칭 결정에 불필요 → latency 유리 |
| Matching | R1~R10 즉시 settlement 경로 = 초~수십 초 가능 |
| REQUEUE | Soft60/Hard90 · maxRematch=2 · retryWait=4 · **A4 Freeze** |
| Execution | 외부 fill 대기 없음(v1) |

### 참여 후 1분을 방해하는 TOP (입금 제외)

1. ~~`expectedSellDays` UI~~ → 문서상 유저0 (구현 시 재유입 금지)  
2. `estimatedDurationSec`를 day 스케일로 구현  
3. REQUEUE / retryWaitSec 누적  
4. staleAt≤3s → PRICE_STALE 다발  
5. matchStrictness 희소 프리셋  
6. dailyUserMatchCap / slots  
7. FX freshness(캐시·일고시) — fx 기회  
8. listing TTL / compareReady  
9. presentation을 성공으로 오인하는 카피  
10. 「처리」=실체결 오해 카피  

**판정:** Rule 즉시 정산 경로는 1분 **기술 가능**. day-horizon·REQUEUE Soft/Hard는 **문서 Freeze(A4)**. 구현·Canon 실물만 잔여.

---

## 9. Opportunity

**CONFIRMED §20.2:** 플랫폼이 처리하는 **수익 기회(자금 배정)** ≠ 유저가 사고팔 상품.

필드 역할(요약 · 중복0): 가격/스프레드/수수료=근거·정산 입력 · `expectedProfit`=유저 예상 **실지급** · `requiredCapital`=참여 잠금 · `aiConfidence`=적합도(≠보장) · `sellSuccessRate`=표시 only·Rule 금지 · `executionPlatforms`=유저 0 · `expectedSellDays`=**유저 0**.

---

## 10. ArbitrageType

| Type | V1 | V2+ | Excluded |
|------|----|-----|----------|
| price | ✅ | | |
| fx | ✅ | | |
| benefit | | ✅ | |
| limited | | ✅ | v1 0 |
| resale | | | KR 영구 |

= **돈을 만드는 메커니즘**(상품 종류 아님) — CONFIRMED §20.1.

---

## 11. Category vs Type

`arbitrageType` ⊃ `category`(watch|trading_card|luxury_bag).  
category를 1급 쇼핑 트리로 승격 금지. `내거래`와 무관.

---

## 12. V1 Scope

**ON:** price/fx · watch/card/bag · orchestrate · 실금액 ledger · 5탭(내거래 KEEP) · PG사0 · 유저 CTA=`수익 벌기`  

**OFF:** benefit/limited/resaleKR · info/full · 투자·AI부업 마켓 · 유저 구매/판매 CTA · 유저메인 `매칭 참여`

---

## 13. Wrong-Product FLAGS (A3)

| FILE → | 문제 | 수정 방향 |
|--------|------|-----------|
| ~~Index §20.2 vs A2~~ | Primary 라벨 충돌 | **해소** v7.22.28 |
| Primary `거래하기` | retired 재등장 | ❌ CI/`user-trader-jargon-0` |
| Engine/UI 구현 | `expectedSellDays` 유저 재유입 | 유저0 유지 |
| — | `이 상품으로 수익 벌기` | ❌ 유지 금지 |
| — | `이 기회로 수익 벌기` | ✅ 상세 허용 |
| — | ~~내거래 rename~~ · ~~reserve P0~~ | 철회 |

---

## 14. CTA Audit → **Index §20.2 Owns** (A2=이력)

요약: 유저 Primary **`수익 벌기`(CONFIRMED)** · 도메인 **`participate`/`매칭`** · 금지=직접거래 행동·`이 상품으로…`·`거래하기`·유저메인 `매칭 참여`.  
표·면책·체크 = **§A2.3~A2.6** (이력) · 현행 SSOT=**Index §20.2**.

---

## 15. Home UX

**B:** AI 수익 기회 + Primary **`수익 벌기`** (쇼핑몰 홈 아님). Hero=`오늘 수익 벌기`+면책(§A2 D3).

---

## 16. Opportunity Card

올바른 인식: “자금 넣고 플랫폼이 처리 → 실제 수익.”  
위험: 썸네일 Hero · buy→sell 회랑 · N일 처리기간 · 구매 CTA.  
배지 `직접 사지/팔지 않아요` 유지.

---

## 17. Matching

유저=카드 선택+참여 · 성공/실패=**Rule** · UX “AI 매칭” 허용(A1.2-X2).

---

## 18. Execution

Opportunity → participate → R1~R10 → MATCH_SUCCESS → **실제** settlement.completed → wallet.  
유저 외부 이동 0 · v1 실체결 0.

---

## 19. Settlement / Wallet

| 항목 | 판정 |
|------|------|
| 수익 지급 순간 | MATCH_SUCCESS 즉시 ledger — CONFIRMED |
| 금액 성격 | 실제 USDT 부채/잔액 — 문서 정합 |
| practice | 출금/참여 승격 금지 |
| Ops 재원 | 제품 밖 · P0 제외 |

자금 흐름: Deposit→principal → lock → settlement(원금복귀+profit) → withdraw.

---

## 20. Profit Formula (문서 그대로 · 오차0)

```
grossSpreadUsdt = sell − buy
costBufferUsdt  = fees + riskBuffer
platformMarginUsdt = max(0, (grossSpread − costBuffer) × marginPct)
expectedProfitUsdt = grossSpread − costBuffer − platformMargin
```

→ 유저 표시·정산의 **실금액** 근거. UI 시뮬 장난감화 금지.

---

## 21. Risk / Confidence

`aiConfidence` ≠ 보장 · `sellSuccessRate` ≠ Rule · 매칭 성공 ≠ 수익 보장(실패 코드 존재).

---

## 22. Business Model (제품 vs 운영 · 중복0)

| 층 | 내용 | 제품 P0? |
|----|------|----------|
| 플랫폼 마진 | `platformMarginUsdt` | 공식 CONFIRMED |
| 유저 수익 | settlement → profit 버킷 **실금액** | 예 |
| `platform_reserve` / 지급 재원 | Ops·시뮬 S2 | **아니오** |
| AI가 재원 생성 | 아님 | — |

「운영자가 지급」교정: **자동 ledger credit(제품)** + **재원 확보(운영)** — 건별 수동 송금 Day-1 필수화 금지(A1.2-X1).

---

## 23. Compliance

보장·투자권유 금지 유지. 법무 심화=ADR-005로 플랜 배제 · **전문가 검토 필요**(제품 Freeze 목록과 별개).

---

## 24. TODO Audit (A3)

| Plan | Todos | Pending | Completed |
|------|------:|--------:|----------:|
| 00~06 + launch | **99** | **87** | **12** |

| TODO / 갭 | Status | Reason | Priority |
|-----------|--------|--------|----------|
| ~~A2 CTA Freeze (Index/ADR/verify)~~ | **DONE** | v7.22.28 | — |
| ~~CTA 후 1분 SLA 문서~~ | **DONE** | Index/Engine | — |
| ~~expectedSellDays 유저0 문서~~ | **DONE** | §20.2 · Engine | — |
| constitution / schemas | KEEP | **착수 선행** | **P0 BLOCKER** |
| match-success-rule | KEEP | 실금액 정산 핵 | P0 |
| capital-provider-match-ux 실물 | KEEP | Canon/`ctaEarn`/면책 구현 | P0 (monorepo 후) |
| ~~REQUEUE vs 1분 UX 정책~~ | **DONE A4** | soft60·hard90·카피3줄 · v7.22.29 | — |
| **ADD: 실금액≠시뮬 copy CI** | ADD | 보장 오인 0 | P0 (copy 시) |
| ~~매칭 참여 only 영구 고정~~ | **REMOVE** | A2 | — |
| ~~reserve P0~~ · ~~내거래 rename~~ | **REMOVE** | A1 | — |

---

## 25. Freeze Before Implementation (제품 P0 · ≤25 · A3)

| # | Decision | Why | Status |
|---|----------|-----|--------|
| 1 | User = capital provider | 역할 | ✅ 문서 |
| 2 | 직접 구매/판매/입찰 = 0 | 의도 | ✅ 문서 |
| 3 | 유저 Primary = `수익 벌기` · domain=`participate` | CTA | ✅ v7.22.28 |
| 4 | UI↔domain 분리 (participate / MATCH_SUCCESS) | A2.3 | ✅ |
| 5 | 수익 벌기 + 예상수익 + 적합도 + 면책 + 배지 | 보장 오인 | ✅ 명세 · copy 잔여 |
| 6 | `이 상품으로…` ❌ · `이 기회로…` ✅ | D2 | ✅ |
| 7 | AI 탐색 카피 · 결정=Rule | A1-X2 | ✅ |
| 8 | orchestrate 자동 처리 | ≠유저 매매 | ✅ |
| 9 | 실금액 profit/settlement/wallet | 신뢰 | ✅ 문서 |
| 10 | CTA 후 Soft60 / Hard90 · REQUEUE | A4 | ✅ v7.22.29 |
| 11 | 입금 latency ≠ 처리 SLA | 오차0 | ✅ |
| 12 | `expectedSellDays` 유저 0 | 1분 | ✅ 문서 |
| 13 | `내거래` KEEP | A1 | ✅ |
| 14 | Primary `거래하기` retired | drift | ✅ ADR-007 |
| 15 | presentation ≠ credit | §48.13 | ✅ |
| 16 | V1 scope · REQUEUE Soft/Hard | A4 | ✅ 문서 · 구현 잔여 |
| 17 | PG사0 · Auth Nest · constitution/schemas | 스택 | ⏳ 실물 0 |
| 18 | practice≠profit · KR resale 0 | Money/정책 | ✅ |
| 19 | ~~platform_reserve 제품 P0~~ | **Ops 제외** | ✅ |
| 20 | ~~매칭 참여 only 영구~~ | **A2 철회** | ✅ |

---

## 26. Dangerous Errors TOP 10 (A3)

1. **구 Audit/구 카피**로 `매칭 참여`를 유저 Primary로 재구현 → CI/`cta-earn-profit` 실패  
2. `수익 벌기`를 **수익 보장**으로 읽히게 함(면책·배지 누락)  
3. `이 상품으로 수익 벌기` 부활 → 거래 당사자 UX  
4. `expectedSellDays` 유저 UI 재유입 vs CTA 후 1분  
5. 수익=시뮬/포인트 UI  
6. AI 매칭=LLM 성공 결정  
7. 처리=유저 외부 실체결 카피  
8. 입금 시간을 처리 SLA에 합산  
9. 쇼핑형 Opportunity 카드  
10. (강등) 재원 서사 — Ops · 제품 blocker 아님  

---

## 27. Mental Model (CONFIRMED · A3)

```
                 [ AI/엔진 기회 탐색 ]
                         ↓
                  수익 기회 발견
                         ↓
USER ── 입금 ──→ [ 수익 벌기 ]     ← UI CONFIRMED (Index §20.2)
              domain: participate / matching
                         ↓
                  내 자금 배정
                         ↓
                  AI 자동 매칭 (결정 = Rule)
                         ↓
                플랫폼 자동 처리 (orchestrate)
                         ↓
                  수익 확정 → 실제 금액 지급 → 지갑 → 출금

이력: 내거래
Ops 재원: 제품 P0 아님
구 유저 메인 `매칭 참여` = retired
```

---

## 28. Final Decision Table (A3)

| 질문 | 답 | 상태 |
|------|----|------|
| 무엇을 만드는가? | 자동 수익 매칭 플랫폼(퍼뜩) | CONFIRMED |
| 사용자 행동 | 입금 · 수익 벌기 · 이력 · 출금 | CONFIRMED |
| 유저 Primary CTA | `수익 벌기` · domain=`participate` | **CONFIRMED v7.22.28** |
| 도메인 동사 | participate / matching / MATCH_SUCCESS | CONFIRMED |
| 직접 사고파는가? | 아니오 | CONFIRMED |
| 플랫폼 자동 처리? | 예(orchestrate) | CONFIRMED |
| AI 자동 매칭? | UX 예 · 결정=Rule | CONFIRMED |
| 처리 목표 시간 | Soft60 · Hard90 · REQUEUE≤2 | **CONFIRMED A4 / v7.22.29** |
| 입금 체인 시간 | 별도 | CONFIRMED |
| Opportunity | 자금 배정 수익 기회 | CONFIRMED |
| 수익/정산 | 실제 금액 | CONFIRMED 문서 |
| `내거래` | KEEP | CONFIRMED |
| `platform_reserve` | Ops · 제품 P0 아님 | CONFIRMED |
| 최대 risk | 보장 오인 · day UI 재유입 · copy 실물 0 | risk |
| 구현 전 결정 | **A5 순서:** constitution→schemas→migrations→monorepo | gap |

---

## 29. Alignment Score (A3.1 · 재점수 Owns)

> **채점 기준:** 문서 SSOT 정합(플랜·Audit)·제품 의도 정렬. **앱 코드 완성도 ≠ Ready** — Ready는 구현 착수 가능 여부.  
> **비교 기준선:** A2 직후 stale Audit(§29 구판) vs 현행(v7.22.28 + A3 sync).

### 29.1 Before → After

| 축 | A2 구판 | **A3.1** | Δ | 근거 |
|----|--------:|---------:|:-:|------|
| Non-trader **행동** | 8/10 | **8/10** | 0 | 구매/판매/입찰 금지 문서 명확 · 구현 CI 실물 0 |
| 유저 CTA 직관성 | 7/10 | **9/10** | +2 | Primary=`수익 벌기` 잠금 · 면책/배지 명세 · copy 실물만 잔여 |
| CTA 문서 일치 | 2/10 | **9/10** | +7 | Index/ADR-007/verify/`Audit` 동기화 · 잔여=Canon wire 문자열 |
| `내거래` IA | 9/10 | **9/10** | 0 | KEEP 확정 |
| 실금액 정산 | 8/10 | **8/10** | 0 | ledger §48.13/§49 정합 · UI/시뮬 가드 실물 0 |
| CTA 후 1분 | 4/10 | **8/10** | +4 | Soft60/Hard90·카피3줄 **A4** · Canon 실물 잔여 |
| Ops 재원 과대평가 제거 | 10/10 | **10/10** | 0 | `platform_reserve`≠제품 P0 |
| **Ready (착수)** | 4/10 | **5/10** | +1 | CTA/REQUEUE 문서 해소 · **헌법/스키마/apps=0** |

**축 평균 (Ready 제외 7축):** (8+9+9+9+8+8+10)/7 ≈ **8.7/10** (구판 ≈6.9 · A3.1 ≈8.4)

### 29.2 Ready 게이트 (5/10 → 다음 점수)

| Ready 조건 | 현재 | 점수 영향 |
|------------|------|-----------|
| CTA 플랜 Freeze (`수익 벌기`) | ✅ | +1 (4→5에 반영) |
| Audit↔Index stale 0 | ✅ A3 | 유지 |
| `CONSTITUTION/` 생성 | ❌ | +2 시 Ready≈7 |
| `schemas/` Day-1 + migrations 골격 | ❌ | +1 시 Ready≈8 |
| Canon `primaryCta` + `copy/ko` `ctaEarn` | ❌ | +1 시 Ready≈9 |
| monorepo skeleton + `verify:stack-lock` | ❌ | +1 시 Ready≈10 |
| REQUEUE vs 1분 UX Freeze | ✅ A4 | 1분 축 →8 (Ready 필수 아님) |

**판정:** 문서 제품 정렬은 **높음(≈8.7)**. 구현 착수 Ready는 **중하(5/10)** — 다음 레버는 헌법/스키마.

### 29.3 요약표

| 축 | Score | Note |
|----|------:|------|
| Non-trader **행동** | 8/10 | 구매/판매 금지는 명확 |
| 유저 CTA 직관성 | 9/10 | `수익 벌기` 잠금 · 면책 실물 잔여 |
| CTA 문서 일치 | 9/10 | v7.22.28 · A3 sync · Canon 잔여 |
| `내거래` IA | 9/10 | KEEP |
| 실금액 정산 | 8/10 | 문서 정합 · UI 실물 0 |
| CTA 후 1분 | 8/10 | Soft60/Hard90 · A4 · copy 실물 잔여 |
| Ops 재원 과대평가 제거 | 10/10 | |
| **축 평균 (Ready 제외)** | **8.7/10** | 제품 문서 정렬 |
| Ready | 5/10 | CTA/REQUEUE 문서 해소 · **헌법/스키마/앱 미착수** |

---

## 30. Counts (A3)

| Metric | Count |
|--------|------:|
| Authority docs reviewed | **42** |
| Plan TODOs | **99** |
| 직접거래 **행동** FLAG | **11** |
| CTA 라벨 충돌 (플랜↔의도) | **0** (해소) |
| 1분/latency 잔여 risk | **구현·stale 재유입 ~6** (정책 Freeze 완료) |
| 문서 CTA 충돌 | **0** |
| Missing product decisions | **~2** (constitution/schemas 실물 등) |
| 제품 P0 Freeze rows | **20** (문서 ✅ 다수 · 실물 잔여) |

---

## 31. Next (A8)

1. ~~A2~A8 문서 Freeze~~ → CTA · Soft/Hard · 긴장감 · listing · yahoo 영구배제 · 착수순서  
2. **운영자:** eBay 키 대기 · Yahoo **준비 안 함(영구)** · Pokémon/CoinGecko/Gemini/시드  
3. **다음 채팅:** Index `constitution-28-core` only  
4. 이후: schemas → migrations → monorepo → adapters(ebay 멀티 first · yahoo **0**)  
5. `platform_reserve`는 Ops only  

---

*End — PRE_IMPLEMENTATION_MASTER_AUDIT · A1~A8 · AUDIT ONLY*
