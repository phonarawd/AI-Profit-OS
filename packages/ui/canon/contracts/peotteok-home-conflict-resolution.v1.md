# STEP 2 — Peotteok Home Conflict Resolution v1

> ⚠️ **SUPERSEDED (VISUAL AUTHORITY) · HISTORICAL · NON-AUTHORITATIVE FOR NEW VISUAL IMPLEMENTATION**
> **2026-08-16 — [`ADR-018-peotteok-visual-master-reset.md`](./ADR-018-peotteok-visual-master-reset.md)** 가 본 문서가
> 뒷받침하던 시각 구현 권위를 종료·승계했다. 이 결정은 당시에는 유효했지만, 새 Visual Master Reset(ADR-018)에 의해
> 시각 권위가 **superseded**되었다. C01–C10 decision matrix 자체(어떤 목업 요소가 Fact와 충돌했는지의 **사례집**)는
> 삭제하지 않고 보존한다 — 새 Visual Contract 작성 시 "Reference vs Fact" 판단 참고 자료로만 쓰되, 권위로 인용하지 않는다.
> C01(`ledgerTotal`=COUNT) 등 **Fact 계약 자체**는 시각이 아니므로 ADR-018 §8을 통해 계속 유효하다.

> **트랙:** Peotteok Home Upgrade / Home Experience Layer (**PART9 아님**)  
> **권위:** 본 문서 = **채택/폐기 의사결정 SSOT** · Gap 목록 재작성 금지 · Reference ≠ Fact  
> **선행:** STEP 0 Current Forensic ✅ · STEP 1 Reference Gap (PC) ✅ · STEP 0.5 Backend Fact ✅  
> **후속:** STEP 3 [`peotteok-home-visual-implementation-contract.v1.md`](./peotteok-home-visual-implementation-contract.v1.md) → STEP 4 ADR/Wire/Token amend → Founder 승인 → Implementation  
> **금지:** Founder 승인 전 구현 · `HomePageV2` · PART9 fetch/SDK/mapper/Auth/JWT/API/DB/Ledger 재오픈 · R1 401 실측 강행

**버전:** v1.0  
**일자:** 2026-08-10  
**상태:** ✅ COMPLETE / CONFLICTS LOCKED · Founder ACK  
**범위:** `/` Home + App Shell · Reference(PC) vs Backend Fact vs 기존 Visual Contract 충돌 해소  
**Mobile Reference:** UNKNOWN — 별도 입력 전 모바일 기하/IA **확정 금지**

---

## 0. Track Status (잠금)

| STEP | 산출 | 상태 |
|---|---|---|
| 0 | Current Forensic | ✅ LOCKED |
| 0.5 | Runtime / Backend Fact | ✅ CODE FACT LOCKED · ⚠ Runtime 401 미실측 |
| 1 | Reference Gap (PC) | ✅ PC GAP LOCKED · ⚠ Mobile UNKNOWN |
| **2** | **Conflict Resolution** | ✅ COMPLETE / FOUNDER ACK / LOCKED |
| 3 | Visual Implementation Contract v1 | ✅ APPROVED / LOCKED · 3 LOCKS |
| 4.1–4.3 | ADR / Wire / Token amend | ✅ COMPLETE (코드 0) |
| 4.4 | Implementation Gate | ✅ APPROVED |
| 5 Slice 0 | C01 binding | ✅ 코드 교정 · verify PASS · Slice 1 대기 |

**R1 (401 실측):** API 기동 후 Runtime Verification으로 **별도** 수행. Visual Contract/충돌 해소 **차단 아님**.

---

## 1. Decision Authority Ladder (불변)

우선순위 **높은 쪽 승**. Reference는 1번이 아니다.

| # | Authority |
|---|---|
| 1 | Backend / API Fact |
| 2 | Existing Product Contract (PART9 · Money · Auth) |
| 3 | IA / terminology lock |
| 4 | Existing Visual Contract (`peotteok-home-visual-contract.v1`) |
| 5 | Reference image (PC 목업) |

### 1.1 Reference 분기 규칙

```
REFERENCE
   │
   ▼
Visual appearance
   │
   ├─ visual only ──────────► 적극 활용 가능 (geometry / density / rhythm)
   │
   └─ factual claim ────────► Backend Fact 필요
                                 │
                                 ├─ REAL ──► 표시 가능
                                 └─ ABSENT ► 표시 금지
```

---

## 2. Protected Boundaries (재확인 · 변경 0)

| Boundary | 판정 |
|---|---|
| PART9 live fetch / orchestration (`HomePageClient`) | 🔒 Keep |
| SDK (`@aipo/sdk/*`) | 🔒 Keep |
| mapper (`opportunity-card-map` 등) | 🔒 Keep |
| Auth / JWT / session cookie | 🔒 Keep |
| API / DB / Ledger | 🔒 Keep |
| `HomePageV2` 평행 홈 | ❌ Forbidden |
| PART9 재오픈 (데이터 계층 재설계) | ❌ Forbidden |

Experience Layer(시각·카피·레이아웃)만 STEP 3+에서 교체. 데이터 계층은 보존.

---

## 3. Existing Contract Locks (STEP 2에서 재논쟁 금지)

이미 잠긴 계약을 Reference가 이기지 **않는다**.

### 3.1 IA (5탭)

**채택:** `홈 · 기회 · 수익 · 지갑 · 내정보`  
**폐기:** `내거래` (Reference에 보여도 복원 금지)

### 3.2 Hero timeline (유저 대면)

**채택 (기존 Contract 5단):**

```
AI 스캔 → 기회 발견 → 참여 매칭 → 진행 → 정산 완료
```

**폐기:** Reference의 `스캔 → 발견 → 매칭 → 실행 → 정산` 그대로 복제  
**특히:** 유저 surface에 **「실행」** 용어 사용 금지 (플랫폼 역할·Capital Participant 정의와 충돌 가능)

### 3.3 Audience / 카피 톤

- 한국 20~70대 Capital Participant · 3초 인지  
- 유저 화면 IT 용어 노출 0 (`SDK` · `Engine` · `Ledger` · `API` · `JWT` 등)

---

## 4. Conflict Decisions (C01–C10)

각 충돌은 **채택 / 폐기 / 참고만** 중 하나로 닫는다.

---

### C01 — `ledgerTotal` ≠ 누적 수익 USDT · **P0 NEW**

| | |
|---|---|
| **Reference / Mock** | `+8,745.32 USDT` 등 누적 수익 슬롯 |
| **Backend Fact** | `growth.public-surface.ledgerTotal` = 오늘 `trade_executions` **success COUNT** (settlement completed count) |
| **Current UI risk** | `ledgerTotal > 0 → \`${ledgerTotal} USDT\`` → 건수가 USDT처럼 읽힘 (예: 8건 → 「8 USDT」) |

| 판정 | |
|---|---|
| **채택** | `ledgerTotal` = **settlement completed count** (건수) |
| **폐기** | `ledgerTotal`를 누적 USDT 수익으로 표시 · 목업 `+8,745.32 USDT`를 데이터 슬롯으로 사용 |
| **참고만** | 목업의 시각적 위계(큰 숫자 / 보조 라벨 위치) |

**STEP 3 강제 조항 (초안 방향):**

- 표시 시 단위는 **건수/정산 완료** 계열 · **USDT 접미사 금지** (이 필드에 한함)
- 누적 USDT 수익 Fact가 Home DTO에 **없을 때** 누적 수익 슬롯 자체 **금지**

---

### C02 — Money 「사용가능 / 참여중」

| | |
|---|---|
| **Reference** | 사용가능 ₩xxx · 참여중 ₩xxx |
| **Backend / Home Fact** | Home surface = `principalUsdt` **하나** (원장에 `lockedUsdt`/`profitUsdt` 등이 있어도 Home DTO로 끌어와 분할 금지) |

| 판정 | |
|---|---|
| **채택** | Home Money Fact = `principalUsdt` only |
| **폐기** | 사용가능/참여중 **사실 구조** · Reference 금액 · Home에서 wallet buckets 임의 분할 |
| **참고만** | Reference의 시각 밀도·카드 비율 |

---

### C03 — 30일 수익 차트 / +12.34%

| | |
|---|---|
| **Reference** | 30일 차트 · `+12.34%` |
| **Backend Fact** | 30-day series **없음** · growth percentage **없음** |

| 판정 | |
|---|---|
| **채택** | (데이터 차트 없음) |
| **폐기** | 데이터 차트 구현 · fake series · `+12.34%` 및 유사 growth % |
| **참고만** | 카드 비율 · 차트 영역 여백 · 정보 위계 · visual rhythm |

> 기존 Visual Contract §4「Optional CSS/SVG spark · Fact only」는 **Fact series가 있을 때만** 유효.  
> 현재 Fact 부재 → STEP 3에서 **Home 30일/growth spark = Forbidden**으로 명시할 것.

---

### C04 — RightRail 도넛 / 진행률 숫자

| | |
|---|---|
| **Reference** | 도넛「12 진행 중」· 스캔 24 · 매칭 18 · 실행 9 · 정산 12 |
| **Backend Fact** | `scan`/`confirm`/`progress` **없음** · `settle` ≈ `settlementCompletedToday` **있음** |

| 판정 | |
|---|---|
| **채택** | `settlementCompletedToday` (실제 정산 건수) · 누적/결과 영역 중 Fact 있는 것만 · today possible profit (기존 derived) · TOP opportunities (feed 파생) |
| **폐기** | 도넛 숫자 12 · scan 24 · confirm/매칭 18 · progress/실행 9 · Reference 정보량 억지 복제 |
| **참고만** | RightRail 보조 역할 · 블록 간격 rhythm |

> 기존 Visual Contract §6.2「스캔/확인/진행/정산 {n}」패턴은 **필드 실측 전제**.  
> STEP 0.5 결과로 scan/confirm/progress = ABSENT → STEP 3에서 **해당 슬롯 숨김/삭제**로 갱신.

---

### C05 — 「실시간 AI 스캔 중」

| | |
|---|---|
| **Reference** | 강한 실시간 스캔 주장 |
| **Backend / System** | `AI_SCANNING` FSM · polling · WS · SSE · live scan state **없음** |
| **존재** | DayPulse → settlement fact → header presentation |

| 판정 | |
|---|---|
| **채택** | 기존 Contract의 쉬운말 + Fact 기반 Header/DayPulse 표현 |
| **폐기** | 「실시간 AI 스캔 중」을 **실제 상태처럼** 주장 · 가짜 live FSM UI |
| **참고만** | 현황 칩의 위치·시각적 무게 |

---

### C06 — Hero 제목

| | |
|---|---|
| **Reference** | `오늘 벌 수 있는 기회` |
| **Existing Contract** | `AI가 찾은 오늘의 글로벌 기회` (및 허용 대안 · 단독「오늘 벌 수 있는 기회」폐기) |

| 판정 | |
|---|---|
| **채택** | Visual Contract copy authority |
| **폐기** | 목업 제목 그대로 복원 |
| **참고만** | visual tone / 타이포 위계 |

---

### C07 — Hero 4단 vs Reference 5단 (용어)

| | |
|---|---|
| **Reference** | 스캔 → 발견 → 매칭 → **실행** → 정산 |
| **Existing Contract** | AI 스캔 → 기회 발견 → 참여 매칭 → 진행 → 정산 완료 |

| 판정 | |
|---|---|
| **채택** | 기존 Contract 5단 (§3.2) |
| **폐기** | Reference 5단 용어·「실행」 복원 |
| **참고만** | 타임라인의 수평 rhythm / 단계 간격 |

숫자(4 vs 5)보다 **역할 정의·용어**가 충돌의 본질이다.

---

### C08 — IA

| | |
|---|---|
| **Reference** | 홈 · 수익 · **내거래** · 지갑 · 내정보 |
| **Existing Contract** | 홈 · **기회** · 수익 · 지갑 · 내정보 |

| 판정 | |
|---|---|
| **채택** | 현재 IA Contract (`기회` ✅) |
| **폐기** | `내거래` ❌ |
| **재논쟁** | 금지 (이미 잠김) |

---

### C09 — PayPal (Partner)

| | |
|---|---|
| **Reference** | eBay · Amazon · Yahoo · **PayPal** |
| **Brand Kit** | `markets/*.svg` · **PayPal 자산 없음** |

| 판정 | |
|---|---|
| **채택** | 현재 승인된 Partner assets만 |
| **폐기** | Reference에 있다고 Brand에 없는 자산 **무단 추가** |
| **열림** | PayPal 등 추가 = Founder/Brand 결정 후에만 |

---

### C10 — VIP 2

| | |
|---|---|
| **Reference** | VIP 2 |
| **Backend Fact** | `tierLabel` = null (Home에 등급 Fact 없음) |

| 판정 | |
|---|---|
| **채택** | Fact 있을 때만 tier 표시 (기존 Contract와 동일) |
| **폐기** | 목업 숫자 `2` 복사 · Fact 없는 VIP 배지 |
| **표시** | Fact 없음 → **숨김** |

---

## 5. Master Decision Matrix

| 충돌 | 최종 선택 |
|---|---|
| `ledgerTotal` vs 누적 USDT | **오늘 정산 건수**로만 취급 |
| 목업 누적 `8,745.32 USDT` | ❌ |
| 30일 차트 | ❌ |
| `+12.34%` | ❌ |
| 사용가능 / 참여중 | ❌ 현재 Home Fact 없음 |
| 도넛 `12` | ❌ |
| scan / confirm / progress 숫자 | ❌ |
| settlement count | ✅ 실제 Fact |
| `principalUsdt` | ✅ 실제 Fact |
| today possible profit | ✅ 기존 derived Fact |
| TOP3 | ✅ feed 파생 |
| VIP 2 | ❌ |
| 실시간 AI FSM | ❌ |
| 내거래 | ❌ |
| 기회 | ✅ |
| Hero 5단 Reference 복제 | ❌ |
| 기존 Hero timeline 계약 | ✅ |
| PayPal | ❌ Brand 없으면 추가 안 함 |
| PART9 fetch / SDK / mapper | 🔒 |
| Auth / JWT | 🔒 |
| API / DB / Ledger | 🔒 |
| `HomePageV2` | ❌ |

---

## 6. Fact Allowlist (Home Surface · STEP 3 입력)

Home에 **표시 허용**인 Fact만 열거. 목록 밖 = 금지.

| Fact | Source (개념) | UI 의미 |
|---|---|---|
| `principalUsdt` | opportunities / wallet buckets SoT | 내 잔액 경험 |
| today possible profit | 기존 derived aggregate | 오늘 가능한 수익 경험 |
| opportunity feed / TOP subset | opportunities feed | 카드 · TOP |
| `settlementCompletedToday` | DayPulse | 오늘 정산 완료 건수 |
| `ledgerTotal` | growth public-surface | **정산 완료 건수** (USDT 아님) |
| DayPulse presentation fields | DayPulse | Header 쉬운말 현황 (가짜 live 금지) |
| Partner logos | Brand Kit `markets/*` ready only | trust strip |
| `tierLabel` | membership Fact | **null이면 숨김** |

**명시적 Forbidden (Home):**

- 누적 USDT 수익 슬롯 (Fact 부재)
- `lockedUsdt` / `profitUsdt` Home 분할 (사용가능/참여중)
- 30-day series · growth %
- scan / confirm / progress counts
- 도넛 “진행 중 N”
- VIP 숫자 without Fact
- PayPal without Brand
- AI live scanning state

---

## 7. Visual-Only Adopt List (Reference → geometry)

Fact claim 없이 **모양만** 가져갈 수 있는 것:

| Adopt | Reject |
|---|---|
| Desktop shell 3-column rhythm | Mock numbers |
| Sidebar / Main / RightRail 밀도감 | Fake chart data |
| Hero illustration 위치·무게감 (Contract 한도 내) | 「실시간 스캔」상태 카피 |
| Money 카드 비율·여백 | 사용가능/참여중 구조 |
| RightRail 블록 간격 | 도넛·단계 카운트 풀세트 |
| Partner strip 정렬감 | 미승인 로고 |
| Light + Purple 분위기 (기존 Theme lock과 정합) | Lux Dark 복귀 · 픽셀 복제 |

---

## 8. STEP 3 Handoff (무엇을 써야 하는가)

STEP 3 = **Visual Implementation Contract v1** (구현 코드 아님).

반드시 반영할 갱신 포인트:

1. **C01 P0:** `ledgerTotal` 의미·표시 규칙 (건수 · USDT 접미사 금지)
2. **C02:** Money = `principalUsdt` only · 사용가능/참여중 구조 금지
3. **C03:** 30일 차트 / growth % Forbidden 명시
4. **C04:** RightRail Fact allowlist만 · scan/confirm/progress 슬롯 제거/숨김
5. **C05:** Header = DayPulse Fact · 실시간 AI FSM claim 금지
6. **C06–C07:** Hero copy + 5단 timeline = 기존 Contract 승
7. **C08:** IA 5탭 재확인
8. **C09–C10:** Partner Brand-only · tier null 숨김
9. **Mobile:** UNKNOWN 유지 · 모바일 확정 절은 Reference 입력 후
10. **Protected:** PART9 / SDK / mapper / Auth 경계 재기재

**STEP 3에서 하지 말 것:** React/CSS 구현 · Token hex 확정 강행 · ADR 번호 재발급 전제 구현 · R1 401 실측 강행

---

## 9. Out of Scope / Deferred

| Item | 처리 |
|---|---|
| Runtime 401 브라우저 실측 (R1) | API 기동 후 Runtime Verification |
| Mobile Reference geometry | Founder 모바일 레퍼런스 제공 후 STEP 1b / Contract 모바일 절 |
| PayPal 등 Brand 추가 | Founder/Brand 결정 |
| Home에 locked/profit 분할 Fact | API/DTO 계약 변경 필요 시 **별 트랙** (PART9 아님 · Money/API 소유) |
| 누적 USDT 수익 Home 슬롯 | 전용 aggregate Fact 설계 후 (현시점 ❌) |

---

## 10. Acceptance (본 문서 done)

- [x] C01–C10 각각 Adopt / Reject / Visual-only 결정
- [x] Authority ladder 고정
- [x] Fact Allowlist / Forbidden 고정
- [x] PART9 보호 경계 재확인
- [x] IA · Hero timeline 기존 Contract 승 재확인
- [x] STEP 3 handoff 목록 명시
- [x] Founder ack (2026-08-10 · Conflicts LOCKED)

**Founder ack 후 다음 산출물 파일명(권장):**  
`packages/ui/canon/contracts/peotteok-home-visual-implementation-contract.v1.md`  
(= STEP 3 · 기존 `peotteok-home-visual-contract.v1`를 대체·개정하는 Implementation Contract)

---

## 11. One-line Verdict

> Reference의 **모양**은 쓰되, Reference의 **숫자·상태·IA·용어**는 Backend Fact와 기존 Product/Visual Contract가 이긴다.  
> 최우선 신규 결함은 **`ledgerTotal`을 USDT로 보이게 하는 표시**이며, STEP 3 Contract에서 먼저 잠근 뒤 구현한다.
