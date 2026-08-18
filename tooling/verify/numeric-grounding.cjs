/**
 * verify:numeric-grounding — Engine §47.16.5
 * date-aware grounding · serverDerivedAllowlist · guard ungrounded ·
 * CoachOrchestrator fact fallback · prompt GROUNDED_NUMERIC_JSON
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const fails = [];

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    fails.push(`missing: ${rel}`);
    return "";
  }
  return fs.readFileSync(p, "utf8");
}

const required = [
  "services/ai-platform/src/numeric-grounding.cjs",
  "services/ai-platform/src/answer-guard.cjs",
  "services/ai-platform/src/coach-prompt.cjs",
  "services/ai-platform/src/ai-log.cjs",
  "services/api-nest/src/ai/coach.orchestrator.ts",
  "schemas/ai-answer-trace.v1.json",
  "services/market-intelligence/src/home-read-model.cjs",
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) fails.push(`missing: ${rel}`);
}
if (fails.length) {
  console.error("[verify:numeric-grounding] FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}

const ai = require(path.join(root, "services/ai-platform/src/index.cjs"));
const mi = require(path.join(
  root,
  "services/market-intelligence/src/home-read-model.cjs",
));

// --- structural ---
if (typeof ai.groundAnswerNumerics !== "function") {
  fails.push("groundAnswerNumerics must be exported");
}
if (typeof ai.buildGroundedNumericContext !== "function") {
  fails.push("buildGroundedNumericContext must be exported");
}
if (typeof ai.collectGroundedNumerics !== "function") {
  fails.push("collectGroundedNumerics must be exported");
}
if (typeof ai.tagServerDerived !== "function") {
  fails.push("tagServerDerived must be exported");
}
if (!ai.GUARD_STATUSES.includes("ungrounded")) {
  fails.push("GUARD_STATUSES must include ungrounded");
}
if (!ai.ALLOWED_DERIVATION_IDS.has(mi.TODAY_POSSIBLE_DERIVATION_ID)) {
  fails.push("allowlist must include TODAY_POSSIBLE_DERIVATION_ID");
}
if (
  !ai.ALLOWED_DERIVATION_IDS.has(
    "home.ledger_total_settlement_completed_today_count",
  )
) {
  fails.push("allowlist must include ledgerTotal settlement COUNT derivation");
}

const schema = JSON.parse(read("schemas/ai-answer-trace.v1.json") || "{}");
const guardEnum = schema.properties?.guard_result?.properties?.status?.enum || [];
if (!guardEnum.includes("ungrounded")) {
  fails.push("ai-answer-trace schema must enum ungrounded");
}

const orch = read("services/api-nest/src/ai/coach.orchestrator.ts");
if (!orch.includes('guard.status === "ungrounded"')) {
  fails.push("CoachOrchestrator must handle ungrounded status");
}
if (!orch.includes("renderFactAnswer(factsUsed")) {
  fails.push("ungrounded fallback must use renderFactAnswer");
}
if (!/answerPath/.test(orch) || !orch.includes("answerPath,")) {
  fails.push("CoachOrchestrator must pass answerPath into guardAnswer");
}

const promptSrc = read("services/ai-platform/src/coach-prompt.cjs");
if (!promptSrc.includes("GROUNDED_NUMERIC_JSON")) {
  fails.push("coach-prompt must inject GROUNDED_NUMERIC_JSON");
}
if (!promptSrc.includes("buildGroundedNumericContext")) {
  fails.push("coach-prompt must build grounded numeric context");
}

const guardSrc = read("services/ai-platform/src/answer-guard.cjs");
if (!guardSrc.includes("groundAnswerNumerics")) {
  fails.push("answer-guard must call groundAnswerNumerics");
}

// buildAiLogRecord accepts ungrounded
try {
  const rec = ai.buildAiLogRecord({
    intent: "balance",
    lane: "P",
    tools_called: ["getBalance"],
    facts_used: [],
    provider_id: "none",
    answer_path: "fact",
    guard_result: { status: "ungrounded", reason: "test" },
  });
  if (rec.guard_result.status !== "ungrounded") {
    fails.push("AI_LOG must accept ungrounded guard status");
  }
} catch (e) {
  fails.push(`AI_LOG ungrounded rejected: ${e.message}`);
}

function freshFact(payload, source = "ledger") {
  const now = Date.now();
  return ai.buildFactCard({
    source,
    payload,
    captured_at: new Date(now).toISOString(),
    expires_at: new Date(now + 60_000).toISOString(),
    confidence: 1,
  });
}

const DERIV_TODAY = mi.TODAY_POSSIBLE_DERIVATION_ID;
const DERIV_LEDGER = "home.ledger_total_settlement_completed_today_count";

// --- matrix ---
const matrix = [
  {
    id: "source_balance_grounded",
    facts: [freshFact({ liabilityUsdt: "12.5", profitUsdt: "3.25", principalUsdt: "100" })],
    answer: "지금 잔액은 12.5 USDT예요.",
    expectPass: true,
  },
  {
    id: "known_zero_preserved",
    facts: [freshFact({ liabilityUsdt: "0", profitUsdt: "0", principalUsdt: "0" })],
    answer: "지금 출금 가능한 수익은 0 USDT예요.",
    expectPass: true,
    extra() {
      const g = ai.collectGroundedNumerics([
        freshFact({ liabilityUsdt: "0", profitUsdt: "0" }),
      ]);
      const z = g.find((x) => x.field === "liabilityUsdt");
      if (!z || z.availability !== "known_zero" || z.value !== "0") {
        fails.push("known_zero: liabilityUsdt must stay 0 with known_zero");
      }
    },
  },
  {
    id: "null_not_coerced_to_zero",
    facts: [freshFact({ expectedProfitUsdt: null, count: 2, opportunityId: "x" }, "opportunity")],
    answer: "예상 수익은 0 USDT예요.",
    expectPass: false,
    expectReasonIncludes: "ungrounded",
    extra() {
      const g = ai.collectGroundedNumerics([
        freshFact({ expectedProfitUsdt: null }, "opportunity"),
      ]);
      const ep = g.find((x) => x.field === "expectedProfitUsdt");
      if (!ep || ep.availability !== "unknown" || ep.value != null) {
        fails.push("null expectedProfitUsdt must be unknown, not 0");
      }
    },
  },
  {
    id: "unauthorized_no_numeric_fact",
    facts: [freshFact({ unauthorized: true, liabilityUsdt: null })],
    answer: "잔액은 100 USDT예요.",
    expectPass: false,
    expectReasonIncludes: "unauthorized",
  },
  {
    id: "stale_metadata_preserved",
    facts: (() => {
      const past = Date.now() - 120_000;
      return [
        ai.buildFactCard({
          source: "ledger",
          payload: { liabilityUsdt: "9" },
          captured_at: new Date(past).toISOString(),
          expires_at: new Date(past + 1000).toISOString(),
          confidence: 1,
        }),
      ];
    })(),
    answer: "잔액 9 USDT",
    expectPass: true, // llm_p numeric match; freshness refresh is separate guard
    extra() {
      const staleFact = ai.buildFactCard({
        source: "ledger",
        payload: { liabilityUsdt: "9" },
        captured_at: new Date(Date.now() - 120_000).toISOString(),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        confidence: 1,
      });
      const g = ai.collectGroundedNumerics([staleFact]);
      const hit = g.find((x) => x.field === "liabilityUsdt");
      if (!hit || hit.freshness !== "stale" || hit.availability !== "stale") {
        fails.push("stale value must keep stale metadata");
      }
      const ctx = ai.buildGroundedNumericContext([staleFact]);
      const item = ctx.items.find((x) => x.field === "liabilityUsdt");
      if (!item || item.freshness !== "stale") {
        fails.push("prompt context must preserve stale freshness");
      }
    },
  },
  {
    id: "deterministic_count",
    facts: [
      freshFact(
        { count: 3, opportunityIds: ["a", "b", "c"], expectedProfitUsdt: "1.5" },
        "opportunity",
      ),
    ],
    answer: "지금 볼 수 있는 미션 3건이 있어요. 예상 수익 1.5 USDT.",
    expectPass: true,
  },
  {
    id: "forbidden_derived_roi",
    facts: [
      freshFact(
        { count: 2, expectedProfitUsdt: "5", opportunityId: "o1" },
        "opportunity",
      ),
    ],
    answer: "이 미션 수익률은 40%예요.",
    expectPass: false,
    expectReasonIncludes: "percent",
    extra() {
      if (
        !ai.isForbiddenDerivedRoi("수익률 40%로 예상돼요", [
          freshFact({ expectedProfitUsdt: "5" }, "opportunity"),
        ])
      ) {
        fails.push("isForbiddenDerivedRoi must block invented ROI");
      }
    },
  },
  {
    id: "currency_without_unit_not_promoted",
    facts: [freshFact({ liabilityUsdt: "10" })],
    answer: "잔액은 열 정도예요.", // no numeric currency claim
    expectPass: true,
    extra() {
      const claims = ai.extractNumericClaims("잔액은 열 정도예요.");
      const cur = claims.filter((c) => c.kind === "currency" && c.enforce);
      if (cur.length) {
        fails.push("unitless prose must not invent currency claims");
      }
    },
  },
  {
    id: "cross_currency_sum_forbidden",
    facts: [
      freshFact({ liabilityUsdt: "10" }),
      freshFact({ amountKrw: "1000" }), // not a known field — KRW not grounded
    ],
    answer: "10 USDT와 1000원을 합치면 커요.",
    expectPass: false,
    expectReasonIncludes: "currency",
  },
  {
    id: "prompt_context_has_provenance",
    facts: [freshFact({ liabilityUsdt: "7.5", profitUsdt: "1" })],
    answer: "수익은 1 USDT예요.",
    expectPass: true,
    extra() {
      const msgs = ai.buildCoachMessages({
        lane: "P",
        userText: "잔액?",
        facts: [freshFact({ liabilityUsdt: "7.5", profitUsdt: "1" })],
      });
      const sys = msgs[0]?.content || "";
      if (!sys.includes("GROUNDED_NUMERIC_JSON=")) {
        fails.push("prompt missing GROUNDED_NUMERIC_JSON");
      }
      const m = sys.match(/GROUNDED_NUMERIC_JSON=(\{[\s\S]*\})(?:\n|$)/);
      if (!m) {
        fails.push("GROUNDED_NUMERIC_JSON parse failed");
        return;
      }
      // JSON may be followed by more lines — extract carefully
      const idx = sys.indexOf("GROUNDED_NUMERIC_JSON=");
      const jsonPart = sys.slice(idx + "GROUNDED_NUMERIC_JSON=".length).split("\n")[0];
      let ctx;
      try {
        ctx = JSON.parse(jsonPart);
      } catch (e) {
        fails.push(`GROUNDED_NUMERIC_JSON invalid JSON: ${e.message}`);
        return;
      }
      if (ctx.schema !== "grounded-numeric-context.v1") {
        fails.push("grounded context schema mismatch");
      }
      const liab = (ctx.items || []).find((x) => x.field === "liabilityUsdt");
      if (!liab || liab.value !== "7.5" || liab.provenance !== "fact") {
        fails.push("grounded context must carry value+provenance");
      }
    },
  },
  {
    id: "unsupported_numeric_not_injected",
    facts: [freshFact({ liabilityUsdt: "2" })],
    answer: "예상 ROI는 99%입니다.",
    expectPass: false,
    extra() {
      const ctx = ai.buildGroundedNumericContext([
        freshFact({ liabilityUsdt: "2" }),
      ]);
      if ((ctx.items || []).some((x) => x.kind === "percent")) {
        fails.push("unsupported ROI must not appear in grounded context");
      }
    },
  },
  {
    id: "guard_blocks_ungrounded_monetary",
    facts: [freshFact({ liabilityUsdt: "5" })],
    answer: "잔액은 999 USDT예요.",
    expectPass: false,
    viaGuard: true,
  },
  {
    id: "execution_ownership_fields_groundable",
    facts: [
      freshFact(
        {
          kind: "execution",
          executionStatus: "running",
          ownershipVerified: true,
          executionId: "11111111-1111-1111-1111-111111111111",
        },
        "other",
      ),
    ],
    answer: "진행 중이에요.", // no invented money
    expectPass: true,
    extra() {
      // id_like UUID in answer should not fail
      const r = ai.groundAnswerNumerics({
        lane: "P",
        answerPath: "llm_p",
        answerText: "실행 11111111-1111-1111-1111-111111111111 상태예요.",
        factsUsed: [
          freshFact(
            {
              kind: "execution",
              executionStatus: "running",
              ownershipVerified: true,
              executionId: "11111111-1111-1111-1111-111111111111",
            },
            "other",
          ),
        ],
      });
      if (!r.pass) fails.push("id_like must not be treated as monetary claim");
    },
  },
  {
    id: "opportunity_not_invented_roi",
    facts: [
      freshFact(
        { count: 1, expectedProfitUsdt: "2.2", opportunityId: "o" },
        "opportunity",
      ),
    ],
    answer: "이 기회는 수익률 80%라 확실해요.",
    expectPass: false,
  },
  {
    id: "home_today_possible_server_derived",
    facts: [
      freshFact(
        {
          todayPossibleProfitUsdt: "8.0",
          provenance: {
            todayPossibleProfitUsdt: {
              provenance: "server_derived",
              derivationId: DERIV_TODAY,
            },
          },
        },
        "opportunity",
      ),
    ],
    answer: "오늘 가능한 수익은 8.0 USDT예요.",
    expectPass: true,
    extra() {
      const tagged = ai.tagServerDerived("8.0", DERIV_TODAY);
      if (tagged.provenance !== "server_derived") {
        fails.push("tagServerDerived provenance");
      }
      try {
        ai.tagServerDerived("1", "invented.roi");
        fails.push("tagServerDerived must reject non-allowlisted id");
      } catch {
        /* expected */
      }
    },
  },
  {
    id: "home_ledger_total_count_semantics",
    facts: [
      freshFact(
        {
          ledgerTotal: 4,
          provenance: {
            ledgerTotal: {
              provenance: "server_derived",
              derivationId: DERIV_LEDGER,
            },
          },
        },
        "ledger",
      ),
    ],
    answer: "오늘 정산 완료 4건이에요.",
    expectPass: true,
    extra() {
      const g = ai.collectGroundedNumerics([
        freshFact(
          {
            ledgerTotal: 4,
            provenance: {
              ledgerTotal: {
                provenance: "server_derived",
                derivationId: DERIV_LEDGER,
              },
            },
          },
          "ledger",
        ),
      ]);
      const lt = g.find((x) => x.field === "ledgerTotal");
      if (!lt || lt.unit !== "count" || lt.provenance !== "server_derived") {
        fails.push("ledgerTotal must be count + server_derived");
      }
      if (lt.currency != null) {
        fails.push("ledgerTotal must not be promoted to currency");
      }
    },
  },
  {
    id: "date_without_fact_unsupported",
    facts: [freshFact({ liabilityUsdt: "1" })],
    answer: "이 미션은 8월 19일에 끝나요.",
    expectPass: false,
    expectReasonIncludes: "date",
  },
  {
    id: "date_with_fact_grounded",
    facts: [
      freshFact({
        liabilityUsdt: "1",
        endsAt: "2026-08-19T12:00:00.000Z",
      }),
    ],
    answer: "이 미션은 8월 19일에 끝나요.",
    expectPass: true,
  },
  {
    id: "ordinal_excluded",
    facts: [
      freshFact(
        {
          kind: "execution",
          executionStatus: "running",
          executionIds: ["a", "b"],
        },
        "other",
      ),
    ],
    answer: "그중 첫번째는 진행 중이에요.",
    expectPass: true,
  },
  {
    id: "skip_non_llm_p",
    facts: [freshFact({ liabilityUsdt: "1" })],
    answer: "잔액은 999 USDT예요.",
    expectPass: true,
    answerPath: "fact",
  },
];

for (const row of matrix) {
  try {
    if (typeof row.extra === "function") row.extra();
  } catch (e) {
    fails.push(`${row.id} extra threw: ${e.message}`);
  }

  const answerPath = row.answerPath || "llm_p";
  if (row.viaGuard) {
    const g = ai.guardAnswer({
      lane: "P",
      toolsCalled: ["getBalance"],
      factsUsed: row.facts,
      answerText: row.answer,
      answerPath,
    });
    if (row.expectPass && g.status !== "pass") {
      fails.push(`${row.id}: guard expected pass got ${g.status}/${g.reason}`);
    }
    if (!row.expectPass && g.status !== "ungrounded") {
      fails.push(
        `${row.id}: guard expected ungrounded got ${g.status}/${g.reason}`,
      );
    }
    continue;
  }

  const r = ai.groundAnswerNumerics({
    lane: "P",
    answerPath,
    answerText: row.answer,
    factsUsed: row.facts,
  });
  if (row.expectPass && !r.pass) {
    fails.push(`${row.id}: expected pass got ${r.status}/${r.reason}`);
  }
  if (!row.expectPass && r.pass) {
    fails.push(`${row.id}: expected fail but passed`);
  }
  if (
    !row.expectPass &&
    row.expectReasonIncludes &&
    !String(r.reason || "").includes(row.expectReasonIncludes)
  ) {
    fails.push(
      `${row.id}: reason expected to include ${row.expectReasonIncludes}, got ${r.reason}`,
    );
  }
}

// fact-only / no-autonomy / no-money-tools regression smoke
const s = ai.routeAssistant({ text: "출금해줘" });
if (s.lane !== "S" || s.tools_called.length !== 0) {
  fails.push("numeric-grounding must not weaken S no-autonomy");
}
const gLane = ai.routeAssistant({ text: "오늘 기분 어때?" });
if (gLane.lane !== "G" || gLane.tools_called.length !== 0) {
  fails.push("numeric-grounding must not give G money tools");
}
if (ai.FACT_TOOLS.includes("execute_withdraw")) {
  fails.push("FACT_TOOLS must not gain mutate tools");
}

// must not pull shadow-replay-naming forward (additive rename slice)
if (
  /ADVISORY_LABEL/.test(
    read("services/shadow-replay-engine/src/drift.cjs") || "",
  ) === false
) {
  // OK — shadow-replay-naming not started; absence is fine
}

const pkg = read("package.json");
if (!pkg.includes("verify:numeric-grounding")) {
  fails.push("package.json missing verify:numeric-grounding");
}
const catalog = read("tooling/verify/CATALOG.md");
if (!catalog.includes("numeric-grounding")) {
  fails.push("CATALOG.md missing numeric-grounding");
}
const domain = read("tooling/verify/domain-by-path.cjs");
if (!domain.includes("numeric-grounding.cjs")) {
  fails.push("domain-by-path must route numeric-grounding");
}

if (fails.length) {
  console.error("[verify:numeric-grounding] FAIL");
  for (const f of fails) console.error(" -", f);
  process.exit(1);
}
console.log(
  "[verify:numeric-grounding] PASS (grounding · date · allowlist · ungrounded · prompt)",
);
