"use client";

import { OpportunityRoomDesktop } from "../../../components/spark-dash-room/OpportunityRoomDesktop";
import { ParticipateConfirmSheet } from "../../../components/spark-dash-room/ParticipateConfirmSheet";
import {
  parseVisualSheetKey,
  visualKeyToSheet,
} from "../../../components/spark-dash-room/participate-sheet";
import { OPPORTUNITY_ROOM_VISUAL_FIXTURE } from "../../../components/spark-dash-room/visual-fixture";

function noop() {}

export function SparkDashRoomPreviewClient({ sheet }: { sheet?: string }) {
  const sheetKey = parseVisualSheetKey(sheet);
  const model = sheetKey ? visualKeyToSheet(sheetKey) : null;
  const item = OPPORTUNITY_ROOM_VISUAL_FIXTURE.item;
  return (
    <OpportunityRoomDesktop
      model={OPPORTUNITY_ROOM_VISUAL_FIXTURE}
      primaryCta={
        <div className="sdr-actions">
          <button type="button" data-requires-preflight="true">
            이 기회로 수익 벌기 →
          </button>
        </div>
      }
    >
      {model && item ? (
        <ParticipateConfirmSheet
          open
          phase={model.phase}
          errorCode={model.errorCode}
          errorStatus={model.errorStatus}
          capitalLine={`${item.capitalUsdt} USDT`}
          profitLine={item.expectedProfitUsdt ?? "—"}
          remain={model.remain}
          onClose={noop}
          onConfirm={noop}
          onRetryConfirm={noop}
          tradeHref={
            model.phase === "ACCEPTED" || model.phase === "REUSED"
              ? "/trades/dev-visual/execute"
              : null
          }
        />
      ) : null}
    </OpportunityRoomDesktop>
  );
}
