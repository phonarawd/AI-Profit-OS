# CodeQL Canonical Ledger (Phase B)

이 문서는 scan universe(default branch / PR ref / historical)를 분리해 기록하는
canonical CodeQL 요약이다. 원본: `_audit-d0-20260904/session-1e-correction/D1S1E-02-CODEQL-RECLASSIFICATION.md`.

LAST_LIVE_REVERIFY_UTC = 2026-09-05T08:00:00Z

## 1. Scan universe별 현재 open 개수 (live 재조회)

| universe | ref | open | 비고 |
|---|---|---|---|
| default branch | main | 37 | PR #221 미병합, 원본 그대로 |
| PR #221 head/merge-ref | refs/pull/221/merge | 3 | 이번 세션 실측: 15 -> 3 |

37과 3은 서로 다른 ref의 서로 다른 스캔이며 더하거나 빼지 않는다.

## 2. 이전 세션이 이미 닫은 16개

11,12,13,14,17,18,26,27,28,51,52,55,56,57,58,59 - 실제 코드 수정 + regression test로 종결.
그중 6개(51,52,55,56,57,58)가 같은 파일에서 새 번호로 residual을 남겼다(3.1절).

## 3. 이번 세션 결과: 15 -> 3

### 3.1 Residual 4/6 해소 (구조적 재작성, anchor 강화 아님)

| 구 alert | 파일 | 조치 | 커밋 |
|---|---|---|---|
| 82 | ebay-resilience.cjs:339 | hasExactDomainToken/hasExactHostPathToken로 재작성 | 897111be |
| 89-91 | root-domain-env.cjs | 동일 헬퍼로 재작성 | 897111be |

신규 헬퍼 tooling/verify/lib/domain-token-scan.cjs: 파일 텍스트를 hostname-safe 문자만
남기고 split해 토큰화한 뒤 금지 리터럴과 완전일치(===) 비교. regex substring 매칭 자체를
없애 CodeQL의 URL-like 휴리스틱 적용 대상이 사라진다. 회귀 13/13 PASS.

80/81(clock.core.cjs:64,73, DB_URL_DENY)은 의도적으로 미해결 유지: 이 정규식은 URL 검증이
아니라 DENY list이며 이 파일 자체 comment가 "안전 방향은 over-matching"이라고 명시한다.
단어경계 앵커는 실제 hostname을 약화시키지 않고 coincidental substring만 막으므로,
anchor를 없애면 더 안전해지는 방향이지 덜 안전해지는 방향이 아니다. 또한 이 파일은
protected-scope root(services/api-nest) 안에 있어 REL-502 drift를 유발하는 그 파일이다.
진짜 false positive이고 risk/reward가 맞지 않아 이번 세션은 건드리지 않는다.
판정: AWAITING_HUMAN_REVIEW (self-dismiss 0).

### 3.2 Fixture-only 8/8 해소 (테스트 파일의 OLD vulnerable pattern 재선언 제거)

| 구 alert | 파일 | 조치 | 커밋 |
|---|---|---|---|
| 83-86 | clock-core-db-url-deny.regression.cjs | 로컬 OLD/NEW RegExp 4개 제거, core.DB_URL_DENY 배열 source 매칭으로 대상 항목만 검증 | fb98b207 |
| 87,88 | ebay-resilience-anchor-55.regression.cjs | 로컬 regex 리터럴 완전 제거, 실제 배포 헬퍼로 재작성 | fb98b207 |
| 78,79 | host-token-boundary.regression.cjs | naive OLD_CHECK 로컬 함수 제거, 실제 includesHostToken만 사용 | fb98b207 |

세 파일 모두 탐지력/오탐회피 커버리지 그대로 유지, 실행 가능한 취약 패턴 재선언만 제거.

### 3.3 미해결 3건 (라이브 재조회)

| alert | rule | 파일:라인 | 분류 |
|---|---|---|---|
| 80,81 | js/regex/missing-regexp-anchor | clock.core.cjs:64,73 | AWAITING_HUMAN_REVIEW |
| 38 | js/file-system-race | day-pulse-live-only.cjs:121 | OPEN_UNTRIAGED (무관 사전 항목) |

## 4. Default branch 전용 OPEN_UNTRIAGED (main, 이번 세션 미착수, 19건)

20(clear-text-storage,auth.controller.ts) · 29(xss-through-dom,KycFlow.tsx) ·
31(incomplete-multi-character-sanitization,asset run.mjs) ·
33(identity-replacement,hash-scope.cjs) ·
34,35,36,37,39,40(file-system-race: cf-domain-bootstrap/freeze-baseline/generate-vapid x2/secrets/shadow-replay-drift) ·
41,42,43,44,45,46(file-access-to-http: cf-domain-bootstrap/cf-origin-smoke/qa7-coach-executor x3/rel-601) ·
53,54(missing-regexp-anchor,kill-switch.cjs) · 63,64(insecure-temporary-file,qa7-store.cjs).

11-18(polynomial-redos)은 default branch 원본에는 여전히 open으로 보이나 PR ref에서는
이미 D1-S1D가 실코드 수정으로 닫았다 - main이 그 커밋을 아직 안 받았을 뿐.

53/54 특기사항: kill-switch.cjs 수정안이 이미 작성돼 있으나(D1-S1D,
_audit-d0-20260904/session-1d-correction/scripts/fix-anchor-53-54-55.cjs, 미추적), 이 파일
변경은 tooling/verify/domain-by-path.cjs가 engine-acceptance.cjs(T0) 강제 실행을 트리거하고,
그 검증은 REL-502 protected-scope drift로 이 수정과 무관하게 이미 FAIL 상태다(git stash 격리로
재확인, D1-S1D). formal REL-502 rebase(Phase L) 이후 재시도 대상.

## 5. 출시 조건 대조

untriaged 0 = 미충족(19건 잔존, main 전용). reachable Critical/High 0 = #20/#29 사람 검토
필요(AWAITING_HUMAN_SECURITY_REVIEWER, self-dismiss 0). 테스트 코드 alert 해결 = 완료(8/8).
self-dismiss = 0. 최종 RC 재스캔 = Phase L에서 별도 수행.

## 6. 요약

DEFAULT_BRANCH_OPEN=37(불변) · PR_REF_BEFORE=15 · PR_REF_AFTER=3(실측) ·
CLOSED_THIS_SESSION=12(구조적 4 + fixture 8) · AWAITING_HUMAN_REVIEW_PR_REF=2(80,81) ·
OPEN_UNTRIAGED_PR_REF=1(38) · OPEN_UNTRIAGED_DEFAULT_BRANCH_ONLY=19 · SELF_DISMISS_COUNT=0.
