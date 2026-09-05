# CodeQL Canonical Ledger (Phase B)

이 문서는 scan universe(default branch / PR ref / historical)를 분리해 기록하는
canonical CodeQL 요약이다. 원본: `_audit-d0-20260904/session-1e-correction/D1S1E-02-CODEQL-RECLASSIFICATION.md`.

LAST_LIVE_REVERIFY_UTC = 2026-09-05T08:00:00Z

## 1. Scan universe별 현재 open 개수 (live 재조회)

| universe | ref | open | 비고 |
|---|---|---|---|
| default branch | main | 37 | PR #221 미병합, 원본 그대로 |
| PR #221 head/merge-ref | refs/pull/221/merge | 3 (재스캔 전) | 2026-09-05 세션 시작 시점 실측: 15 -> 3 |

37과 3은 서로 다른 ref의 서로 다른 스캔이며 더하거나 빼지 않는다. §3.4에서 3 -> 2로
추가 수정(day-pulse-live-only.cjs file-system-race) - 이 표의 "3"은 그 수정 이전 값이며,
push 후 CodeQL 워크플로 재스캔 결과로 이 문서를 다시 갱신한다(가정치를 확정치로 쓰지 않음).

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

80/81(clock.core.cjs:64,73, DB_URL_DENY)은 이 세션 작성 시점에는 의도적으로 미해결 유지했다:
이 정규식은 URL 검증이 아니라 DENY list이며 이 파일 자체 comment가 "안전 방향은
over-matching"이라고 명시한다. 단어경계 앵커는 실제 hostname을 약화시키지 않고
coincidental substring만 막으므로, anchor를 없애면 더 안전해지는 방향이지 덜 안전해지는
방향이 아니다. 또한 이 파일은 protected-scope root(services/api-nest) 안에 있어 REL-502
drift를 유발하는 그 파일이다. 당시 판정: risk/reward가 맞지 않아 이 세션은 건드리지 않음
(AWAITING_HUMAN_REVIEW, self-dismiss 0).

**D1-S1F 갱신 (2026-09-05, PUTDUK S1F Founder 지시 §10, 위 판단을 대체):** Founder 지시서가
"경계 문자를 계속 덧붙이거나 alert를 self-dismiss하지 말고 DATABASE_URL을 안전하게 parse해
hostname만 추출, `host === suffix` 또는 `host.endsWith('.' + suffix)`로 관리형 DB hostname을
판정하라"고 명시적으로 지시했다 — 위 "risk/reward 안 맞음" 판단을 명시적으로 override한다.
`services/api-nest/clock.core.cjs`의 `DB_URL_DENY` regex-against-whole-string 배열을
`safeDatabaseUrlHostname()`(Node `URL` parse) + `isManagedDatabaseHost()`(suffix 비교,
parse 실패 시 fail-closed=true)로 전면 교체 — anchor 추가가 아니라 정규식 매칭 자체를
제거한 구조적 재작성. `aws-\d-`/`.pooler.supabase` 별도 엔트리는 `supabase.com`/`.co`
suffix가 이미 포함(pooler 호스트는 항상 `*.supabase.com`으로 끝남)하므로 커버리지 손실 없이
제거. 회귀: `tooling/verify/regression/clock-core-db-url-deny.regression.cjs` — 기존
production DSN 5종 여전히 deny, userinfo/query/path/sibling-label에 관리형 토큰을 심은
4종 substring-bypass 케이스는 이제 정확히 allow(호스트만 본다는 증거), parse 불가 입력은
fail-closed deny(이전 regex 방식은 no-match=silent-allow였던 것보다 더 안전). PASS.
`verify:domain-clock` 35/35 PASS(kill-switch parity 포함). 판정: **FIXED (구조적, self-dismiss
아님)** — §3.3/§6 카운트 갱신.

### 3.2 Fixture-only 8/8 해소 (테스트 파일의 OLD vulnerable pattern 재선언 제거)

| 구 alert | 파일 | 조치 | 커밋 |
|---|---|---|---|
| 83-86 | clock-core-db-url-deny.regression.cjs | 로컬 OLD/NEW RegExp 4개 제거, core.DB_URL_DENY 배열 source 매칭으로 대상 항목만 검증 | fb98b207 |
| 87,88 | ebay-resilience-anchor-55.regression.cjs | 로컬 regex 리터럴 완전 제거, 실제 배포 헬퍼로 재작성 | fb98b207 |
| 78,79 | host-token-boundary.regression.cjs | naive OLD_CHECK 로컬 함수 제거, 실제 includesHostToken만 사용 | fb98b207 |

세 파일 모두 탐지력/오탐회피 커버리지 그대로 유지, 실행 가능한 취약 패턴 재선언만 제거.

### 3.3 미해결 3건 (라이브 재조회, 이전 세션 종료 시점) — 80/81은 3.1 D1-S1F 갱신으로 FIXED

| alert | rule | 파일:라인 | 분류 |
|---|---|---|---|
| 80,81 | js/regex/missing-regexp-anchor | clock.core.cjs:64,73 | FIXED (D1-S1F, §3.1 갱신 참조) — remote rescan 대기 |
| 38 | js/file-system-race | day-pulse-live-only.cjs:121 | OPEN_UNTRIAGED (무관 사전 항목) — 아래 3.4에서 해소 |

### 3.4 이번 세션(2026-09-05, PUTDUK FULL REAL-MONEY PRODUCTION RELEASE) 추가 해소: 3 -> 2

| alert | 파일 | 조치 |
|---|---|---|
| 38 | tooling/verify/day-pulse-live-only.cjs | 1차: `read()` 헬퍼의 `existsSync`+`readFileSync` 체크-후-사용을 단일 `readFileSync` try/catch(ENOENT)로 교체 |
| 92 (1차 수정 후 신규 번호로 재관측) | tooling/verify/day-pulse-live-only.cjs | 2차: 1차 수정 직후 실측 재스캔에서 같은 파일에 새 alert 92 발생 확인 - `walkAdmin()`의 `statSync(p)`(타입 확인) 뒤에 그 결과로 `readFileSync(p)` 실행 여부를 조건분기하는 자체가 여전히 check-then-use였음(개별 try/catch로 감쌌어도 구조는 동일). `fs.readdirSync(dir, { withFileTypes: true })`로 교체해 자식 타입 정보를 디렉터리 read와 **같은 시스템 콜**에서 얻고, 별도 `statSync(p)`를 아예 제거 - 이제 경로당 실제 fs 호출은 파일 내용을 읽는 단일 `readFileSync` try/catch(ENOENT)뿐 |

두 수정 모두 구조적 제거(anchor/난독화 아님). 동작 동일성 확인: 두 번 모두 PASS 메시지
불변, 실제 admin 파일 트리 재스캔해 결과 0건 유지. 1차 수정만으로는 CodeQL이 새 alert(92)를
찾아냈다는 사실 자체가 "anchor만 추가"식 피상적 수정이 durable하지 않다는 산증거다.

**2차 수정 push 후 live 재확인 (commit bd84cbe8, 2026-09-05T10:06Z):**
`refs/pull/221/merge` open = **2**건, 전부 80/81 (clock.core.cjs, AWAITING_HUMAN_REVIEW로
이미 §3.1에서 분류됨). day-pulse-live-only.cjs 관련 alert(38, 92) 완전 소멸 확인.
PR ref에서 OPEN_UNTRIAGED = **0**. 남은 2건은 self-dismiss 대상이 아니라 자격 있는 사람의
검토가 필요한 항목으로 그대로 유지한다.

## 3.5 S1F 세션 (2026-09-05, PUTDUK S1F Founder 프로덕션 출시 지시서) — PR ref 신규 4건

classic-signup/session-rotation/turnstile/rate-limit/admin-users 백엔드(commit f2812062)가
PR ref에 4건의 새 alert를 만들었다. 전부 이 세션이 직접 작성한 코드다 - self-dismiss 0,
아래 표대로 처리했다.

| alert | rule | 파일:라인 | 처리 |
|---|---|---|---|
| 96 | js/incomplete-sanitization | users-admin.service.ts:129 | FIXED (구조적) - LIKE 패턴 이스케이프가 백슬래시 자체를 먼저 이중화하지 않고 %와 밑줄만 이스케이프해, 검색어에 백슬래시가 이미 있으면 결과 패턴이 재해석되어 와일드카드가 조용히 되살아날 수 있었다. 백슬래시를 먼저 이중화한 뒤 와일드카드를 이스케이프하도록 수정. |
| 93,94 | js/clear-text-storage-of-sensitive-data | auth.controller.ts:66,75 (attachSessionCookies) | AWAITING_HUMAN_REVIEW, self-dismiss 0 - 아래 4절의 기존 default-branch alert 20(같은 파일, 같은 rule, D1 세션 이전부터 open)과 동일 클래스다. 이 세션이 attachSessionCookies를 재작성하면서 PR diff에 새로 잡혔을 뿐, 새로운 보안 결함을 만든 게 아니다. httpOnly+Secure(production)+SameSite=lax 쿠키에 opaque bearer 토큰(access/refresh)을 저장하는 표준 세션 패턴 - 보호는 저장값 자체의 암호화가 아니라 전송(HTTPS)+httpOnly(JS 접근 차단)+짧은 TTL(access 15분)+rotation(refresh, reuse 탐지 시 family 전체 폐기)에서 온다. 코드 변경 없음 - 판단은 Founder 또는 자격 있는 보안 리뷰어가 내려야 한다. |
| 95 | js/insufficient-password-hash | pwned-password.service.ts:38 (sha1Hex) | AWAITING_HUMAN_REVIEW, self-dismiss 0 - 이 SHA-1은 비밀번호 저장/검증용이 아니라 HIBP Pwned Passwords k-anonymity 조회용이며 HIBP 공개 API 자체가 SHA-1 인덱스를 요구한다 - 알고리즘을 바꾸면 유출-비밀번호 차단 기능 자체가 깨진다. 실제 비밀번호 저장은 별도 password-hash.ts가 scrypt(OWASP N=2^17,r=8,p=1)로 처리하며 이 SHA-1 결과는 절대 저장/로그되지 않고 5-hex-prefix만 네트워크로 전송된다. 알고리즘 선택이 실제 보안 통제(HIBP 조회)를 깨뜨리는 트레이드오프이므로 코드로 임의 수정하지 않고 사람 판단으로 넘긴다. |

이 4건은 CI CodeQL check를 계속 FAIL 상태로 둔다(의도적 - 93/94/95를 조용히 초록으로
만들지 않는다). 96만 다음 rescan에서 FIXED로 자동 반영될 것으로 예상(추측 금지 - push 후
실제 rescan으로 재확인).

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

untriaged 0 = 미충족(19건 잔존, main 전용, 80/81은 D1-S1F에서 구조적으로 FIXED되어 이 19건
집계에서 제외 — kill-switch.cjs의 53/54만 별도로 남음). reachable Critical/High 0 = #20/#29
사람 검토 필요(AWAITING_HUMAN_SECURITY_REVIEWER, self-dismiss 0). 테스트 코드 alert 해결 =
완료(8/8). self-dismiss = 0. 최종 RC 재스캔 = Phase L(REL-502 rebase)에서 별도 수행 — 이
문서의 "FIXED" 표시는 로컬 코드 수정+regression 증거이며, remote CodeQL rescan으로 alert
번호 자체가 사라지는 것은 push 후 실제 스캔 결과로 재확인한다(추측 금지).

## 6. 요약

DEFAULT_BRANCH_OPEN=37(불변, 아직 push 전) · PR_REF_BEFORE=15 · PR_REF_AFTER(이전 세션
종료 시점)=3(실측, day-pulse 2차 수정 후) · CLOSED_THIS_SESSION(이전 세션)=12(구조적 4 +
fixture 8) · **D1-S1F 추가 FIXED=2(80,81, 구조적 재작성)** · OPEN_UNTRIAGED_PR_REF=1(38,
이전 세션에서 이미 해소 확인됨 §3.4) · OPEN_UNTRIAGED_DEFAULT_BRANCH_ONLY=19(main이 아직
이 커밋들을 받지 않음, kill-switch.cjs 53/54 포함) · SELF_DISMISS_COUNT=0(불변, 전부 실코드
수정 또는 사람 검토 대기).

**S1F 갱신 (2026-09-05, §3.5):** PR ref에 신규 4건(93,94,95,96) 실측 확인 - 96은 구조적
FIXED(commit 예정), 93/94/95는 AWAITING_HUMAN_REVIEW로 신규 등재(self-dismiss 0). PR ref
OPEN_UNTRIAGED는 이 3건 + 기존 38(이미 해소됨, 다음 rescan에서 소멸 확인 대상)이 아니라
실질적으로 93/94/95 3건. CodeQL CI check는 이 3건이 사람 검토를 거치기 전까지 의도적으로
FAIL 상태를 유지한다 - 초록으로 강제하지 않았다.
