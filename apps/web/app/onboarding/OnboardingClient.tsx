import Link from "next/link";

/** 가입 직후 설명. 수익 약속 스테퍼 0. Home CTA만. */
export function OnboardingClient() {
  return (
    <section data-onboarding="true">
      <p>비교를 이어가려면 계정으로 들어와요.</p>
      <p>
        <Link href="/">시작하기</Link>
      </p>
    </section>
  );
}
