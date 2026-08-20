import { PendingFigma } from "@/app/PendingFigma";
import { GuideLinks } from "../../GuideLinks";

export default function Page() {
  return (
    <>
      <PendingFigma title="자주 묻는 질문" />
      <section data-account-hub="guides">
        <GuideLinks />
      </section>
    </>
  );
}
