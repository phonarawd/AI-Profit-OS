# REL-603 AGE-GROUP USABILITY SPOT CHECK

```text
REL = REL-603
TITLE = 연령대별 수동 사용성 실사
STATUS = HUMAN_BLOCK
AUTOMATION_LEVEL = A0
PLAN_LOCKED = TRUE
PROTECTED_SCOPE_MUTATION = FALSE
AUTO_PASS_FORBIDDEN = 1
PARTICIPANTS_REQUIRED = 9
PARTICIPANTS_COMPLETED = 0
BLOCK_REASON = 사람 미섭외 · Founder 실행 대기
SPOTCHECK_DATE = (미실시)
```

## ORIGIN

staging web = https://ai-profit-web-preview.ebay-adapter.workers.dev
staging ops = https://ai-profit-ops-preview.ebay-adapter.workers.dev
dependency = REL-601 staging regression PASS (2026-08-24)
legacy todo = `trust-age-spotcheck` (03 UI §38.6b)
admin pointer = `/admin/ai-logs?tab=spotcheck` (결과 메모 저장용 · 선택)

## SCOPE

| 연령대 | 인원 | 성별 | 비고 |
|---|---|---|---|
| 20대 | 3 | 남녀 혼합 | 스마트폰 익숙 |
| 40대 | 3 | 남녀 혼합 | 중간 디지털 리터러시 |
| 60~70대 | 3 | 남녀 혼합 | senior/xl · 밝은 실내 가독성 |

과제는 **성별 중립** · UI 성별 분기 **0**.
에이전트·Playwright·스크립트로 참가자 대체 **금지**.

## FACILITATOR (Founder 전용)

1. 참가자 섭외 (각 연령대 3명 · 총 9명).
2. 아래 **시나리오 시트**대로 staging에서 **말로 안내하지 않고** 관찰.
3. 참가자가 **스스로** 길을 찾게 둔다 (힌트는 마지막 수단).
4. 각 과제 후 **3초 질문** + §38.6b 체크리스트 기록.
5. P0 이슈 발견 시 해당 REL 재오픈 · 본 문서 `ISSUE LOG`에 심각도 기록.
6. 9명 완료 후 `STATUS`를 `COMPLETED`로 갱신 · `PUTDUK_RELEASE_MASTER` rel-603 todo completed.

## SCENARIO SHEET

환경: **모바일 우선** (390×693) · 필요 시 PC(1440×1080) 1회 추가 관찰.
계정: 테스트용 staging 계정 (Founder 발급 · 비밀번호/토큰 **본 문서에 기록 금지**).

### S1 — 첫인상 · 5탭 (홈)

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S1.1 | 앱을 열고 10초 동안 화면만 본다 | 말 없이 대기 | 혼란·이탈 의사 |
| S1.2 | "지금 뭘 할 수 있는지" 말로 설명 | 3초 내 한 문장 | 홈 Hero·기회 스캔 인지 |
| S1.3 | 하단 5개 메뉴 이름을 읽는다 | 홈·기회·수익·지갑·내정보 | 라벨 이해 · IT용어 0 |
| S1.4 | "돈이 어디 있는지" 찾는다 | 지갑 탭 도달 | USDT primary · ≈원화 secondary |

**3초 질문:** "이 화면에서 지금 무엇을 할 수 있나요?"

### S2 — 가입/로그인

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S2.1 | 새 계정 만들기 또는 로그인 | 완료 또는 명확한 포기 이유 | 카카오/이메일 경로 혼란 |
| S2.2 | 온보딩 첫 화면 읽기 | 3초 내 "뭘 하는 앱인지" | utility→capital 전환 고지 |
| S2.3 | 면책/안내 문구 스크롤 | 장난 이모지 **0** | §27.10 plain ko |

**3초 질문:** "가입 후 이 앱으로 무엇을 하게 되나요?"

### S3 — 기회 탐색

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S3.1 | 기회 탭으로 이동 | `/profits` 도달 | 5탭 네비 |
| S3.2 | 카드 하나 골라 상세 진입 | 상세 화면 | AI 매칭·회랑(저가→고가) 인지 |
| S3.3 | "얼마 넣고 얼마 나오는지" 말한다 | requiredCapital + expectedProfit | **3초 테스트** (§5.3b) |
| S3.4 | "수익 벌기" 버튼 의미 설명 | 참여 의도 이해 | 금지 CTA(차익 수령 등) 0 |

**3초 질문:** "이 기회에 얼마 넣고 예상 결과는 얼마인가요?"

### S4 — 참여 (가능 시)

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S4.1 | 참여/수익 벌기 시도 | preflight 또는 잔액 부족 안내 | 오류 메시지 plain ko |
| S4.2 | 잔액 부족 시 다음 행동 | 입금 안내 또는 포기 이유 | fake progress 0 |

**3초 질문:** "참여하려면 지금 무엇이 더 필요한가요?"

*(staging 잔액/엔진 상태로 실참여 불가 시 S4.2까지로 대체 · 기록)*

### S5 — 지갑 · USDT

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S5.1 | 지갑 탭에서 잔액 확인 | principal/profit 구분 인지 | bucket 혼동 |
| S5.2 | 입금 화면 진입 | USDT 탭 | **TRC20 노출 0** · 한글 네트워크 경고 |
| S5.3 | "왜 USDT인가?" 설명 요청 | trust copy 이해 | §38.6 USDT 이유 |
| S5.4 | (60~70대) 설정에서 글자 크기 변경 | 3단 중 하나 선택 | fontScale 가독성 |

**3초 질문:** "입금할 때 가장 조심해야 할 것은 무엇인가요?"

### S6 — 퍼뜩 · 신뢰 (해당 surface 노출 시)

| # | 과제 | 성공 기준 | 관찰 포인트 |
|---|---|---|---|
| S6.1 | 퍼뜩 첫 인사/코치 카드 | 부담 없음 | 과도한 압박 0 |
| S6.2 | 도움말 이모지 길잡이 | 의미 이해 | §27.10 |
| S6.3 | C01 count(오늘 가능 건수 등) | 숫자 의미 설명 | fake zero 0 |

## §38.6b CHECKLIST (참가자별)

| 항목 | P1 | P2 | P3 | … | P9 |
|---|---|---|---|---|---|
| USDT 왜? 이해 | | | | | |
| fontScale 읽기 (해당 시) | | | | | |
| 입금 네트워크 한글 경고 인지 | | | | | |
| senior/xl 밝은 실내 가독성 (60~70) | | | | | |
| 도움말 이모지 길잡이 이해 | | | | | |
| 퍼뜩 첫인사 부담 없음 | | | | | |
| 면책 줄 장난 이모지 0 | | | | | |
| 5탭 라벨 이해 | | | | | |
| 3초 질문 통과 (S1~S5) | | | | | |
| 길 잃음 (unassisted lost) | | | | | |

체크: ✅ PASS · ⚠️ 부분 · ❌ FAIL · — 해당 없음

## PARTICIPANT RESULTS

| ID | 연령대 | 성별 | 기기 | 시나리오 | 길잃음 | 3초질문 | §38.6b | 비고 |
|---|---|---|---|---|---|---|---|---|
| P1 | 20대 | | mobile | S1~S6 | | | | |
| P2 | 20대 | | mobile | S1~S6 | | | | |
| P3 | 20대 | | mobile | S1~S6 | | | | |
| P4 | 40대 | | mobile | S1~S6 | | | | |
| P5 | 40대 | | mobile | S1~S6 | | | | |
| P6 | 40대 | | mobile | S1~S6 | | | | |
| P7 | 60~70대 | | mobile | S1~S6 | | | | |
| P8 | 60~70대 | | mobile | S1~S6 | | | | |
| P9 | 60~70대 | | mobile | S1~S6 | | | | |

`길잃음` = 무안내 상태에서 60초 이상 목표 미도달 또는 포기.

## ISSUE LOG

| ID | 심각도 | surface | 참가자 | 요약 | REL 재오픈 |
|---|---|---|---|---|---|
| | P0/P1/P2/P3 | | | | |

| 심각도 | 정의 | 조치 |
|---|---|---|
| P0 | 길 잃음·금전 오해·안전 경고 미인지 | 해당 REL 재오픈 · 배포 차단 |
| P1 | 핵심 과제 실패·다수 연령대 공통 | REL-700 전 수정 권고 |
| P2 | 일부 연령대만 · 우회 가능 | 백로그 |
| P3 | 카피/미세 UX | 백로그 |

## EXIT_GATE

자동화 스크립트로 본 REL 닫기 = **금지**
9명 미완료 시 STATUS=COMPLETED 기록 = **금지**
가짜 참가자·가짜 PASS = **금지**
credential/staging secret 본 문서 기록 = **금지**

## COMPLETION CRITERIA

- [ ] 9명 실사 완료 (또는 정직한 HUMAN_BLOCK 유지)
- [ ] PARTICIPANT RESULTS 공란 0
- [ ] P0 이슈 = 0 또는 재오픈 REL 명시
- [ ] STATUS = COMPLETED
- [ ] `PUTDUK_RELEASE_MASTER` rel-603 todo = completed (Founder 수동)
