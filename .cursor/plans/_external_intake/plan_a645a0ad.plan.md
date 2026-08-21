---
name: Plan
overview: 퍼뜩 AI Coach의 대화 상태(F1)·도메인 라우팅 커버리지(F2/F3)·G레인 스코프 가드(F4)·P레인 숫자 그라운딩·Shadow Replay 네이밍(F5)·SDK credentials 정합(F14)을 P/G/S 레인과 5-provider adapter 아키텍처를 그대로 둔 채 좁게 보강하는 설계입니다.
todos:
  - id: conv-state
    content: Redis 기반 conversation working state(userId+conversationId 바인딩 키, config-driven TTL), conversationId API/SDK 계약(additive), bounded history를 buildCoachMessages에 주입, chat-sse.ts credentials include 정합화(F14)
    status: completed
  - id: reference-resolution
    content: resultRef 구조적 참조 해석기(reference-resolver, hint only + Fact tool 재조회 시 user_id 소유권 재검증), 정규화된 preference fact만 승격하는 좁은 memory 승격 경로(ai_memory append 최초 연결, raw 발화 비저장)
    status: completed
  - id: routing-coverage
    content: P_PATTERNS 및 EXECUTION_PATTERNS 보강, defaultToolsForText에 getExecution 도달 경로 추가, eval p_fact jsonl 확장 + tools_called 실검증 (F2+F3)
    status: completed
  - id: scope-guard
    content: G레인 입력 스코프 필터, 출력 잔차 가드, scope_redirect answer_path 신설, eval g_scope_escape jsonl 신설, residual risk 명시 (F4)
    status: completed
  - id: numeric-grounding
    content: post-hoc numeric-grounding.cjs 게이트(platform-relevant date 포함, bare quantity 오탐 방지, provenance 태그 필수), guardAnswer 통합(신규 guard status), CoachOrchestrator fallback 연결, eval 추가
    status: completed
  - id: shadow-replay-naming
    content: Shadow Replay에 실제 동작을 반영하는 advisory 라벨을 additive로 추가(기존 FAIL_ACTION/settlementBlocked breaking rename 금지), 신규 DB 컬럼 additive migration, verify shadow-replay-drift.cjs에 신규 assertion 추가, Admin copy pointer만 기록 (F5, scope=naming only, backend/Admin 호환성 유지)
    status: completed
isProject: false
---

# PEOTTEOK AI COACH — Conversation / Scope / Grounding Hardening V1

## 승인 상태 (Approval Status)

**ARCHITECTURE DIRECTION APPROVED / DOCKED → [.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md](.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md) §47.16으로 도킹 완료(2026-08-12). 이 파일은 작업용 초안이며, 편집 SSOT는 이제 canonical Engine 플랜입니다.**

**CLOSED (2026-08-12):** 본 파일 YAML todos 6개(`conv-state`→`shadow-replay-naming`) = Engine 플랜과 동일하게 `completed`. 실행 큐·status 편집은 Engine만. 다음 File-Serial = 03 UI `redesign-r1-home-truth-preflight`.

TTL 확정값: `aiConvStateTtlSec=3600` · `aiConvStateAbsoluteLifetimeSec=43200`(12h, sliding 갱신 상한). 도킹 당시 큐 순서(이력): 기존 2개(`engine-ebay-identity-match-ingest`, `redesign-r1-home-fact-state-contract`) 뒤 File-Serial — 둘 다 Engine에서 completed.

구현(슬라이스 착수) 전 반드시 잠가야 했던 5개 계약과 반영 위치:

1. Conversation state의 user ownership + TTL contract — §1 "Ownership / Security Contract" 신설
2. Durable memory에는 raw 발화가 아니라 정규화된 preference fact만 승격 — §1 "데이터 모델" 갱신
3. Numeric grounding에서 authoritative date/time도 검증 대상에 포함 + bare quantity 오탐 방지 — §4 전면 갱신
4. Scope guard의 residual risk 명시(완전 차단 선언 금지) — §3 "보증 범위" 신설
5. Shadow Replay backend/Admin 호환성 계약(breaking rename 금지, additive만) — §5 전면 갱신

이 5개가 반영된 이후에는 6개 슬라이스를 File-Serial로 순차 구현 승인할 수 있는 상태입니다. Provider 구조·P/G/S 골격 재설계는 여전히 범위 밖입니다.

---

## 0. 범위 원칙 (Freeze)

**절대 건드리지 않음 (감사에서 GOOD_AS_IS로 확정된 자산):**
- P/G/S 레인 골격 자체 ([services/ai-platform/src/assistant-router.cjs](services/ai-platform/src/assistant-router.cjs)의 레인 정의)
- 5-provider adapter 구조 및 계약 ([services/ai-platform/src/llm-adapter.cjs](services/ai-platform/src/llm-adapter.cjs), `llm-adapters/*.cjs`) — 구조화 출력(JSON) 강제 없음, provider별 파싱 로직 추가 없음
- Fact Tool read-only 카탈로그, Twin-Money 분리, Settlement/Ledger 격리, AI PICK/Feature Platform 결정론
- 기존 공개 API 계약 — `conversationId`는 **추가적(additive) optional 필드**로만 확장, 기존 클라이언트 breaking 없음

**이번 V1에 포함:**
- F1 대화 상태(conversationId + working state + reference resolution + 좁은 memory 승격)
- F2/F3 라우팅 커버리지(`지갑`/`진행 상태`/`안전중단` 등 + `getExecution` 도달)
- F4 G레인 스코프 가드
- P레인 `llm_p` 숫자 post-hoc 그라운딩
- F5 Shadow Replay naming/contract 완화(offline eval로 확정, 실제 gate 배선 제외)
- F14 `chat-sse.ts` credentials 일관화

**명시적으로 이번 V1 범위 밖(백로그, 별도 라운드):**
- 페르소나 긍정 지시 보강, per-user rate limit, Redis quota fail-open 정책, provider parity eval, latency/token observability, 구조화 출력(JSON) 강제, Shadow Replay 실제 settlement gate 배선(별도 PO 트랙)

---

## 1. Conversation State Architecture (F1)

### 문제
[services/ai-platform/src/coach-prompt.cjs](services/ai-platform/src/coach-prompt.cjs) `buildCoachMessages()`는 항상 `[system, user]` 2개 메시지만 반환하고, [services/api-nest/src/ai/coach.orchestrator.ts](services/api-nest/src/ai/coach.orchestrator.ts)는 `memory.listRecent()`만 호출하며 `memory.append()`를 어디서도 호출하지 않습니다. `conversationId` 개념이 [packages/sdk/src/peotteok/types.ts](packages/sdk/src/peotteok/types.ts)에 없습니다.

### 데이터 모델 — Working State (Redis, 세션 범위) vs Durable Memory (PG, 영구)

Working state는 대화 진행 중에만 필요한 휘발성 상태입니다. Redis에 config-driven TTL로 저장하고, PG `ai_memory`로 승격하지 않습니다.

Working state JSON (신규, Redis 저장):
- `conversationId`, `userId`, `createdAt`, `lastTurnAt`
- `turns`: 최근 N=6~8개 턴만, 각 턴 `{role, text(최대 300자로 truncate), lane, at}` — 무한 성장 금지, sliding window
- `resultRefs`: 마지막 P레인 Fact 조회에서 나온 리스트형 결과에 대한 구조적 참조. 예: `{ id: "ref_1", type: "executions", ids: ["A","B","C"], createdAt }` — **authorization 토큰이 아니라 hint일 뿐**(아래 Ownership 계약 참조)

Durable memory(`ai_memory`, PG)는 **모든 턴을 append하지 않고, raw 사용자 발화도 그대로 저장하지 않습니다.** 좁은 트리거 + 정규화된 preference fact만 승격:
- 사용자가 명시적으로 선호를 선언하는 패턴(예: "짧게 설명해줘", "쉽게 알려줘", "다음에도 이렇게" 등 작은 allowlist 매칭)일 때만, 매칭된 원문 문장을 저장하는 대신 **정규화된 key/value preference fact**로 변환해 저장. 예: `preference.explanation_length = "short"`, `preference.explanation_complexity = "simple"`. `content`는 서버가 생성한 고정 한국어 요약 문구(템플릿), `metadata`는 `{ preferenceKey, value, detectedFromPattern }` 구조.
- 승격 직전에도 기존 `assertNoMemoryMoneyKeys()`(머니 키 차단)를 재적용하고, 추가로 "허용된 preferenceKey enum에 속하지 않으면 저장 자체를 하지 않는다"는 화이트리스트 가드를 둡니다 — 이렇게 하면 "다음에도 이렇게 해줘, 그리고 내 잔액은…" 같은 문장이 승격 경로에 들어가도 실제로 저장되는 것은 `preferenceKey`/`value` enum 쌍뿐이며 원문 발화 자체가 durable storage에 닿을 방법이 없습니다.
- 세션 요약(summarization) 자동 승격은 V1 범위 밖(백로그)

### Ownership / Security Contract (필수 잠금 — 구현 전 확정)

1. **Redis key는 userId + conversationId에 바인딩**: `ai:conv:${userId}:${conversationId}` 형태로, `userId`는 항상 JWT에서 유도된 서버 신뢰값이며 클라이언트가 보낸 `conversationId`만으로는 타인의 state를 조회할 수 없는 구조로 강제합니다.
2. **로드 시 재검증**: state를 불러온 뒤 `state.userId !== req.user.userId`(JWT)이면 **fail-closed** — 즉 해당 state를 사용하지 않고 새 conversation을 시작한 것처럼 처리하며, 원인을 노출하는 에러 메시지를 클라이언트에 보내지 않습니다.
3. **resultRef는 힌트일 뿐, authorization이 아님**: 지시어 해석으로 얻은 id(예: `A`)로 `getExecution(id=A)`를 호출할 때도 [services/api-nest/src/ai/fact-tool.service.ts](services/api-nest/src/ai/fact-tool.service.ts)의 기존 `WHERE user_id = $1::uuid` 스코프를 그대로 유지하고 `AND id = $2`를 추가하는 형태로 구현 — id 파라미터가 추가되어도 소유권 검증이 약화되지 않아야 합니다. resultRef에 담긴 id가 실제로는 다른 사용자의 것이라 해도(이론상 발생하지 않아야 하지만) 이 재검증이 최종 방어선입니다.
4. **TTL은 config-driven + bounded, 하드코딩 금지 — PO 확정값(2026-08-12)**: `services/api-nest/src/config/phase0.env.ts`에 신규 키 `aiConvStateTtlSec`(sliding TTL, 기본 **3600초** — 이 저장소의 `TWIN_REDIS_TTL_SEC=3600` 관례와 동일선상) + `aiConvStateAbsoluteLifetimeSec`(**43200초=12시간**, sliding 갱신이 있어도 `createdAt + 12h`를 넘겨 연장 금지)을 추가하고 `.env.example`에 문서화.

### Reference Resolution

지시어("그중", "첫 번째", "방금 그거") 매칭 시, 살아있는(TTL 내) `resultRefs`가 있으면 LLM에게 다시 물어보지 않고 서버가 직접 `getExecution(id=resolved)` 같은 targeted Fact 재조회로 해석합니다 — LLM 기억력에 의존하지 않는 code-enforced grounding이며, 위 Ownership 계약(3번)에 따라 재조회 시에도 소유권이 재검증됩니다.

### 시퀀스 (제안)

```mermaid
sequenceDiagram
  participant Web as WebPeotteok
  participant API as CoachController
  participant Orch as CoachOrchestrator
  participant ConvState as ConversationStateService
  participant Facts as FactToolService

  Web->>API: "POST chat turn1 no conversationId"
  API->>Orch: text turn1
  Orch->>ConvState: "create conversationId cid1"
  Orch->>Facts: "getExecution"
  Facts-->>Orch: "executions A B C"
  Orch->>ConvState: "save resultRef type=executions ids=A,B,C"
  Orch-->>Web: "done conversation_id=cid1"

  Web->>API: "POST chat turn2 conversationId=cid1 text=그중 첫번째는 언제 끝나"
  API->>Orch: "text turn2 plus cid1"
  Orch->>ConvState: "load resultRef for cid1"
  ConvState-->>Orch: "resultRef ids=A,B,C"
  Orch->>Facts: "getExecution id=A"
  Facts-->>Orch: "executionA detail"
  Orch-->>Web: "done answer about A"
```

### 계약 변경 (additive)
- Request body: `conversationId?: string` 추가
- SSE `meta`/`done` 이벤트: `conversation_id` 필드 추가
- [packages/sdk/src/peotteok/types.ts](packages/sdk/src/peotteok/types.ts), [packages/sdk/src/peotteok/chat-sse.ts](packages/sdk/src/peotteok/chat-sse.ts), [packages/sdk/src/peotteok/usePeotteokChat.ts](packages/sdk/src/peotteok/usePeotteokChat.ts) — hook 상태에 `conversationId` 보관, 다음 `send()`에 포함
- `conversationId` 미전달 시 서버가 새로 발급 — 기존 stateless 동작으로 자연 degrade(하위호환)

### buildCoachMessages 확장
`history?: Array<{role, content}>` 파라미터 추가, `[system, ...history(최근 N턴, 총 문자수 캡), user]` 형태로 조립. 캡 초과 시 오래된 턴부터 드롭(무한 성장 방지 — 기존 §N "BOUNDED" 원칙 유지).

### F14 bundle
같은 파일([packages/sdk/src/peotteok/chat-sse.ts](packages/sdk/src/peotteok/chat-sse.ts))을 이번에 다루므로, sibling SDK 모듈([packages/sdk/src/wallet/fetch.ts](packages/sdk/src/wallet/fetch.ts) 등)과 동일하게 두 `fetch()` 호출에 `credentials: "include"`를 추가해 repo-local 관례에 정합화합니다.

### 영향 파일(신규 포함)
- [services/api-nest/src/ai/coach.orchestrator.ts](services/api-nest/src/ai/coach.orchestrator.ts), [services/api-nest/src/ai/coach.controller.ts](services/api-nest/src/ai/coach.controller.ts)
- 신규: `services/api-nest/src/ai/conversation-state.service.ts` (Redis 기반, [services/api-nest/src/redis/upstash.ts](services/api-nest/src/redis/upstash.ts) 재사용)
- 신규: `services/ai-platform/src/reference-resolver.cjs` (순수함수, 지시어 매칭 + resultRef 해석)
- [services/ai-platform/src/coach-prompt.cjs](services/ai-platform/src/coach-prompt.cjs), [services/api-nest/src/ai/memory.service.ts](services/api-nest/src/ai/memory.service.ts)(좁은 승격 호출 추가), [services/api-nest/src/ai/fact-tool.service.ts](services/api-nest/src/ai/fact-tool.service.ts)(id 필터 인자 추가)
- [packages/sdk/src/peotteok/types.ts](packages/sdk/src/peotteok/types.ts), [packages/sdk/src/peotteok/chat-sse.ts](packages/sdk/src/peotteok/chat-sse.ts), [packages/sdk/src/peotteok/usePeotteokChat.ts](packages/sdk/src/peotteok/usePeotteokChat.ts)
- 신규 schema 후보: `schemas/conversation-state.v1.json`(기존 `schemas/fact-card.v1.json` 패턴과 정합)
- 신규 verify 후보: `tooling/verify/conversation-state-bounded.cjs`(history 캡·durable memory 비오염 검증)

---

## 2. Domain Routing Coverage (F2 + F3)

### 문제
[services/ai-platform/src/assistant-router.cjs](services/ai-platform/src/assistant-router.cjs)의 `P_PATTERNS`가 "지갑"/"진행 상태"/"안전중단"을 매칭하지 않아 G레인으로 오분류되고, `defaultToolsForText()`의 어떤 분기도 `getExecution`을 반환하지 않아 이 tool이 자동 라우팅에서 영원히 도달 불가능합니다.

### 보강안
- `P_PATTERNS`에 `/지갑/` 추가
- 신규 `EXECUTION_PATTERNS`(예: `/진행\s*상태/`, `/안전\s*중단/`, `/중단\s*(된|됐)/`, `/매칭\s*상태/`, `/거래\s*상태/`, `/체결/`, `/참여\s*(한|중인)\s*거래/`)를 `classifyLane`에서 P로 판정하도록 결합
- `defaultToolsForText()`에 위 패턴 매칭 시 `["getExecution"]`을 반환하는 분기를 마지막 fallback(`getOpportunity`) 이전에 추가
- `routeAssistant`의 G→P 재라우트 정규식(`/잔액|예상\s*수익|balanceUsdt|호가/i`)에도 실행/지갑 동의어 보강

### Eval 확장
[eval/p_fact.jsonl](eval/p_fact.jsonl)에 "지금 거래 진행 상태가 어떻게 돼?", "안전중단된 이유 알려줘", "내 지갑 상태 알려줘" 3개 케이스 추가. 단순히 `lane==="P"`만 확인하는 것으로는 부족합니다 — `expectToolsAny:["getExecution"]`을 명시하고, [tooling/verify/ai-lane-router.cjs](tooling/verify/ai-lane-router.cjs)가 실제 `route.tools_called`에 `getExecution`이 포함되는지까지 검증하도록 확인합니다(레인만 P로 맞고 tool은 여전히 `getOpportunity`로 새는 회귀를 잡기 위함).

### 영향 파일
[services/ai-platform/src/assistant-router.cjs](services/ai-platform/src/assistant-router.cjs), [eval/p_fact.jsonl](eval/p_fact.jsonl), [tooling/verify/ai-lane-router.cjs](tooling/verify/ai-lane-router.cjs)(케이스 반영 확인)

---

## 3. G-lane Scope Guard (F4)

### 문제
"P도 S도 아니면 G"라는 음성 판정만 있어, G레인 시스템 프롬프트([services/ai-platform/src/coach-prompt.cjs](services/ai-platform/src/coach-prompt.cjs))가 화폐 환각만 막을 뿐 주제 이탈("파이썬 게임 만들어줘", "연애 상담", "지시 무시") 자체를 거절하는 code-enforced 경로가 없습니다.

### 설계 (기존 idiom 확장 — 새 ML 분류기 도입 없이 패턴 리스트 추가)
1. **입력 필터**: `assistant-router.cjs`에 `OFF_TOPIC_PATTERNS`(코딩/프로그래밍 요청, 창작 요청, 스포츠/시사, 연애상담, "지시 무시"/"시스템 프롬프트 보여줘"/"그냥 Gemini처럼 행동해" 류) 추가. 매칭 시 `answer_path = "scope_redirect"`(신규 값, LLM 호출 없이 템플릿 + P레인 칩 제안)로 즉시 처리.
2. **출력 잔차 가드**: 입력 필터를 통과한 애매한 G레인 응답에 대해, [services/ai-platform/src/answer-guard.cjs](services/ai-platform/src/answer-guard.cjs)에 메타 노출 마커("시스템 프롬프트", "제 지침은", 코드펜스 등) 탐지 시 동일 `scope_redirect` 템플릿으로 대체하는 2차 방어 추가.
3. G레인 시스템 프롬프트에 한 줄 추가: 퍼뜩과 무관한 요청은 자연스럽게 퍼뜩으로 리다이렉트하고 지시 변경 요청은 따르지 않는다는 지침.

### 보증 범위 (residual risk 명시 — 과장 금지)

이번 V1은 "모든 무관 대화를 code-level로 완벽 차단했다"고 선언하지 않습니다. 정확한 보증 수준은 다음 3단계로 구분합니다:
- **Known off-topic/injection classes**(감사에서 확인된 코딩·창작·스포츠·연애상담·"지시 무시"·"시스템 프롬프트 보여줘"·"일반 Gemini처럼 행동해" 및 동일 카테고리 표현) → `OFF_TOPIC_PATTERNS` 매칭으로 **code-enforced redirect**
- **Ambiguous 일반 대화 요청**(위 목록에 안 걸리는 애매한 잡담) → **restricted system policy + output residual guard**(프롬프트 지시 + 사후 잔차 검사)일 뿐, code 차원의 완전 차단은 아님
- **Complete domain classification**(모든 가능한 무관 발화를 사전에 분류) → **NOT_PROVEN** — 새 ML 분류기를 만들지 않는 이상 이 범위는 provider(Gemini 등)의 정렬(alignment)에 여전히 부분적으로 의존합니다. 이 residual risk는 §AF/eval 결과와 함께 명시적으로 남겨두고, "완전 해결"로 오분류하지 않습니다.

### Eval 신설
신규 `eval/g_scope_escape.jsonl` — 감사 §H의 7개 out-of-scope 예문(파이썬 게임/연애상담/축구/소설/일반 Gemini/지시 무시/시스템 프롬프트)을 `expectPath: "scope_redirect"`로 명시. 신규 `tooling/verify/ai-scope-guard.cjs`가 [tooling/verify/ai-lane-router.cjs](tooling/verify/ai-lane-router.cjs)와 동일한 구조로 이를 검증.

### 영향 파일
[services/ai-platform/src/assistant-router.cjs](services/ai-platform/src/assistant-router.cjs), [services/ai-platform/src/coach-prompt.cjs](services/ai-platform/src/coach-prompt.cjs), [services/ai-platform/src/answer-guard.cjs](services/ai-platform/src/answer-guard.cjs), [services/ai-platform/src/coach-templates.cjs](services/ai-platform/src/coach-templates.cjs)(신규 템플릿), [services/api-nest/src/ai/coach.orchestrator.ts](services/api-nest/src/ai/coach.orchestrator.ts)

---

## 4. P-lane Numeric Response Integrity

### 문제
[services/ai-platform/src/answer-guard.cjs](services/ai-platform/src/answer-guard.cjs)의 `guardAnswer()`는 6개 금지 문구 블록리스트만 검사하고, `llm_p` 답변 속 숫자가 실제 `factsUsed` 값과 일치하는지는 검증하지 않습니다.

### 설계 — post-hoc numeric grounding (provider 계약 변경 0)

**V1 원칙(재정의):** *Post-hoc validation targets platform factual numeric claims, not every numeral appearing in prose.* 즉 "날짜/서수라서 무조건 제외"가 아니라 "이 숫자가 플랫폼 사실을 주장하는가"를 기준으로 검사 대상을 정합니다.

신규 순수함수 모듈 `services/ai-platform/src/numeric-grounding.cjs`:
- `extractNumericTokens(text)` — 후보 숫자를 유형별로 분류: `currency`(USDT/원 단위 동반), `percent`(%), `quantity`(건/개/회 등 단위 동반), `date`(날짜/시각 패턴), `ordinal`(첫/두 번째 등 순서 표현), `id_like`(영숫자 식별자), `generic`(단위 없는 bare 숫자)
- 분류별 처리 원칙:
  - `ordinal`(순서 표현 자체) → 검사 제외(숫자 그 자체가 아니라 순서를 가리킬 뿐)
  - `generic`(단위 없는 bare quantity, 예: "두 가지 이유") → 검사 제외 후보 — 단, "건/개/회" 등 단위가 붙고 실행·기회·혜택 domain 키워드와 인접한 경우는 `quantity`로 재분류해 검사 대상에 포함(단순 regex 숫자 매칭이 아니라 단위+문맥 결합 기준)
  - `date`(날짜/시각) → **더 이상 categorical exclude 하지 않음.** 현재 턴의 `factsUsed`에 날짜/시각 필드를 포함하는 fact(예: 실행 종료 예정, 캠페인 종료일, 정산 시각 등 `kind:"execution"` 류 또는 날짜 필드를 가진 payload)가 존재하면 그 날짜값을 allow set에 포함해 대조 대상으로 삼습니다. 반대로 해당 턴에 로드된 Fact가 애초에 날짜를 준 적이 없는데 답변이 날짜를 언급하면 — 그 날짜는 서버가 준 것이 아니므로 **`unsupported`로 판정**합니다("첫 번째 거래는 8월 19일에 끝나요" 같은 창작 날짜를 잡아내기 위함).
  - `currency`/`percent`/단위 결합 `quantity` → 항상 그라운딩 대상
- `buildAllowedNumberSet(factsUsed)` — `factsUsed[].payload`를 순회해 숫자값(금액·퍼센트·수량)과 날짜/시각 필드를 함께 정규화 수집. 한국어 표현 변형(`3.5`, `3.50`, `3.5 USDT`, `약 3.5`) 정규화 후 비교
- `buildServerDerivedAllowlist(context)` — 서버가 직접 계산해 주입한 값만 인정하며, 임의 계산값이 통로가 되지 않도록 각 항목은 반드시 `{ value, provenance: "server_derived", derivationId }` 형태로 **명시적 출처 태그**를 가져야 합니다. `derivationId`는 사전 정의된 화이트리스트(예: `"benefits.claimableCount"`, `"opportunity.count"`)에 속하는 것만 허용 — 태그 없는 값은 자동으로 허용 대상에서 제외.
- `checkNumericGrounding(answerText, factsUsed, opts)` — 위 기준으로 좁혀진 토큰만 허용집합과 대조(허용 오차 포함), 결과 `{status: "pass"|"unsupported_number", unsupported: [...]}`

### 통합
`answer-guard.cjs`에 `GUARD_STATUSES`를 확장해 `"ungrounded"` 상태 추가(레인=P, answerPath=`llm_p`일 때만 검사). [services/api-nest/src/ai/coach.orchestrator.ts](services/api-nest/src/ai/coach.orchestrator.ts)는 `ungrounded` 판정 시 LLM 문장을 폐기하고 기존 `renderFactAnswer(factsUsed)` 결정론적 템플릿으로 대체 — 이미 존재하는 `stale`/`refresh` 폴백과 동일한 idiom을 재사용합니다.

```mermaid
flowchart TD
  answerText["LLM answer text llm_p path"] --> extract["extractNumericTokens"]
  extract --> classify["classify currency percent quantity date ordinal idlike generic"]
  classify --> dropNonClaims["drop ordinal and unitless generic quantity"]
  dropNonClaims --> dateCheck["date token present"]
  dateCheck -->|"factsUsed has matching date field"| includeDate["treat as platform claim include in check set"]
  dateCheck -->|"no date fact in this turn"| dateUnsupported["date mention has no backing fact"]
  dropNonClaims --> allowSet["buildAllowedNumberSet factsUsed union serverDerivedAllowlist with provenance"]
  includeDate --> allowSet
  allowSet --> compare["compare currency percent quantity and grounded date tokens with tolerance"]
  compare -->|"all supported"| passPath["guard status pass keep LLM text"]
  compare -->|"unsupported number found"| fallbackPath["guard status ungrounded"]
  dateUnsupported --> fallbackPath
  fallbackPath --> renderFact["renderFactAnswer factsUsed deterministic template"]
```

### Eval
신규 케이스:
- fresh fact `profitUsdt=3.50` + 답변 "3.5 USDT" → pass
- 답변에 "평균 5% 더 나와요" 추가(fact에 없는 percent) → `ungrounded`
- 답변에 "두 가지 이유가 있어요"(unitless generic quantity) → 여전히 pass(오탐 방지 확인)
- `getExecution` fact에 종료 예정 시각이 없는데 답변이 "8월 19일에 끝나요"라고 언급 → **`ungrounded`**(날짜도 grounding 대상임을 검증하는 핵심 회귀 케이스)
- `getExecution` fact에 실제 종료 예정 시각이 있고 답변이 그 값을 그대로 인용 → pass

### 영향 파일
신규 `services/ai-platform/src/numeric-grounding.cjs`, [services/ai-platform/src/answer-guard.cjs](services/ai-platform/src/answer-guard.cjs), [services/ai-platform/src/ai-log.cjs](services/ai-platform/src/ai-log.cjs)(`GUARD_STATUSES` 확장), [services/api-nest/src/ai/coach.orchestrator.ts](services/api-nest/src/ai/coach.orchestrator.ts), 신규 `tooling/verify/numeric-grounding.cjs`

---

## 5. Shadow Replay Naming/Contract Correction (F5, scope=naming only)

### 잠긴 결정
Offline eval 유지. 실제 settlement gate 배선은 이번 V1에서 하지 않음(별도 PO 트랙). `replaySettlementGoldens()`가 [services/shadow-replay-engine/src/replay.cjs](services/shadow-replay-engine/src/replay.cjs)에 존재하지만 [services/api-nest/src/ai/shadow-replay.admin.service.ts](services/api-nest/src/ai/shadow-replay.admin.service.ts)가 호출하지 않는다는 사실이 "지금 실질 범위=AI PICK 오프라인 평가"를 뒷받침합니다.

### 호환성 계약 (필수 잠금 — breaking rename 금지)

"Admin pointer only(이번 Engine 작업에서는 Admin 코드를 직접 수정하지 않음)"와 "backend 필드를 바로 rename한다"는 동시에 성립할 수 없습니다 — Admin이 현재 `settlementBlocked`를 소비하고 있다면 그 필드를 지우거나 이름을 바꾸는 순간 contract break입니다. 따라서 이번 V1은 **additive-only**로 좁힙니다:

- [services/shadow-replay-engine/src/drift.cjs](services/shadow-replay-engine/src/drift.cjs) — 기존 `FAIL_ACTION = "block_settlement"` 상수와 문자열 값은 **그대로 유지**. 실제 동작을 정확히 표현하는 신규 상수(예: `ADVISORY_LABEL = "advisory_only"`)를 **추가**만 함.
- [services/api-nest/src/ai/shadow-replay.admin.service.ts](services/api-nest/src/ai/shadow-replay.admin.service.ts) — 기존 `settlementBlocked` 필드는 **제거/rename하지 않고 유지**(하위호환 alias). 응답에 신규 필드(예: `driftAdvisoryOnly: true`, `contractLabel: "ai_pick_offline_eval"`)를 **additive**로 추가해 "이 값은 조언용이며 실제 정산을 막지 않는다"는 것을 신규 소비자가 명확히 알 수 있게 함.
- DB: 기존 `shadow_replay_runs.fail_action` 컬럼과 CHECK 제약(`supabase/migrations/20260809103208_ai_feature_platform_pick_eval_shadow.sql`)은 **수정하지 않음**. 신규 migration에서는 CHECK 제약을 느슨하게 풀거나 값을 바꾸는 대신, **새 컬럼**(예: `advisory_note text` 또는 `contract_label text DEFAULT 'ai_pick_offline_eval'`, nullable/기본값만)을 추가하는 additive 방식으로 한정 — 기존 값을 건드리지 않으므로 backfill도 불필요.
- [tooling/verify/shadow-replay-drift.cjs](tooling/verify/shadow-replay-drift.cjs) — 기존 assertion(예: `eng.FAIL_ACTION !== "block_settlement"` FAIL 판정)은 **그대로 유지**하고, 신규 상수/필드에 대한 assertion을 **추가**만 함(기존 검증을 약화·삭제하지 않음).
- Admin 표면 문구(`packages/ui/canon/surfaces/admin-ledger-shadow-replay.wire.json`, `apps/admin/app/admin/ledger/page.tsx`) — **04 Admin 도메인 소관**. 이번 Engine 작업은 신규 additive 필드가 존재한다는 pointer만 남기고, Admin이 "정산 차단" 톤 문구를 신규 필드로 갈아타는 시점과 데드라인은 04 Admin 트랙에서 별도로 결정(강제 마이그레이션 데드라인 없음 — 필드가 additive이므로 Admin이 준비됐을 때 채택 가능).
- 계획/문서(`.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md` §47/§48.13, `tooling/verify/CATALOG.md`) — 과거 서술을 **덮어쓰지 않고**, "현재 계약은 §47.16에서 additive하게 superseded"라는 pointer만 추가.

---

## 6. 시퀀싱 / Todo 매핑

이 저장소의 File-Serial 관례(한 todo = 기능+wire+verify 한 덩어리)에 맞춰 6개 슬라이스로 나눕니다. 각 슬라이스 완료 기준은 해당 신규 verify PASS **+ [tooling/verify/CATALOG.md](tooling/verify/CATALOG.md) 기준 현행 AI verify catalog 전체 재실행 PASS 유지**(회귀 없음)입니다 — 슬라이스가 진행되며 verify 스크립트 자체가 늘어나므로 "13개"처럼 특정 개수로 고정 표기하지 않습니다.

1. `conv-state` — Redis working state + `conversationId` API/SDK 계약(additive) + bounded history 주입 + F14 `credentials:"include"` 정합화
2. `reference-resolution` — resultRef 해석기 + 좁은 allowlist 기반 memory 승격(`ai_memory.append` 최초 연결)
3. `routing-coverage` — F2/F3: 패턴 보강 + `getExecution` 도달 경로 + eval 확장
4. `scope-guard` — F4: 입력 필터 + 출력 잔차 가드 + `scope_redirect` + eval 신설
5. `numeric-grounding` — post-hoc 숫자 그라운딩 모듈 + guard 통합 + fallback + eval
6. `shadow-replay-naming` — F5 naming/contract 완화 + migration + verify 갱신 + Admin pointer만 기록

각 todo는 이번 세션들에서 **구현하지 않고**, 승인 시 [.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md](.cursor/plans/ai_profit_os_02_engine_b2c3d4e5.plan.md)의 §47 다음 절(예: §47.16)로 옮겨 File-Serial 순서대로 착수하는 것을 전제로 합니다.

