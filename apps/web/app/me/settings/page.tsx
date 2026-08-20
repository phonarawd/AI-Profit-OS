import { PendingFigma } from "@/app/PendingFigma";
import { SettingsClient } from "./SettingsClient";

export default function Page() {
  return (
    <>
      <PendingFigma title="설정" />
      <SettingsClient />
    </>
  );
}
