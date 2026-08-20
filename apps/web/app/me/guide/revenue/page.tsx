import { PendingFigma } from "@/app/PendingFigma";
import { principalGuide } from "@aipo/ui/copy/ko";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="수익 안내" />
      <section data-account-hub="guides">
        <p>{principalGuide.whyKeep}</p>
        <p>{principalGuide.alwaysWithdraw}</p>
        <GuideLinks />
      </section>
    </>
  );
}
