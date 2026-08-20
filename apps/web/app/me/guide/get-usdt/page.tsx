import { PendingFigma } from "@/app/PendingFigma";
import Link from "next/link";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="테더 준비" />
      <section data-account-hub="guides">
        <p>테더를 준비하면 지갑에서 입금할 수 있어요.</p>
        <p>
          <Link href="/wallet/deposit">입금하기</Link>
        </p>
        <GuideLinks />
      </section>
    </>
  );
}
