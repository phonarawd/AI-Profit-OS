import { PendingFigma } from "@/app/PendingFigma";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="시세 안내" />
      <section data-account-hub="guides">
        <p>시세 안내입니다. 투자 권유가 아니에요.</p>
        <GuideLinks />
      </section>
    </>
  );
}
