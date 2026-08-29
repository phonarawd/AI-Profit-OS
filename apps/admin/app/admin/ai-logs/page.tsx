"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import { maskLogPreview, readText } from "../../../lib/admin-truth";
import { AdminFetchNote, AdminTruth } from "../../../components/AdminTruth";

const TABS = ["traces", "pick", "eval", "coach", "spotcheck"] as const;
type AiLogsTab = (typeof TABS)[number];

const TAB_LABEL: Record<AiLogsTab, string> = {
  traces: "답변이 만들어진 과정",
  pick: "퍼뜩 추천 근거",
  eval: "서비스에 쓰기 전 확인",
  coach: "퍼뜩 답변 기준",
  spotcheck: "사람 사용성 점검",
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

function enabledLabel(value: unknown): string | null {
  if (value === true) return "사용 중";
  if (value === false) return "사용하지 않음";
  return readText(value);
}

function recommendationLabel(value: unknown): string | null {
  if (value === true) return "추천";
  if (value === false) return "추천하지 않음";
  return readText(value);
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
    <main className="p-6 text-pd-text" data-canon="admin-ai-logs" data-testid="admin-ai-logs-page">
      <h1 className="text-xl font-semibold">{T.admin.navigation.aiLogs}</h1>
      <p className="mt-2 text-sm text-pd-text-muted">
        퍼뜩이 어떤 근거로 답하고 추천했는지 확인합니다. 실제 판단 결과는 이 화면에서 바꾸지 않습니다.
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="퍼뜩 판단 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ai-logs?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded px-3 py-1 text-sm bg-pd-surface-elevated"
                : "rounded px-3 py-1 text-sm text-pd-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "traces" && (
        <section className="mt-6" data-panel="answer_traces" data-testid="ai-logs-traces-panel" data-list-api={listApi}>
          <h2 className="text-base font-medium">{T.admin.aiLogsTraces}</h2>
          <p className="mt-1 text-sm text-pd-text-muted">
            사용자가 입력한 전체 내용은 개인정보 보호를 위해 보여 주지 않습니다.
          </p>
          <p className="mt-2 text-xs text-pd-text-muted" data-forbid="l3_money_execute">
            이 화면에서는 출금이나 지급을 실행할 수 없습니다.
          </p>
          {!logs ? (
            <p className="mt-3 text-sm text-pd-text-muted">{T.admin.state.loading}</p>
          ) : !logs.ok ? (
            <AdminFetchNote failure={logs.failure} />
          ) : logItems && logItems.length === 0 ? (
            <p className="mt-3 text-sm text-pd-text-muted" data-testid="ai-logs-empty-traces">
              표시할 기록이 없습니다.
            </p>
          ) : logItems ? (
            <ul className="mt-3 space-y-3">
              {logItems.map((item, idx) => (
                <li key={readText(item.id) ?? String(idx)} className="rounded border border-pd-border p-3 text-sm">
                  <p>답변 종류 <AdminTruth value={laneLabel(item.lane)} /></p>
                  <p>안전 확인 <AdminTruth value={guardLabel(item.guard_result ?? item.guardResult)} /></p>
                  <p>미리보기 <AdminTruth value={maskLogPreview(item.answer_preview ?? item.answerPreview)} /></p>
                  <p>만든 시각 <AdminTruth value={readText(item.created_at ?? item.createdAt)} /></p>
                  <details className="admin-details">
                    <summary>자세한 판단 정보</summary>
                    <p>답변 제공처 <AdminTruth value={readText(item.provider_id ?? item.providerId)} /></p>
                    <p>처리 방식 <AdminTruth value={readText(item.answer_path ?? item.answerPath)} /></p>
                  </details>
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
          <h2 className="text-base font-medium">{T.admin.aiPickScores}</h2>
          <p
            className="mt-2 text-xs text-pd-text-muted"
            data-forbid="ai_score_admin_override"
          >
            추천 점수는 퍼뜩의 실제 판단 결과이며 이 화면에서 바꿀 수 없습니다.
          </p>
          {!picks ? (
            <p className="mt-3 text-sm text-pd-text-muted">{T.admin.state.loading}</p>
          ) : !picks.ok ? (
            <AdminFetchNote failure={picks.failure} />
          ) : pickItems && pickItems.length === 0 ? (
            <p className="mt-3 text-sm text-pd-text-muted" data-testid="ai-logs-empty-pick">
              표시할 점수가 없습니다.
            </p>
          ) : pickItems ? (
            <ul className="mt-3 space-y-3">
              {pickItems.map((item, idx) => (
                <li key={readText(item.opportunity_id ?? item.opportunityId) ?? String(idx)} className="rounded border border-pd-border p-3 text-sm">
                  <p>추천 확신 정도 <AdminTruth value={readText(item.ai_confidence_score ?? item.aiConfidenceScore)} /></p>
                  <p>추천 결과 <AdminTruth value={recommendationLabel(item.is_ai_pick ?? item.isAiPick)} /></p>
                  <details className="admin-details">
                    <summary>자세한 판단 정보</summary>
                    <p>판단 기록 번호 <AdminTruth value={readText(item.feature_vector_hash ?? item.featureVectorHash)} /></p>
                  </details>
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
          <h2 className="text-base font-medium">{T.admin.aiEvalGate}</h2>
          <p
            className="mt-2 text-xs"
            data-auto-learning="false"
            data-forbid="auto_learning_on"
          >
            안전 확인을 마친 답변 기준만 서비스에 반영합니다.
          </p>
          {!evalStatus ? (
            <p className="mt-3 text-sm text-pd-text-muted">{T.admin.state.loading}</p>
          ) : !evalStatus.ok ? (
            <AdminFetchNote failure={evalStatus.failure} />
          ) : (
            <p className="mt-3 text-sm">
              스스로 답변 기준 바꾸기 <AdminTruth value={enabledLabel(evalStatus.data.autoLearningEnabled)} />
            </p>
          )}
        </section>
      )}

      {tab === "coach" && (
        <section className="mt-6" data-panel="coach" data-testid="ai-logs-coach-panel" data-coach-api={coachApi}>
          <h2 className="text-base font-medium">{T.admin.aiCoach}</h2>
          {!coach ? (
            <p className="mt-3 text-sm text-pd-text-muted">{T.admin.state.loading}</p>
          ) : !coach.ok ? (
            <AdminFetchNote failure={coach.failure} />
          ) : (
            <>
              <p className="mt-3 text-sm">
                스스로 답변 기준 바꾸기 <AdminTruth value={enabledLabel(coach.data.autoLearningEnabled)} />
              </p>
              <p className="mt-2 text-sm" data-forbid="money_hallucination">
                근거 없는 수익 숫자 허용 한도 <AdminTruth value={readText(coach.data.moneyHallucinationRateMax)} />
              </p>
              <details className="admin-details">
                <summary>자세한 확인 기준</summary>
                <ul className="mt-2 list-disc pl-5 text-sm text-pd-text-muted">
                  {asList(coach.data.factTools).map((tool) => (
                    <li key={tool} data-field="factTools">{tool}</li>
                  ))}
                  {asList(coach.data.evalSets).map((set) => (
                    <li key={set} data-field="eval_sets">{set}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </section>
      )}

      {tab === "spotcheck" && (
        <section className="mt-6" data-panel="spotcheck" data-testid="ai-logs-spotcheck-panel">
          <h2 className="text-base font-medium">사람 사용성 점검</h2>
          <p className="mt-2 text-sm text-pd-text-muted">
            사람이 직접 확인한 결과만 표시합니다. 자동 점검 결과로 대신하지 않습니다.
          </p>
          <p className="mt-3 text-sm text-pd-text-muted" data-testid="ai-logs-empty-spotcheck">
            아직 사람이 직접 확인한 결과가 없습니다.
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
