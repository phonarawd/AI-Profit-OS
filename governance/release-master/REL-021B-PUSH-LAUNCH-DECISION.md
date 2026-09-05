# REL-021B Push Launch Decision

```text
STATUS = AWAITING_FOUNDER_DECISION
RELEASE_BLOCKER = CONDITIONAL
MECHANISM = FULLY_TESTED
CURRENT_PRODUCTION_VALUE = PUSH_ENABLED_FALSE_IN_ENV_PRODUCTION
```

REL-021(채널별 opt-in 필터 메커니즘)과는 별개 결정이다. REL-021은
필터가 올바르게 작동하는지를 닫았고 이미 종료된 문서다. 이 문서는
발송 자체를 켜는지 여부라는 순수 제품/운영 결정만 다룬다.

## 확인된 사실 (live 코드 재검증, 2026-09-05)

1. `workers/push-dispatcher/wrangler.toml`의 production 환경 설정은
   push 발송 kill 플래그를 명시적으로 꺼짐으로 override한다. 그 옆의
   코드 주석 원문은 이를 true로 바꾸는 것은 실제 production 사용자에게
   실제 push 발송을 시작하는 제품/오너 결정이며 infra fix가 아니므로
   명시적 sign-off 없이 바꾸지 말라고 적어 두었다. 이 세션은 그 값을
   임의로 뒤집지 않는다.
2. `services/api-nest/src/push/push-kill.service.ts`는 이 환경변수가
   꺼짐이면 즉시 false를 반환하는 최우선 kill 체크를 갖고 있다.
   `governance/pwa/VAPID.md`가 문서화한 필터 순서는 kill 체크가 opt-in
   설정·구독·dispatcher보다 먼저 온다는 것이다.
3. 그러나 이 kill switch는 opt-in UI 자체를 막지 않는다. 실제 live
   코드를 다음과 같이 확인했다.
   - `apps/web/app/layout.tsx`가 모든 페이지에 `PwaRuntime`을 상시
     마운트하고, 그 안의 `PushOptIn` 컴포넌트가 모든 방문자에게 8초
     후 자동으로 알림 권한 팝업을 띄운다.
   - 그 팝업의 카피는 제목이 소식 받기, 본문이 새 기회가 오면 알려
     줄게요, 버튼이 받기로 되어 있다 — 실제 push 수신을 명시적으로
     약속하는 문구다.
   - 클라이언트 구독 로직(`packages/sdk/src/push/subscribe.ts`)과
     서버의 VAPID 공개키 조회 엔드포인트
     (`services/api-nest/src/push/push.user.controller.ts`)는 둘 다
     이 kill 플래그를 전혀 참조하지 않는다 — 브라우저 지원 여부와
     공개키 존재 여부만 확인한다.
   - 결과적으로 production에 공개키가 이미 설정돼 있다면, 사용자는
     권한 허용부터 구독 성공까지 전부 성공으로 경험하지만 실제 발송은
     dispatcher의 kill 플래그에서 항상 무음으로 죽는다.
   - `packages/ui/components/settings/SettingsPanel.tsx`의 알림 토글도
     실제 DB에 저장되는 진짜 토글이지만, 최종 발송 단계의 kill switch와
     무관하게 항상 켜 둘 수 있어 사용자의 합리적 기대와 실제 결과가
     불일치한다.
4. 기존 테스트 커버리지(REL-021, 모두 PASS, 재확인됨 2026-09-05):
   channel-prefs 검증, notification 기본값 검증, push 배지 검증,
   dispatcher 쪽 production 환경변수 회귀 테스트. 즉 메커니즘 자체
   (옵트인/dedup/retry/unsubscribe/kill-switch)는 이미 검증되어 있고
   남은 것은 순수하게 지금 켜는가라는 제품 결정뿐이다.
5. 대체 채널 확인: 설정 화면 카피 중 하나가 알림을 끄면 푸시만 멈추고
   쪽지함에는 그대로 쌓인다고 안내한다 — 이는 push와 무관하게 인앱
   쪽지함이 항상 별도로 쌓인다는 것을 시사한다. 즉 정보 자체의 최종
   전달 실패(핵심 정보 완전 누락)는 아니고, 실제 OS 푸시 알림이라는
   한 가지 전달 경로만 약속대로 동작하지 않는 상태다(자금 안전성
   문제 아님, UX 정직성 문제).

## 이 세션이 하지 않은 것 (범위 밖)

- push 발송 kill 플래그를 켜짐으로 뒤집지 않았다 — 실제 production
  사용자에게 실제 push를 발송 시작하는 행위이며 코드 주석이 명시하는
  Owner sign-off 전제를 충족하지 않는다.
- `PushOptIn` 프롬프트를 임의로 숨기거나 삭제하지 않았다 — 이미
  배포된 라이브 기능을 제품 결정 없이 축소하는 것도 동일하게 Owner
  범위다.

## Founder 결정 필요 (최종 통합 요청에 포함)

세 가지 선택지 중 하나를 골라야 한다.

- Option A: push 발송을 켜서 정식 출시 — 전제는 기존 커버리지
  재확인(이미 PASS) + staging에서 실제 발송 1건 이상 수동 확인 +
  admin kill switch로 즉시 되돌릴 수 있음을 재확인.
- Option B: 이번 출시는 발송을 계속 끈 채로 유지하고, `PushOptIn`
  프롬프트를 이번 출시 범위에서 숨김(코드 변경 필요) — 출시 후 곧
  제공 문구로 대체하거나 완전히 비노출.
- Option C: 이번 출시는 발송을 계속 끈 채로 유지하고, `PushOptIn`
  프롬프트는 그대로 노출해 구독만 미리 수집하되, 카피를 빠르게
  준비 중이라는 정직한 문구로 최소 수정.

AI는 세 선택지 중 하나를 임의로 고르지 않는다 — 실제 사용자에게 보내는
알림 발송의 켜짐/꺼짐, 그리고 이미 배포된 라이브 UI 문구 축소 여부는
제품 오너 권한이기 때문이다.
