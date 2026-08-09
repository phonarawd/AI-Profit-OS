/**
 * FactToolService — Engine §47.12 / §47.15
 * 13 read-only Fact loaders (FACT_TOOLS catalog) · mutation tools 0
 */

import { Injectable } from "@nestjs/common";
import { KycService } from "../compliance/kyc.service";
import { PostgresService } from "../db/postgres";
import { LedgerBucketsService } from "../ledger/ledger.buckets.service";
import { MissionProgramService } from "../missions/mission.program.service";
import { ReferralEdgeService } from "../referral/referral.edge.service";
import { ReferralProgramService } from "../referral/referral.program.service";
import { DepositAddressService } from "../wallet/deposit-address.service";
import { DepositConfigService } from "../wallet/deposit-config.service";
import {
  assertToolsAllowedForLane,
  buildFactCard,
  FACT_TOOLS,
  isFactTool,
  partitionFreshness,
} from "./ai.engine";
import { HelpRagService } from "./help-rag.service";
import type { FactToolLoadResult, FactToolName } from "./fact-tool.types";
import { UserTwinService } from "./user-twin.service";

const TTL_LEDGER_SEC = 30;
const TTL_OPP_SEC = 60;
const TTL_GUIDE_SEC = 300;

@Injectable()
export class FactToolService {
  constructor(
    private readonly db: PostgresService,
    private readonly buckets: LedgerBucketsService,
    private readonly depositAddress: DepositAddressService,
    private readonly depositConfig: DepositConfigService,
    private readonly kyc: KycService,
    private readonly referralProgram: ReferralProgramService,
    private readonly referralEdges: ReferralEdgeService,
    private readonly missions: MissionProgramService,
    private readonly help: HelpRagService,
    private readonly twin: UserTwinService,
  ) {}

  catalog(): readonly string[] {
    return FACT_TOOLS;
  }

  async loadTools(
    userId: string,
    tools: string[],
    opts: { query?: string } = {},
  ): Promise<{
    facts: ReturnType<typeof buildFactCard>[];
    toolsCalled: FactToolName[];
    stale: boolean;
  }> {
    const list = (Array.isArray(tools) ? tools : []).filter((t) =>
      isFactTool(t),
    ) as FactToolName[];
    assertToolsAllowedForLane("P", list);

    const facts: ReturnType<typeof buildFactCard>[] = [];
    const toolsCalled: FactToolName[] = [];

    for (const tool of list) {
      const loaded = await this.loadOne(userId, tool, opts.query);
      toolsCalled.push(loaded.tool);
      for (const raw of loaded.facts) {
        facts.push(buildFactCard(raw));
      }
    }

    const part = partitionFreshness(facts);
    return {
      facts,
      toolsCalled,
      stale: part.needsRefresh,
    };
  }

  async loadOne(
    userId: string,
    tool: FactToolName,
    query?: string,
  ): Promise<FactToolLoadResult> {
    switch (tool) {
      case "getBalance":
      case "getBuckets":
        return this.loadBuckets(userId, tool);
      case "getDepositUsdt":
        return this.loadDepositUsdt(userId);
      case "getKrwDeposit":
        return this.loadKrwDeposit(userId);
      case "getOpportunity":
        return this.loadOpportunity(userId);
      case "getExecution":
        return this.loadExecution(userId);
      case "getKyc":
        return this.loadKyc(userId);
      case "getReferral":
        return this.loadReferral(userId);
      case "getCampaigns":
        return this.loadCampaigns();
      case "getPractice":
        return this.loadPractice(userId);
      case "getUsdtGuide":
        return this.loadUsdtGuide(userId);
      case "getBenefitsSummary":
        return this.loadBenefits(userId);
      case "searchHelp":
        return this.loadHelp(query || "이용법");
      default: {
        const err = new Error(`FACT_TOOL_UNKNOWN:${tool}`);
        throw err;
      }
    }
  }

  private async loadBuckets(
    userId: string,
    tool: FactToolName,
  ): Promise<FactToolLoadResult> {
    try {
      const b = await this.buckets.getUserBuckets(userId);
      return {
        tool,
        facts: [
          {
            source: "ledger",
            ttlSec: TTL_LEDGER_SEC,
            confidence: 1,
            payload: {
              principalUsdt: b.principalUsdt,
              profitUsdt: b.profitUsdt,
              lockedUsdt: b.lockedUsdt,
              practiceUsdt: b.practiceUsdt,
              liabilityUsdt: b.liabilityUsdt,
              asOfLedgerEntryId: b.asOfLedgerEntryId,
            },
          },
        ],
      };
    } catch {
      return {
        tool,
        facts: [
          {
            source: "ledger",
            ttlSec: TTL_LEDGER_SEC,
            confidence: 0.5,
            payload: {
              principalUsdt: "0",
              profitUsdt: "0",
              lockedUsdt: "0",
              practiceUsdt: "0",
              liabilityUsdt: "0",
              summary: "아직 지갑이 준비되지 않았어요. 입금으로 시작해 보세요.",
            },
          },
        ],
      };
    }
  }

  private async loadDepositUsdt(userId: string): Promise<FactToolLoadResult> {
    let address: string | null = null;
    try {
      const addr = await this.depositAddress.getOrCreate(userId);
      address = addr.trc20Address ?? null;
    } catch {
      address = null;
    }
    const cfg = await this.depositConfig.get();
    return {
      tool: "getDepositUsdt",
      facts: [
        {
          source: "wallet",
          ttlSec: TTL_GUIDE_SEC,
          confidence: 1,
          payload: {
            networkName: "트론",
            hasAddress: Boolean(address),
            addressHint: address ? "입금 주소가 준비됐어요" : "입금 주소를 준비 중이에요",
            uiConfirmations: cfg.usdtOnchain?.usdtUiConfirmations ?? null,
            guideText:
              "테더(USDT)·트론 네트워크로만 보내 주세요. 충전하면 미션을 시작할 수 있어요.",
            deepLink: "/me/deposit",
          },
        },
      ],
    };
  }

  private async loadKrwDeposit(userId: string): Promise<FactToolLoadResult> {
    let status = "none";
    let summary = "원화 충전 신청 내역이 없어요.";
    if (this.db.configured() && userId) {
      try {
        const r = await this.db.query<{ status: string }>(
          `SELECT status
             FROM public.krw_deposit_requests
            WHERE user_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT 1`,
          [userId],
        );
        if (r.rows[0]) {
          status = r.rows[0].status;
          if (status === "pending") summary = "원화 입금 확인 중이에요.";
          else if (status === "approved") summary = "원화 입금이 반영됐어요.";
          else if (status === "rejected") summary = "원화 입금이 거절됐어요. 내역에서 확인해 주세요.";
        }
      } catch {
        /* table may be empty */
      }
    }
    return {
      tool: "getKrwDeposit",
      facts: [
        {
          source: "wallet",
          ttlSec: TTL_LEDGER_SEC,
          confidence: 1,
          payload: {
            krwStatus: status,
            summary,
            deepLink: "/me/deposit",
          },
        },
      ],
    };
  }

  private async loadOpportunity(userId: string): Promise<FactToolLoadResult> {
    if (!this.db.configured()) {
      return {
        tool: "getOpportunity",
        facts: [
          {
            source: "opportunity",
            ttlSec: TTL_OPP_SEC,
            confidence: 0.5,
            payload: { count: 0, summary: "지금 볼 수 있는 미션을 불러오는 중이에요." },
          },
        ],
      };
    }
    try {
      const r = await this.db.query<{
        id: string;
        expected_profit_usdt: string;
        pricing: { compareReady?: boolean } | null;
      }>(
        `SELECT id::text,
                expected_profit_usdt::text,
                pricing
           FROM public.opportunities
          WHERE status = 'available'
            AND COALESCE((pricing->>'compareReady')::boolean, false) = true
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 5`,
      );
      const count = r.rows.length;
      const top = r.rows[0];
      return {
        tool: "getOpportunity",
        facts: [
          {
            source: "opportunity",
            ttlSec: TTL_OPP_SEC,
            confidence: 1,
            payload: {
              count,
              opportunityId: top?.id ?? null,
              expectedProfitUsdt: top?.expected_profit_usdt ?? null,
              summary:
                count > 0
                  ? `지금 참여 가능한 미션 ${count}건이 있어요.`
                  : "지금 바로 참여할 미션이 없어요. 조금 뒤 다시 확인해 주세요.",
              deepLink: "/me/opportunities",
              userIdHint: userId ? true : false,
            },
          },
        ],
      };
    } catch {
      return {
        tool: "getOpportunity",
        facts: [
          {
            source: "opportunity",
            ttlSec: TTL_OPP_SEC,
            confidence: 0.5,
            payload: { count: 0, summary: "미션 목록을 잠시 불러오지 못했어요." },
          },
        ],
      };
    }
  }

  private async loadExecution(userId: string): Promise<FactToolLoadResult> {
    let executionStatus = "none";
    let resultCode: string | null = null;
    if (this.db.configured() && userId) {
      try {
        const r = await this.db.query<{
          status: string;
          result_code: string | null;
        }>(
          `SELECT status, result_code
             FROM public.trade_executions
            WHERE user_id = $1::uuid
            ORDER BY updated_at DESC
            LIMIT 1`,
          [userId],
        );
        if (r.rows[0]) {
          executionStatus = r.rows[0].status;
          resultCode = r.rows[0].result_code;
        }
      } catch {
        /* ignore */
      }
    }
    return {
      tool: "getExecution",
      facts: [
        {
          source: "other",
          ttlSec: TTL_OPP_SEC,
          confidence: 1,
          payload: {
            kind: "execution",
            executionStatus,
            resultCode,
            /** §48.13 — no marketplace fill claim */
            orchestrateTruth: true,
          },
        },
      ],
    };
  }

  private async loadKyc(userId: string): Promise<FactToolLoadResult> {
    try {
      const st = await this.kyc.getStatus(userId);
      return {
        tool: "getKyc",
        facts: [
          {
            source: "kyc",
            ttlSec: TTL_GUIDE_SEC,
            confidence: 1,
            payload: {
              kycStatus: st.kycStatus,
              deepLink: "/me/kyc",
            },
          },
        ],
      };
    } catch {
      return {
        tool: "getKyc",
        facts: [
          {
            source: "kyc",
            ttlSec: TTL_GUIDE_SEC,
            confidence: 0.5,
            payload: { kycStatus: "none", deepLink: "/me/kyc" },
          },
        ],
      };
    }
  }

  private async loadReferral(userId: string): Promise<FactToolLoadResult> {
    const cfg = await this.referralProgram.get();
    let inviteCount = 0;
    if (userId) {
      try {
        const edges = await this.referralEdges.listByReferrer(userId);
        inviteCount = Array.isArray(edges) ? edges.length : 0;
      } catch {
        inviteCount = 0;
      }
    }
    return {
      tool: "getReferral",
      facts: [
        {
          source: "referral",
          ttlSec: TTL_GUIDE_SEC,
          confidence: 1,
          payload: {
            enabled: cfg.enabled,
            rewardsEnabled: cfg.rewardsEnabled,
            inviteCountUnlimited: true,
            inviteCount,
            summary: "친구 초대 혜택 조건은 초대 화면에서 확인할 수 있어요.",
            deepLink: "/me/invite",
          },
        },
      ],
    };
  }

  private async loadCampaigns(): Promise<FactToolLoadResult> {
    let count = 0;
    if (this.db.configured()) {
      try {
        const r = await this.db.query<{ n: string }>(
          `SELECT COUNT(*)::text AS n
             FROM public.mission_definitions
            WHERE section = 'campaign_inline'
              AND status = 'live'`,
        );
        count = Number(r.rows[0]?.n || 0) || 0;
      } catch {
        count = 0;
      }
    }
    return {
      tool: "getCampaigns",
      facts: [
        {
          source: "other",
          ttlSec: TTL_GUIDE_SEC,
          confidence: 1,
          payload: {
            campaignCount: count,
            summary:
              count > 0
                ? `진행 중인 이벤트 ${count}건이 있어요. 보상 없는 공지와는 달라요.`
                : "지금 진행 중인 이벤트는 없어요.",
            deepLink: "/me/events",
            noticeIsNotCampaign: true,
          },
        },
      ],
    };
  }

  private async loadPractice(userId: string): Promise<FactToolLoadResult> {
    try {
      const b = await this.buckets.getUserBuckets(userId);
      return {
        tool: "getPractice",
        facts: [
          {
            source: "ledger",
            ttlSec: TTL_LEDGER_SEC,
            confidence: 1,
            payload: {
              practiceUsdt: b.practiceUsdt,
              guideText:
                "연습 잔액은 미리 써보는 금액이에요. 출금·실참여 승격은 안 돼요.",
              notWithdrawable: true,
            },
          },
        ],
      };
    } catch {
      return {
        tool: "getPractice",
        facts: [
          {
            source: "ledger",
            ttlSec: TTL_LEDGER_SEC,
            confidence: 0.5,
            payload: {
              practiceUsdt: "0",
              guideText: "연습 잔액 안내를 불러오는 중이에요.",
              notWithdrawable: true,
            },
          },
        ],
      };
    }
  }

  private async loadUsdtGuide(userId: string): Promise<FactToolLoadResult> {
    let toneBand = "mid";
    let depositPref: string | null = null;
    try {
      const twin = await this.twin.get(userId);
      if (twin?.toneBand) toneBand = String(twin.toneBand);
      const payload = (twin as { payload?: Record<string, unknown> } | null)
        ?.payload;
      if (payload && typeof payload.depositPref === "string") {
        depositPref = payload.depositPref;
      }
    } catch {
      /* ignore */
    }
    return {
      tool: "getUsdtGuide",
      facts: [
        {
          source: "ux_prefs",
          ttlSec: TTL_GUIDE_SEC,
          confidence: 1,
          payload: {
            toneBand,
            depositPref,
            guideText:
              "테더 준비 안내를 열어드릴까요? 트론 네트워크 이름과 같은지 확인한 뒤 보내 주세요.",
            deepLink: "/me/deposit",
          },
        },
      ],
    };
  }

  private async loadBenefits(userId: string): Promise<FactToolLoadResult> {
    const cfg = await this.missions.getConfig();
    let claimableCount = 0;
    if (this.db.configured() && userId) {
      try {
        const r = await this.db.query<{ n: string }>(
          `SELECT COUNT(*)::text AS n
             FROM public.mission_accruals
            WHERE user_id = $1::uuid
              AND status IN ('pending', 'pending_hold', 'queued_pool')`,
          [userId],
        );
        claimableCount = Number(r.rows[0]?.n || 0) || 0;
      } catch {
        claimableCount = 0;
      }
    }
    return {
      tool: "getBenefitsSummary",
      facts: [
        {
          source: "other",
          ttlSec: TTL_LEDGER_SEC,
          confidence: 1,
          payload: {
            claimableCount,
            rewardsEnabled: cfg.rewardsEnabled,
            benefitsHref: "/me/benefits",
            summary: `받을 혜택 ${claimableCount}건 · /me/benefits`,
          },
        },
      ],
    };
  }

  private async loadHelp(query: string): Promise<FactToolLoadResult> {
    const chunks = await this.help.search(query, 3);
    return {
      tool: "searchHelp",
      facts: [
        {
          source: "other",
          ttlSec: TTL_GUIDE_SEC,
          confidence: 1,
          payload: {
            helpText: chunks.map((c) => c.text).join(" "),
            chunkIds: chunks.map((c) => c.id),
            summary: chunks[0]?.text || "이용법·약관은 도움말에서 확인할 수 있어요.",
          },
        },
      ],
    };
  }
}
