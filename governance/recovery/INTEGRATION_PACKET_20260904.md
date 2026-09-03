# INTEGRATION PACKET · 2026-09-04 (Cursor 세션 · 읽기전용 실측 + 비프로덕션 A3 작업)

```text
PRODUCTION_MUTATION = 0        (DB DDL/DML 0 · deploy 0 · secret 0 · Render/Supabase 설정 변경 0)
PROTECTED_SCOPE_DRIFT_ADDED = 0 (PR #213 · engine epoch ISSUED 유지)
REMOTE_REF_DELETE = 0          (Night Guard 정책 · archive 태그로만 0-손실 고정)
```

## 1. 이 세션이 확정한 진실 (이전 보고서 정정 포함)

| 항목 | 2026-09-04 02:00 보고 | 정정된 진실 (recovery 계보 실측) |
|---|---|---|
| 격리 스테이징 | 없음 | **있음** — Render `AI-Profit-OS-Staging` ↔ Supabase branch `staging-release-20260902` (ref `uluzxvdpynytytduuryy`, parent `mgsytcetsiecllmhcyox`, 93 tables, customer data 0) + Render KV `red-dabpllv40ujc73a0ddcg` · CF preview `BOUND_TO_STAGING` |
| Supabase 플랜 | Free 컴퓨트 추정 | Branching 사용 중 → **Pro 이상** (컴퓨트는 Nano급 `shared_buffers=224MB` → Small 리사이즈 권고) |
| REL-502 엔진 인증 | NOT_ISSUED | recovery 계보 = **ISSUED** (baseline `ea-baseline-0d8825e8f333-5ac0f4291966`, QA9 `ENGINE_ACCEPTED_FOR_UI`) — main/rescue 트리에서만 NOT_ISSUED |
| TRC20 주소 파생(P0-1) | HMAC placeholder(main·prod) | recovery 계보 = **fail-closed** (`TRON_HD_DERIVATION_UNAVAILABLE` 503 before INSERT · HMAC 0) · prod `0a72b27d`는 여전히 HMAC → 배포 전까지 입금주소 발급 금지 유지 |
| next 16.3.0 RCE | 미패치 | recovery 계보 = **16.3.3** |
| 릴리스 큐 | REL-700 pending | recovery 계보 = REL-700 · REL-701-PRE **completed** · `FIRST_EXECUTION_TODO = REL-701-DB` · `BLOCKING_ON = [FOUNDER_PRODUCTION_AUTHORIZATION]` |
| FINAL RC | — | `rc-formal.v1.json` LOCKED @ `84cb2ea0` (artifact `c5c56d32…` · acceptance PASS) — 이후 tip에 post-seal 제품 변경(admin-session CSRF 등)이 쌓여 **re-seal 필요**(계보 소유자 진행 중 · `chatgpt/staging-exact-1f3b36f`) |
| main 릴리스 워크플로 | — | `release-build/acceptance/deploy-cloudflare.yml`이 참조하는 `tooling/release/*` 6개가 **main에 없음** → main 단독으로는 릴리스 불가 · PR #213 병합으로 해소 |

## 2. 이 세션이 만든 것

| 산출물 | 내용 | 상태 |
|---|---|---|
| PR **#213** `integration/recovery-truth-20260904` | recovery 계보 6c6c8066 + 마이그레이션 장부 진실 1커밋(fixture raw 43·head 20260902155632 · readiness 54/42/43/12 · R7 head 표-구동 · pre-head unapplied `--include-all` 요구) + 증거 | T0/T1 PASS · CI 감시 |
| PR **#212** `integration/recovery-rescue-20260904` | #213 베이스 + rescue 제품 커밋 5(SEO·trust·Home QA) + `.gitattributes`(LF 잠금)/`.gitignore` | 차기 RC 후보 · `rc-formal` re-seal 필요 |
| PR **#211** `rescue/chatgpt-takeover-20260903` | main + rescue + 부분 이식(auth magic-link fail-closed 완성 · 배포 격리 모듈 복원) | fallback · 계보 통합 시 close |
| `origin/feat/tron-hd-kms-founder-setup-20260904` | 이 PC에만 있던 KMS four-eye·withdraw broadcast·founder setup 2커밋 보존(원격 브랜치가 force-update되어 새 이름) | 후속 PR(RC 이후) |
| archive 태그 **134** | 정리 대상 원격 브랜치 101 + 로컬전용 12 + prod SHA 1 + stash 20 → `archive/**` (origin push 완료) | 0-손실 |
| 로컬 정리 | 중첩 clone 2GB·detached worktree 2·중첩 worktree 2 제거 · `_tmp*` 42파일 삭제(증거 6개는 governance로 이동) · stash 20→0 · 로컬 브랜치 37→8 · `git gc` · `main` upstream 복구 | 완료 (`wt-tron-hd` 디렉터리 1개는 프로세스 잠김 → 재부팅 후 삭제) |

## 3. 사람(Founder)만 할 수 있는 것 — 순서대로

| # | 행동 | 왜 사람인가 | 근거 |
|---|---|---|---|
| 1 | Render prod `srv-da5r1tqjobas73fl16dg` **autoDeploy OFF** | main 병합 = prod API 자동배포(accepted-artifact 경로 우회) | Founder packet next_action 3 |
| 2 | PR **#213 병합** (autoDeploy OFF 후) → main = 계보 진실 | 브랜치 보호/병합 판단 | §2 |
| 2b | PR gate의 REL-603 automated age usability cohort는 **공유 CF preview 라이브**를 친다 — preview가 다른 RC(chatgpt/staging-exact-1f3b36f)에 바인딩된 동안 /profits participate-entry URL 기대가 어긋나 #212/#213 모두 같은 지점에서 FAIL(코드 결함 아님 · 환경 결합). preview를 PR head로 재배포하거나(계보 소유자) 라이브 코호트를 gate 밖 별도 워크플로로 분리 | 공유 스테이징 바인딩 결정 | gate run 33795996375 |
| 3 | RC re-seal: `release-build` → `deploy-staging` → `release-acceptance` dispatch → `rc-formal.v1.json` binding 갱신 (계보 소유자) | Night Guard가 release/deploy 워크플로 dispatch 차단 | `night-guard-policy.mjs` |
| 4 | 원격 브랜치 101개 삭제 (`governance/recovery/branch-cleanup-plan-20260904.json` `archiveRemote[]` → 태그 `archive/<name>`로 전부 보존됨 · `keepRemote[]`는 유지) | `git push --delete` = Night Guard DENY | S3 |
| 5 | REL-701-DB: staging 증명 후 prod apply — 순서 주의: `20260901224000_withdraw_stepup_token_single_use` · `20260902032000_production_schema_parity`는 remote head(`20260902155632`)보다 **버전이 작아** plain `db push`가 건너뜀 → `--include-all` 또는 head 이후로 rename | Founder 명시 승인 | R7 표 · fixture note |
| 6 | `push_control`/`push_subscriptions` RLS ON (`supabase/staging/20260901120100_push_rls.sql` → staging 증명 → prod) | prod DDL | Supabase critical advisor |
| 7 | TRON HD 실키: BIP32 secp256k1 xpub authority + KMS four-eye (`feat/tron-hd-kms-founder-setup-20260904` PR) · TronGrid 키 · 테스트넷 E2E → 메인넷 소액 1회 | 시크릿·커스터디 | P0-1 |
| 8 | ENGINE_ACCEPTANCE_REBASE ACK (RC re-seal 시 protected scope 변경분) | PO ACK | `product-rebases.v1.json` |
| 9 | Kakao 라이브 계정 E2E · Resend 도메인 검증 확인 | 계정 소유자 | REL-701-PRE |
| 10 | Supabase 컴퓨트 Small · PITR(실자금 개시 시) · Render prod Standard · staging Starter | 결제 | 분석 §9 |
| 11 | `operator-entity.licenseStatus`: `active`(현 baseline) vs `pending_verification`(rescue 제안) 확정 | 법적 사실 | #212 |

## 4. 후속 A3 작업 (RC 이후 · 사람 게이트 아님)

- `.gitattributes` LF 잠금 + `.gitignore`(#212에 포함) · react 19.2.1 범프 · always 규칙 12→7 · 레거시 플랜 51 pending `superseded_by` 스탬프 · 접두사 6종 정책(`feat/ fix/ sec/ ops/ rel/` + `archive/` 태그) · Render Singapore↔Supabase Seoul FK 인덱스 27 보강 · POST-001~019.
