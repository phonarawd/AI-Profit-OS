# §47 — Personal AI · User Twin · 퍼뜩 P/G/S

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** Engine §47 (+ §47.12~14)

## Owns

| 주제 | 잠금 |
|------|------|
| 유저 AI 이름 | **퍼뜩** (앱명과 동일) · 타프로젝트 코치 브랜드명 **금지** |
| 레이어 성격 | 머니·시세·원장·상품 엔진 **비파괴 부착** · 대체 0 |
| **P 레인** | 플랫폼 Fact tools · Template · Help RAG · LLM은 **문장화만** · 숫자 추정 0 |
| **G 레인** | 일상 LLM · `tools=[]` · money/잔액 추정 0 · 플랫폼 숫자 언급 시 **P 재라우트** |
| **S 레인** | 출금·지급·한도·circuit **실행 0** · refuse 템플릿 + UI deep-link only |
| Twin ≠ Fact | Twin=성향·이력 · Fact=현재 숫자(답변 직전 재조회) · Twin으로 balance/호가 **금지** |
| Fact freshness | expired/low confidence → 재조회 · 실패 시 추정 숫자 **금지** |
| Answer trace | 답변마다 `lane` · facts · tools · `provider_id` · path 저장 (Admin 1클릭) |
| DB SoT (§47.9) | Ledger+AI = **단일 PostgreSQL** · Redis=hot Twin/session · pgvector Day-1 · Qdrant later **병행 0** |
| GitHub | 코드·prompts·rules만 · PII·대화원문·학습셋 **0** |
| 학습 | 저장 ≠ 학습 · 자동 Prod 학습/배포 **OFF** · Eval Gate PASS만 Registry |
| LLM Adapter (§47.13) | Day-1 클라우드=`gemini_free` · → openai 교체 · 데이터층 불변 · 자동 multi-provider failover **0** |
| Degrade | 429/쿼터 → `provider_id=none` · P=Fact 유지 · G=`PEOTTEOK_LLM_BUSY` |
| Intent 라우터 (§47.14) | User → P\|G\|S 고정 파이프라인 · S면 tool execute 카탈로그 **0** |
| 제안 루프 | 입금→practice→미션→출금안내→초대/이벤트→CS (칩=P · 자유입력=라우터) |
| Admin | `/admin/ai-logs?tab=coach` · 톱레벨 13번째 모듈 **금지** |

## Pointer

| 교차 | SSOT |
|------|------|
| Engine §47 본문 · tools · ENV | Engine `ai_profit_os_02_engine_b2c3d4e5.plan.md` §47 |
| 유저 채팅 surface | UI `/me/peotteok` · Canon `peotteok-chat` |
| toneBand · fontScale | UI §38.9 · → `50` |
| 버킷·출금 안내 Fact | → `49` · Money §49 |
| Referral Fact | → `51r` · Money §51.5 |
| Auth | Nest JWT only · ADR-006 · Supabase Auth **0** |
| schemas (todo) | twin/fact/answer-trace per Engine §47 |
| CI | `verify:ai-coach-fact-only` · `verify:ai-general-no-money-tools` · `verify:ai-lane-router` · `verify:llm-adapter-contract` · `verify:llm-quota-degrade` · `verify:twin-fact-separation` · `verify:answer-trace` · `verify:single-postgres` · `verify:no-ai-data-in-git` |

## Forbidden

- AI가 출금·지급·한도·circuit 승인/실행
- Twin 캐시로 잔액·호가 답변 · G레인 플랫폼 숫자 추정
- “모든 질문 완벽/오류0” · 투자 원금 보장 · 실체결·외부 입찰 암시
- 성별 맞춤 멘트 · 미구현 vertical 환각
- 두 번째 Postgres/Supabase를 AI SoT로 추가
- GitHub에 대화/PII/학습셋 · 웹/`NEXT_PUBLIC_*`에 LLM 키
- 구현 서비스 코드를 본 파일에 복제
