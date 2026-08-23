"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { maskLogPreview, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["traces", "pick", "eval", "coach", "spotcheck"] as const;
type AiLogsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AiLogsTab, string> = {
  traces: "답변 기록",
  pick: "AI 추천 점수",
  eval: "평가 게이트",
  coach: "퍼뜩 코치",
  spotcheck: "이용성 점검",
};

type LogItem = {
  id?: unknown;
  lane?: unknown;
  provider_id?: unknown;
  providerId?: unknown;
  answer_path?: unknown;
  answerPath?: unknown;
  guard_result?: unknown;
  guardResult?: unknown;
  answer_preview?: unknown;
  answerPreview?: unknown;
  created_at?: unknown;
  createdAt?: unknown;
};

type PickItem = {
  opportunity_id?: unknown;
  opportunityId?: unknown;
  ai_confidence_score?: unknown;
  aiConfidenceScore?: unknown;
  is_ai_pick?: unknown;
  isAiPick?: unknown;
  feature_vector_hash?: unknown;
  featureVectorHash?: unknown;
};

type LogList = { items?: LogItem[] };
type PickList = { items?: PickItem[] };
type EvalStatus = { autoLearningEnabled?: unknown };
type CoachCatalog = {
  factTools?: unknown;
  toneBands?: unknown;
  evalSets?: unknown;
  autoLearningEnabled?: unknown;
  moneyHallucinationRateMax?: unknown;
};

function laneLabel(value: unknown): string | null {
  const lane = readText(value);
  if (lane === "P") return "사실";
  if (lane === "G") return "일반";
  if (lane === "S") return "거절";
  return lane;
}

function guardLabel(value: unknown): string | null {
  if (!value || typeof value !== "object") return readText(value);
  const status = readText((value as { status?: unknown }).status);
  if (status === "pass") return "통과";
  if (status === "refresh") return "다시 확인";
  if (status === "block") return "차단";
  if (status === "reroute_p") return "사실로 전환";
  if (status === "ungrounded") return "근거 없음";
  return status;
}

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => readText(item)).filter((item): item is string => Boolean(item));
}

function AiLogsContent() {
  const searchParams = useSearchParams();
  const tab = useMemo((): AiLogsTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) {
      return raw as AiLogsTab;
    }
    return "traces";
  }, [searchParams]);

  const listApi = "/api/v1/admin/ai-logs";
  const pickApi = "/api/v1/admin/ai-pick/recent";
  const evalApi = "/api/v1/admin/ai-logs/eval/status";
  const coachApi = "/api/v1/admin/ai-logs/coach";

  const [logs, setLogs] = useState<AdminResult<LogList> | null>(null);
  const [picks, setPicks] = useState<AdminResult<PickList> | null>(null);
  const [evalStatus, setEvalStatus] = useState<AdminResult<EvalStatus> | null>(null);
  const [coach, setCoach] = useState<AdminResult<CoachCatalog> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (tab === "traces") {
        const next = await adminGet<LogList>(listApi);
        if (!cancelled) setLogs(next);
      }
      if (tab === "pick") {
        const next = await adminGet<PickList>(pickApi);
        if (!cancelled) setPicks(next);
      }
      if (tab === "eval") {
        const next = await adminGet<EvalStatus>(evalApi);
        if (!cancelled) setEvalStatus(next);
      }
      if (tab === "coach") {
        const next = await adminGet<CoachCatalog>(coachApi);
        if (!cancelled) setCoach(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const logItems = logs?.ok && Array.isArray(logs.data.items) ? logs.data.items : null;
  const pickItems = picks?.ok && Array.isArray(picks.data.items) ? picks.data.items : null;

  return (
    <main className="p-6 text-lux-text" data-canon="admin-ai-logs" data-testid="admin-ai-logs-page">
      <h1 className="text-xl font-semibold">AI 분석 기록</h1>
      <p className="mt-2 text-sm text-lux-text-muted">
        엔진 점수만 표시 · 관리자 점수 수정 없음 · 자동 학습 깨짐
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
        <section className="mt-6" data-panel="answer_traces" data-testid="ai-logs-traces-panel" data-list-api={listApi}>
          <h2 className="text-base font-medium">답변 추적</h2>
          <p className="mt-1 text-sm text-lux-text-muted">
            프롬프트 원문은 보여 주지 않습니다.
          </p>
          <p className="mt-2 text-xs text-lux-text-muted">API: {listApi}</p>
          <p className="mt-2 text-xs text-lux-text-muted" data-forbid="l3_money_execute">
            출금·지급 실행 경로 없음
          </p>
          {!logs ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !logs.ok ? (
            <AdminFetchNote failure={logs.failure} />
          ) : logItems && logItems.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted" data-testid="ai-logs-empty-traces">
              표시할 기록이 없습니다.
            </p>
          ) : logItems ? (
            <ul className="mt-3 space-y-3">
              {logItems.map((item, idx) => (
                <li key={readText(item.id) ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                  <p>갈래 <AdminTruth value={laneLabel(item.lane)} /></p>
                  <p>제공 <AdminTruth value={readText(item.provider_id ?? item.providerId)} /></p>
                  <p>답변 갈래 <AdminTruth value={readText(item.answer_path ?? item.answerPath)} /></p>
                  <p>검사 <AdminTruth value={guardLabel(item.guard_result ?? item.guardResult)} /></p>
                  <p>미리보기 <AdminTruth value={maskLogPreview(item.answer_preview ?? item.answerPreview)} /></p>
                  <p>시각 <AdminTruth value={readText(item.created_at ?? item.createdAt)} /></p>
                </li>
              ))}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      )}

      {tab === "pick" && (
        <section className="mt-6" data-panel="ai_pick_readonly" data-testid="ai-logs-pick-panel" data-pick-api={pickApi}>
          <h2 className="text-base font-medium">AI 추천 점수</h2>
          <p className="mt-1 text-sm text-lux-text-muted">API: {pickApi}</p>
          <p
            className="mt-2 text-xs text-lux-text-muted"
            data-forbid="ai_score_admin_override"
          >
            관리자 점수 덮어쓰기 금지
          </p>
          {!picks ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !picks.ok ? (
            <AdminFetchNote failure={picks.failure} />
          ) : pickItems && pickItems.length === 0 ? (
            <p className="mt-3 text-sm text-lux-text-muted" data-testid="ai-logs-empty-pick">
              표시할 점수가 없습니다.
            </p>
          ) : pickItems ? (
            <ul className="mt-3 space-y-3">
              {pickItems.map((item, idx) => (
                <li key={readText(item.opportunity_id ?? item.opportunityId) ?? String(idx)} className="rounded border border-lux-border p-3 text-sm">
                  <p>신뢰도 <AdminTruth value={readText(item.ai_confidence_score ?? item.aiConfidenceScore)} /></p>
                  <p>추천 <AdminTruth value={readText(item.is_ai_pick ?? item.isAiPick)} /></p>
                  <p>특징값 <AdminTruth value={readText(item.feature_vector_hash ?? item.featureVectorHash)} /></p>
                </li>
              ))}
            </ul>
          ) : (
            <AdminTruth value={null} />
          )}
        </section>
      )}

      {tab === "eval" && (
        <section className="mt-6" data-panel="eval_gate" data-testid="ai-logs-eval-panel" data-eval-api={evalApi}>
          <h2 className="text-base font-medium">평가 게이트</h2>
          <p className="mt-1 text-sm text-lux-text-muted">API: {evalApi}</p>
          <p
            className="mt-2 text-xs"
            data-auto-learning="false"
            data-forbid="auto_learning_on"
          >
            통과한 후보만 운영 반영 · 실패 모델 운영 금지
          </p>
          {!evalStatus ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !evalStatus.ok ? (
            <AdminFetchNote failure={evalStatus.failure} />
          ) : (
            <p className="mt-3 text-sm">
              자동 학습 <AdminTruth value={readText(evalStatus.data.autoLearningEnabled)} />
            </p>
          )}
        </section>
      )}

      {tab === "coach" && (
        <section className="mt-6" data-panel="coach" data-testid="ai-logs-coach-panel" data-coach-api={coachApi}>
          <h2 className="text-base font-medium">퍼뜩 코치</h2>
          <p className="mt-1 text-sm text-lux-text-muted">API: {coachApi}</p>
          {!coach ? (
            <p className="mt-3 text-sm text-lux-text-muted">불러오는 중</p>
          ) : !coach.ok ? (
            <AdminFetchNote failure={coach.failure} />
          ) : (
            <>
              <p className="mt-3 text-sm">
                자동 학습 <AdminTruth value={readText(coach.data.autoLearningEnabled)} />
              </p>
              <p className="mt-2 text-sm" data-forbid="money_hallucination">
                수익 숫자 창작 한도 <AdminTruth value={readText(coach.data.moneyHallucinationRateMax)} />
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-lux-text-muted">
                {asList(coach.data.factTools).map((tool) => (
                  <li key={tool} data-field="factTools">{tool}</li>
                ))}
                {asList(coach.data.evalSets).map((set) => (
                  <li key={set} data-field="eval_sets">{set}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {tab === "spotcheck" && (
        <section className="mt-6" data-panel="spotcheck" data-testid="ai-logs-spotcheck-panel">
          <h2 className="text-base font-medium">이용성 점검</h2>
          <p className="mt-3 text-sm text-lux-text-muted" data-testid="ai-logs-empty-spotcheck">
            이용성 점검 목록이 없습니다.
          </p>
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
