"use client";

import { OpportunityRoomDesktop } from "../../../components/spark-dash-room/OpportunityRoomDesktop";
import { OpportunityRoomMobile } from "../../../components/spark-dash-room/OpportunityRoomMobile";
import { ParticipateConfirmSheet } from "../../../components/spark-dash-room/ParticipateConfirmSheet";
import {
  parseVisualSheetKey,
  visualKeyToSheet,
} from "../../../components/spark-dash-room/participate-sheet";
import { OPPORTUNITY_ROOM_VISUAL_FIXTURE } from "../../../components/spark-dash-room/visual-fixture";

function noop() {}

export function SparkDashRoomPreviewClient({ sheet }: { sheet?: string }) {
  const sheetKey = parseVisualSheetKey(sheet);
  const sheetModel = sheetKey ? visualKeyToSheet(sheetKey) : null;
  const item = OPPORTUNITY_ROOM_VISUAL_FIXTURE.item;

  const desktopCta = (
    <div className="sdr-actions">
      <button type="button" data-requires-preflight="true">
        이 기회로 수익 벌기 →
      </button>
    </div>
  );
  const mobileCta = (
    <div className="sdrm-cta-actions">
      <button type="button" className="sdrm-cta" data-requires-preflight="true">
        이 기회로 수익 벌기
      </button>
    </div>
  );

  const confirmSheet =
    sheetModel && item ? (
      <ParticipateConfirmSheet
        open
        phase={sheetModel.phase}
        errorCode={sheetModel.errorCode}
        errorStatus={sheetModel.errorStatus}
        capitalLine={`${item.capitalUsdt} USDT`}
        profitLine={item.expectedProfitUsdt ?? "—"}
        remain={sheetModel.remain}
        onClose={noop}
        onConfirm={noop}
        onRetryConfirm={noop}
        tradeHref={
          sheetModel.phase === "ACCEPTED" || sheetModel.phase === "REUSED"
            ? "/trades/dev-visual/execute"
            : null
        }
      />
    ) : null;

  return (
    <>
      <div className="sd-desktop-only">
        <OpportunityRoomDesktop model={OPPORTUNITY_ROOM_VISUAL_FIXTURE} primaryCta={desktopCta} />
      </div>
      <div className="sd-mobile-placeholder">
        <OpportunityRoomMobile model={OPPORTUNITY_ROOM_VISUAL_FIXTURE} primaryCta={mobileCta} />
      </div>
      {confirmSheet}
    </>
  );
}
