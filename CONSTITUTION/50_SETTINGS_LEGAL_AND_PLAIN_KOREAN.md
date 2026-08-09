# §50 — Settings · Legal · Plain Korean · Operator DET

> **Status:** ACTIVE · owns/pointer only · 구현코드 0  
> **BOOTSTRAP:** `docs/CONSTITUTION_BOOTSTRAP.md` §2  
> **Maps to:** UI §50 (+ §50.9)

## Owns

| 주제 | 잠금 |
|------|------|
| 설정 IA | `/me/settings` · 글자·톤·충전탭·알림·약관 링크 |
| fontScale | **md / lg / xl** 3단 필수 (보통/크게/더 크게) |
| 테마 | **Lux 다크 고정** · 다크/밝은/시스템 토글 **v1 0** |
| toneBand | 설정에서 변경 가능 · 성별 UI 분기 **금지** |
| depositPref | `usdt\|krw` **표시 기본만** · 엔진 추천 USDT 불변 |
| 알림 기본 (§50.1n) | 가입 시 notificationPrefs **전부 ON** · OFF=Push 스킵 |
| 약관 4종 | 이용약관 · 개인정보 · 오픈소스 · 라이선스 · `T.legal.*` 쉬운말 대본 |
| 화면 언어 | 유저·어드민 **쉬운 한글만** · IT/테스트/개발 용어 **노출 0** |
| 유저 토스트 | 한글 + 이모지 1~2 · problem.code/HTTP 영문 **0** · 본문 SSOT=§8.2 |
| 본인 진행 (§50.1b) | `본인만 진행해 주세요…` · 출금/원금 시트 |
| orchestrate 약관 문장 | §48.13 / `T.execution.orchestrateTruth`와 **동일 1문장** |
| **§50.9 운영사** | **PRE-OWNED WATCHES L.L.C** · DET **1135431** · Dubai |
| 푸터 | SiteFooter · legal · JSON-LD **단일** `operator-entity.v1` |
| 허가 업종 노출 | `verifiedAt` 후 PDF 실등록 값만 · 추정 코드 렌더 **0** |

### §50.9 Operator lock (요약)

| Field | Value |
|-------|-------|
| Legal Name | PRE-OWNED WATCHES L.L.C |
| License Number | **1135431** |
| Authority | DET (Dubai Department of Economy and Tourism) |
| Footer ko | `두바이 경제관광부(DET) 면허 \| 사업자등록번호 1135431 \| PRE-OWNED WATCHES L.L.C` |

## Pointer

| 교차 | SSOT |
|------|------|
| UI §50 본문 · 약관 대본 · DET 표 | UI `ai_profit_os_03_ui_ux_d4e5f6a7.plan.md` §50 |
| 금지어·glossary | → `25` · UI §27 |
| Trust / 면책 | → `38` |
| 원금·출금 기본 | → `49` |
| Brand 3층 | ADR-002 · Consumer/AI=**퍼뜩** · → `51` ADR |
| KYB 편의복사 | `COMPANY_REGISTRATION_SUMMARY.md` (SSOT≠여기) |
| 외부 WP EN 푸터 | `FOOTER_LICENSE_COPY.md` → schema 번호·법인명 일치 |
| schemas (todo) | `operator-entity.v1` · `user-ux-prefs.v1` · `notification-prefs.v1` · `toast-codes.v1` |
| copy | `settings.ts` · `legal.ts` · `operator.ts` · `toast.ts` |
| CI | `verify:no-it-jargon` · `verify:toast-emoji` · `verify:legal-plain-ko` · `verify:operator-footer` · `verify:font-scale-three` · `verify:korean-ui` |

## Forbidden

- Light/System 테마 토글 · 글자 2단만 제공 · 성별 토글
- 약관·푸터·JSON-LD에 DET/법인명 drift
- UK dissolved entity / 타국 법인 혼동 표기
- 유저 화면에 API/DLQ/NATS 등 IT 용어
- 확정수익·원금보장 허위 약관 문구
- 구현 컴포넌트/약관 전문을 본 파일에 전량 복제
