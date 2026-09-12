# backend-ci / 로컬 게이트 성능 (6단계)

Playwright / Next 재도입 없음. 훅은 전체 빌드를 돌리지 않는다 (T0 = verify:gate:fast).

## CI run 34625646001 (인수 HEAD 5407260f)

workflow: backend-ci · conclusion failure · https://github.com/phonarawd/AI-Profit-OS/actions/runs/34625646001

created 2026-09-11T17:04:43Z · completed 2026-09-11T17:06:24Z · wall ~101s

| job | conclusion | duration |
|---|---|---|
| unit | success | 18s |
| gate-fast | success | 87s |
| api-contract | success | 40s |
| integration | success | 28s |
| security | success | 16s |
| ledger-wallet | success | 30s |
| dependency-integrity | success | 19s |
| notification | success | 16s |
| auth | success | 21s |
| repository-boundary | failure | 22s |
| rust-engine | failure | 18s |
| worker-build | success | 38s |
| typecheck | success | 29s |
| migration | success | 27s |
| matching-membership | success | 24s |
| kyc | success | 85s |
| release-evidence | failure | 63s |
| admin-rbac | success | 16s |
| ai-policy | success | 22s |
| backend-required | failure | 6s |

60s 초과: gate-fast 87s · kyc 85s. 나머지 약 15-40s.

red: repository-boundary (당시 26) · rust-engine (Founder) · release-evidence (Founder) · aggregator backend-required.

이 슬라이스 이후 로컬 boundary 는 0. rust-engine / release-evidence 는 손대지 않음.

## 로컬 T0 / T1

worktree 직전 RAM: lowspec:status 7.20/7.73 GB used · free 0.53 GB CRITICAL. 3회 반복 측정 안 함 (여유 0.5GB 근처 · 추가 회차는 BLOCKED_LOCAL_ENVIRONMENT).

| n | command | result | wall | note |
|---|---|---|---|---|
| T0-1 | husky pre-commit verify:gate:fast @ 96bacfb4 | PASS 25 steps | 77655 ms | residual-26 code + graph |
| T0-2 | husky pre-commit verify:gate:fast @ 03211e64 | PASS 4 steps | 30027 ms | ownership SHA refresh |
| T1 | verify:gate:push | NOT_RUN at this file write | - | one push-hook run later; not marked PASS here |

T0 는 Next/Playwright 빌드 없음. 늦어진 훅 단계 수정 불필요 (T0-1 약 78s / T0-2 약 30s).
