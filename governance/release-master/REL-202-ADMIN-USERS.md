# REL-202 /admin/users

STATUS: PRODUCTION_READY_CANDIDATE
UI_STATE_BEFORE: EXISTING_PARTIAL
ROUTE: /admin/users
FIGMA: NOT_FOUND
DATA_OWNER: GET /api/v1/admin/users 실시간 목록(검색/상태/가입방식 필터, 정렬, 페이지네이션) + UUID jump 보조
FAKE_USERS: 0
VERIFY: verify:rel-202-admin-users
PROTECTED: false

## Correction (2026-09-06, PUTDUK continuation session)

- 이전 STATUS/DATA_OWNER는 REL-713 handoff 이전 상태(목록 API 자체가 없던 시점)를 그대로 남긴 값이었다.
  백엔드(services/api-nest/src/users/users.admin.controller.ts, users-admin.service.ts)는 S1F Section 9.1에서
  이미 완성됐고, 프런트 배선(apps/admin/app/admin/users/page.tsx의 UsersListPanel import+render, 영구
  data-truth="unavailable" 스텁 제거)이 도구 오류로 3줄만 남기고 막혀 있었다(governance/release-master/
  evidence/REL-713-ADMIN-USERS-LIST-HANDOFF.md).
- 이번 세션에서 그 3줄 배선을 완료하고, UsersListPanel.tsx에 실제 검색/상태 필터/가입방식 필터/정렬/
  페이지 이동을 백엔드가 지원하는 그대로 연결했다. `verify:rel-202-admin-users`도 분리된 두 파일(page.tsx의
  배선 여부, UsersListPanel.tsx의 실제 API·동적 truth)을 각각 구조적으로 확인하도록 갱신했다.
- ADMIN_USERS_LIST_FRONTEND = DONE (기존 COMPONENT_READY_NOT_WIRED 아님).
