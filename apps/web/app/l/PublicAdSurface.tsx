import Link from "next/link";

/**
 * /ads · /l 동일 public surface.
 * 잠금 CTA만. 카카오 직행 0. 지리맵 0. Core redirect 0.
 */
export function PublicAdSurface() {
  return (
    <section data-public-ad="true" data-first-viewport-max="5">
      <p>여러 사이트를 돌아다니지 않고 확인</p>
      <p>가격 차이 확인</p>
      <p>
        <Link href="/onboarding">실시간 시세 맵 열기</Link>
      </p>
      <p>
        <Link href="/auth/login">지금 비교해 보기</Link>
      </p>
    </section>
  );
}
