"use client";

import { ProfitsDesktop } from "../../../components/spark-dash-profits/ProfitsDesktop";
import { ProfitsMobile } from "../../../components/spark-dash-profits/ProfitsMobile";
import { PROFITS_DESKTOP_VISUAL_FIXTURE } from "../../../components/spark-dash-profits/visual-fixture";

export function SparkDashProfitsPreviewClient() {
  return (
    <>
      <div className="sd-desktop-only">
        <ProfitsDesktop model={PROFITS_DESKTOP_VISUAL_FIXTURE} />
      </div>
      <div className="sd-mobile-placeholder">
        <ProfitsMobile model={PROFITS_DESKTOP_VISUAL_FIXTURE} />
      </div>
    </>
  );
}
