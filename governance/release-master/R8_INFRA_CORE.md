# REL-506 — INFRA_RELEASE_CERTIFICATION_CORE (R8)

STATUS: BLOCKED
DATE: 2026-08-22
R8_ISSUED: NO
ADS_AUTONOMOUS_COMPLETE: 0

## Why blocked

DEPENDENCIES REL-016 + REL-403 + REL-505. REL-505 is BLOCKED.

## Not a substitute

이 문서는 자동운영 완료 문구가 아니다. POST-012과 혼용 금지.

## Observed (not certified)

- `infra/domain.manifest.json` openNext Workers 경로가 레포에 있음
- REL-403 versioning 문서 존재
- REL-016 observability verify가 CATALOG에 live
- pages deploy 경로를 이 배치에서 실행하지 않음
- Lighthouse full run = NOT_RUN
