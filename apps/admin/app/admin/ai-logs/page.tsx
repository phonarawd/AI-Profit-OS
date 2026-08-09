"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";

const TABS = ["traces", "pick", "eval", "coach", "spotcheck"] as const;
type AiLogsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AiLogsTab, string> = {
  traces: "답변 기록",
  pick: "AI 추천 점수",
  eval: "평가 게이트",
  coach: "퍼뜩 코치",
  spotcheck: "이용성 점검",
};

/**
 * Admin §9.1.1 / Engine ai-feature-platform
 * Canon: admin-ai-logs · Admin AI score override FORBIDDEN
 */
function AiLogsContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): AiLogsTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as AiLogsTab;
    }
    return "traces";
  }, [searchParams]);

  return (
    <main className="p-6 text-lux-text" data-canon="admin-ai-logs">
      <h1 className="text-xl font-semibold">AI 분석 기록</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        엔진 점수만 표시 · 관리자 점수 수정 없음 · 자동 학습 꺼짐
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="AI 로그 탭">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ai-logs?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded px-3 py-1 text-sm bg-lux-surface-elevated"
                : "rounded px-3 py-1 text-sm text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "traces" && (
        <section className="mt-6" data-panel="answer_traces">
          <h2 className="text-base font-medium">답변 추적</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            GET /api/v1/admin/ai-logs · lane · provider_id · answer_path
          </p>
          <p className="mt-2 text-xs text-lux-text-muted" data-forbid="l3_money_execute">
            출금·지급 실행 경로 없음
          </p>
        </section>
      )}

      {tab === "pick" && (
        <section className="mt-6" data-panel="ai_pick_readonly">
          <h2 className="text-base font-medium">AI 추천 점수</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            GET /api/v1/admin/ai-pick/recent · POST /api/v1/admin/ai-pick/score
          </p>
          <p
            className="mt-2 text-xs text-lux-text-muted"
            data-forbid="ai_score_admin_override"
          >
            관리자 점수 덮어쓰기 금지 · sellSuccessRate 입력 금지
          </p>
        </section>
      )}

      {tab === "eval" && (
        <section className="mt-6" data-panel="eval_gate">
          <h2 className="text-base font-medium">평가 게이트</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            GET /api/v1/admin/ai-logs/eval/status · autoLearningEnabled=false
          </p>
          <p
            className="mt-2 text-xs"
            data-auto-learning="false"
            data-forbid="auto_learning_on"
          >
            통과한 후보만 운영 반영 · 실패 모델 운영 금지
          </p>
        </section>
      )}

      {tab === "coach" && (
        <section className="mt-6" data-panel="coach">
          <h2 className="text-base font-medium">퍼뜩 코치</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            GET /api/v1/admin/ai-logs/coach · Fact tools · toneBand · Eval P/G/S
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-lux-text-muted">
            <li data-field="answer_trace">answer-trace · lane · provider_id</li>
            <li data-field="eval_sets">
              eval/p_fact.jsonl · g_no_money.jsonl · s_refuse.jsonl
            </li>
            <li data-field="http">
              POST /api/v1/me/peotteok/chat · GET …/chips
            </li>
            <li data-forbid="money_hallucination">moneyHallucinationRate=0</li>
          </ul>
        </section>
      )}

      {tab === "spotcheck" && (
        <section className="mt-6" data-panel="spotcheck">
          <h2 className="text-base font-medium">이용성 점검</h2>
          <p className="mt-1 text-sm text-lux-text-muted">샘플 점검 큐</p>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <SearchParamsBoundary>
      <AiLogsContent />
    </SearchParamsBoundary>
  );
}
