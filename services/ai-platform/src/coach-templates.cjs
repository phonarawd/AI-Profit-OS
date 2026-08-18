/**
 * 퍼뜩 coach templates — Engine §47.12 / §47.15
 * S refuse · P refresh · chips · toneBand shapes · deep-links
 * Copy keys align with T.peotteok.* (packages/ui/copy/ko/peotteok.ts)
 */

"use strict";

const { G_BUSY_TEMPLATE } = require("./llm-quota.cjs");

/** S-lane: never execute — UI deep-link only */
const S_REFUSE_TEMPLATE = Object.freeze({
  text: "출금·지급은 제가 대신 실행할 수 없어요. 출금 화면에서 직접 진행해 주세요.",
  deepLink: "/me/wallet/withdraw",
  copyKey: "T.peotteok.sRefuse",
});

/** P-lane stale Fact — estimate 0 */
const P_REFRESH_TEMPLATE = Object.freeze({
  text: "방금 숫자가 바뀌었을 수 있어요. 최신 잔액·기회를 다시 불러올게요.",
  copyKey: "T.peotteok.pRefresh",
});

/**
 * Engine §47.16.4 — known off-topic / injection → no LLM · tools=[] · P칩 유도
 */
const SCOPE_REDIRECT_TEMPLATE = Object.freeze({
  text: "그건 퍼뜩에서 도와드릴 수 있는 범위가 아니에요. 잔액·미션·이용법처럼 앱 관련 질문을 해 주세요.",
  copyKey: "T.peotteok.scopeRedirect",
  suggestChips: true,
});

/** CS deep-link when user is stuck */
const CS_DEEP_LINK = Object.freeze({
  href: "/me/support",
  copyKey: "T.peotteok.csDeepLink",
});

/**
 * Suggestion chips (P priority) — copyKey only · amounts from Fact at runtime
 */
const FACT_CHIPS = Object.freeze([
  Object.freeze({
    id: "balance",
    labelKey: "T.peotteok.chipBalance",
    prompt: "지금 출금 가능한 수익이 얼마예요?",
    tools: Object.freeze(["getBalance", "getBuckets"]),
    priority: 10,
  }),
  Object.freeze({
    id: "deposit",
    labelKey: "T.peotteok.chipDeposit",
    prompt: "충전하면 미션을 시작할 수 있나요?",
    tools: Object.freeze(["getDepositUsdt", "getKrwDeposit"]),
    priority: 20,
  }),
  Object.freeze({
    id: "opportunity",
    labelKey: "T.peotteok.chipOpportunity",
    prompt: "지금 참여할 수 있는 미션 알려줘",
    tools: Object.freeze(["getOpportunity"]),
    priority: 30,
  }),
  Object.freeze({
    id: "benefits",
    labelKey: "T.peotteok.chipBenefits",
    prompt: "받을 수 있는 혜택 요약해줘",
    tools: Object.freeze(["getBenefitsSummary"]),
    priority: 40,
    deepLink: "/me/benefits",
  }),
  Object.freeze({
    id: "invite",
    labelKey: "T.peotteok.chipInvite",
    prompt: "친구 초대 혜택 조건 알려줘",
    tools: Object.freeze(["getReferral"]),
    priority: 50,
    deepLink: "/me/invite",
  }),
  Object.freeze({
    id: "kyc",
    labelKey: "T.peotteok.chipKyc",
    prompt: "출금 전에 본인 확인이 필요한가요?",
    tools: Object.freeze(["getKyc"]),
    priority: 15,
  }),
  Object.freeze({
    id: "usdt",
    labelKey: "T.peotteok.chipUsdt",
    prompt: "테더 준비 안내 열어줄래?",
    tools: Object.freeze(["getUsdtGuide"]),
    priority: 25,
  }),
]);

/**
 * @param {"young"|"mid"|"senior"|string|null|undefined} toneBand
 * @param {string} body
 */
function shapeByTone(toneBand, body) {
  const t = String(toneBand || "mid");
  const text = String(body || "").trim();
  if (!text) return "";
  if (t === "senior") {
    const first = text.split(/[.。!?\n]/)[0] || text;
    return `${first.trim()}. [다음/자세히]`;
  }
  if (t === "young") {
    const line = text.split(/\n/)[0].slice(0, 80);
    return `• ${line} 🙂`;
  }
  return text;
}

/**
 * Render P answer from Fact cards only (no invented numbers)
 * @param {object[]} facts
 * @param {object} [opts]
 */
function renderFactAnswer(facts, opts = {}) {
  const list = Array.isArray(facts) ? facts : [];
  if (list.length === 0) {
    return P_REFRESH_TEMPLATE.text;
  }
  const lines = [];
  for (const f of list) {
    const p = f?.payload && typeof f.payload === "object" ? f.payload : {};
    if (p.profitUsdt != null || p.liabilityUsdt != null) {
      lines.push(
        `지금 출금 가능한 수익은 ${String(p.profitUsdt ?? "0")} USDT예요. (원장 기준)`,
      );
      if (p.principalUsdt != null) {
        lines.push(`원금 버킷은 ${String(p.principalUsdt)} USDT예요.`);
      }
      continue;
    }
    if (p.kycStatus != null) {
      lines.push(`본인 확인 상태: ${String(p.kycStatus)}. 출금 전 1회 확인이 필요해요.`);
      continue;
    }
    if (p.expectedProfitUsdt != null || p.opportunityId != null) {
      const n = p.count != null ? String(p.count) : "1";
      const profit =
        p.expectedProfitUsdt != null
          ? ` 예상 수익 ${String(p.expectedProfitUsdt)} USDT`
          : "";
      lines.push(`지금 볼 수 있는 미션 ${n}건${profit}. (원장·기회 Fact)`);
      continue;
    }
    if (p.claimableCount != null || p.benefitsHref) {
      lines.push(
        `받을 혜택 ${String(p.claimableCount ?? 0)}건 · 자세히: ${String(p.benefitsHref || "/me/benefits")}`,
      );
      continue;
    }
    if (p.guideText) {
      lines.push(String(p.guideText));
      continue;
    }
    if (p.kind === "execution" || p.executionStatus != null) {
      const st = String(p.executionStatus || p.status || "none");
      const map = {
        running: "진행 중이에요.",
        safe_stop: "안전하게 멈췄어요.",
        success: "완료됐어요.",
        none: "진행 중인 미션이 없어요.",
        requeue: "다시 맞추는 중이에요.",
      };
      lines.push(map[st] || `상태: ${st}`);
      continue;
    }
    if (p.helpText) {
      lines.push(String(p.helpText));
      continue;
    }
    if (p.summary) {
      lines.push(String(p.summary));
    }
  }
  const body = lines.length ? lines.join(" ") : P_REFRESH_TEMPLATE.text;
  return shapeByTone(opts.toneBand, body);
}

/**
 * @param {object} [opts]
 * @param {string} [opts.toneBand]
 * @param {boolean} [opts.needsKyc]
 * @param {boolean} [opts.lowBalance]
 */
function pickChips(opts = {}) {
  const chips = [...FACT_CHIPS];
  chips.sort((a, b) => {
    let pa = a.priority;
    let pb = b.priority;
    if (opts.needsKyc) {
      if (a.id === "kyc") pa = 1;
      if (b.id === "kyc") pb = 1;
    }
    if (opts.lowBalance) {
      if (a.id === "deposit") pa = 2;
      if (b.id === "deposit") pb = 2;
    }
    return pa - pb;
  });
  return Object.freeze(chips.slice(0, 5));
}

module.exports = {
  S_REFUSE_TEMPLATE,
  P_REFRESH_TEMPLATE,
  SCOPE_REDIRECT_TEMPLATE,
  CS_DEEP_LINK,
  FACT_CHIPS,
  G_BUSY_TEMPLATE,
  shapeByTone,
  renderFactAnswer,
  pickChips,
};
