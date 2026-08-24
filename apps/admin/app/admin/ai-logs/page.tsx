"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@aipo/ui/components/SearchParamsBoundary";
import { T } from "@aipo/ui/copy/ko";
import { adminGet, type AdminResult } from "../../../lib/admin-api";
import {
  formatDateTimeKo,
  maskLogPreview,
  readText,
} from "../../../lib/admin-truth";
import { useAdminSessionRevision } from "../../../lib/use-admin-session";
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

const FACT_TOOL_LABELS: Record<string, string> = {
  getBalance: "회원 잔액 확인",
  getBuckets: "원금·수익·보관 금액 확인",
  getDepositUsdt: "테더 입금 확인",
  getKrwDeposit: "원화 입금 확인",
  getOpportunity: "수익 기회 확인",
  getExecution: "수익 진행 상태 확인",
  getKyc: "본인 확인 상태 확인",
  getReferral: "친구 초대 혜택 확인",
  getCampaigns: "진행 중인 행사 확인",
  getPractice: "연습 잔액 확인",
  getUsdtGuide: "테더 이용 안내 확인",
  searchHelp: "도움말 검색",
  evalBenefitsSummary: "혜택 설명 안전 확인",
};

const EVAL_SET_LABELS: Record<string, string> = {
  "eval/p_fact.jsonl": "사실 답변 정확도 점검",
  "eval/q_no_money.jsonl": "근거 없는 돈 숫자 방지 점검",
  "eval/s_refuse.jsonl": "거절이 필요한 질문 점검",
};

function laneLabel(value: unknown): string | null {
  const lane = readText(value);
  if (lane === "P") return "사실 확인 답변";
  if (lane === "G") return "일반 안내 답변";
  if (lane === "S") return "안전상 답변 제한";
  return lane;
}

function guardLabel(value: unknown): string | null {
  if (!value || typeof value !== "object") return readText(value);
  const status = readText((value as { status?: unknown }).status);
  if (status === "pass") return "안전 확인 통과";
  if (status === "refresh") return "최신 정보 다시 확인";
  if (status === "block") return "답변 차단";
  if (status === "reroute_p") return "사실 확인 답변으로 전환";
  if (status === "ungrounded") return "근거 부족";
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

function friendlyToolLabel(value: string): string {
  return FACT_TOOL_LABELS[value] ?? value;
}

function friendlyEvalLabel(value: string): string {
  return EVAL_SET_LABELS[value] ?? value;
}

function AiLogsContent() {
  const searchParams = useSearchParams();
  const sessionRevision = useAdminSessionRevision();
  const tab = useMemo((): AiLogsTab => {
    const raw = searchParams.get("tab");
    if (raw && (TABS as readonly string[]).includes(raw)) return raw as AiLogsTab;
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
      } else if (tab === "pick") {
        const next = await adminGet<PickList>(pickApi);
        if (!cancelled) setPicks(next);
      } else if (tab === "eval") {
        const next = await adminGet<EvalStatus>(evalApi);
        if (!cancelled) setEvalStatus(next);
      } else if (tab === "coach") {
        const next = await adminGet<CoachCatalog>(coachApi);
        if (!cancelled) setCoach(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionRevision, tab]);

  const logItems = logs?.ok && Array.isArray(logs.data.items) ? logs.data.items : null;
  const pickItems = picks?.ok && Array.isArray(picks.data.items) ? picks.data.items : null;

  return (
    <main className="p-6 text-lux-text" data-canon="admin-ai-logs" data-testid="admin-ai-logs-page">
      <p className="admin-eyebrow">AI 운영 투명성</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{T.admin.navigation.aiLogs}</h1>
      <p className="mt-2 max-w-3xl text-sm text-lux-text-muted">
        퍼뜩이 어떤 근거로 답하고 추천했는지 확인합니다. 실제 판단 결과나 돈의 이동은 이 화면에서 바꿀 수 없습니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="퍼뜩 판단 기록 메뉴">
        {TABS.map((t) => (
          <a
            key={t}
            href={`/admin/ai-logs?tab=${t}`}
            data-tab={t}
            className={
              t === tab
                ? "rounded-xl border border-lux-border bg-lux-elevated px-3 py-2 text-sm font-bold text-lux-accent"
                : "rounded-xl border border-transparent px-3 py-2 text-sm text-lux-text-muted"
            }
          >
            {TAB_LABEL[t]}
          </a>
        ))}
      </nav>

      {tab === "traces" && (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-panel="answer_traces" data-testid="ai-logs-traces-panel" data-list-api={listApi}>
          <h2 className="text-lg font-bold">답변이 만들어진 과정</h2>
          <p className="mt-1 text-sm text-lux-text-muted">사용자가 입력한 전체 내용은 개인정보 보호를 위해 보여 주지 않습니다.</p>
          {!logs ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !logs.ok ? (
            <AdminFetchNote failure={logs.failure} />
          ) : logItems && logItems.length === 0 ? (
            <div className="admin-empty-state mt-4" data-testid="ai-logs-empty-traces">표시할 판단 기록이 없습니다.</div>
          ) : logItems ? (
            <div className="admin-table-wrap mt-4">
              <table className="admin-table">
                <thead><tr><th>만든 시각</th><th>답변 종류</th><th>안전 확인</th><th>미리보기</th><th>기술 정보</th></tr></thead>
                <tbody>
                  {logItems.map((item, idx) => (
                    <tr key={readText(item.id) ?? String(idx)}>
                      <td data-label="만든 시각">{formatDateTimeKo(item.created_at ?? item.createdAt) ?? "—"}</td>
                      <td data-label="답변 종류"><AdminTruth value={laneLabel(item.lane)} /></td>
                      <td data-label="안전 확인"><AdminTruth value={guardLabel(item.guard_result ?? item.guardResult)} /></td>
                      <td data-label="미리보기">{maskLogPreview(item.answer_preview ?? item.answerPreview) ?? "—"}</td>
                      <td data-label="기술 정보">
                        <details className="admin-details">
                          <summary>고급 정보 보기</summary>
                          <p className="mt-2">답변 제공처 <span className="admin-mono">{readText(item.provider_id ?? item.providerId) ?? "—"}</span></p>
                          <p>처리 방식 <span className="admin-mono">{readText(item.answer_path ?? item.answerPath) ?? "—"}</span></p>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <AdminTruth value={null} />}
        </section>
      )}

      {tab === "pick" && (
        <section className="mt-6 rounded-2xl border border-lux-border p-4" data-panel="ai_pick_readonly" data-testid="ai-logs-pick-panel" data-pick-api={pickApi}>
          <h2 className="text-lg font-bold">퍼뜩 추천 근거</h2>
          <p className="mt-1 text-sm text-lux-text-muted" data-forbid="ai_score_admin_override">추천 점수는 실제 판단 결과이며 이 화면에서 임의로 바꿀 수 없습니다.</p>
          {!picks ? (
            <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p>
          ) : !picks.ok ? (
            <AdminFetchNote failure={picks.failure} />
          ) : pickItems && pickItems.length === 0 ? (
            <div className="admin-empty-state mt-4" data-testid="ai-logs-empty-pick">표시할 추천 기록이 없습니다.</div>
          ) : pickItems ? (
            <div className="admin-table-wrap mt-4">
              <table className="admin-table"><thead><tr><th>수익 기회</th><th>추천 확신 정도</th><th>추천 결과</th><th>판단 기록</th></tr></thead><tbody>
                {pickItems.map((item, idx) => (
                  <tr key={readText(item.opportunity_id ?? item.opportunityId) ?? String(idx)}>
                    <td data-label="수익 기회" className="admin-mono">{readText(item.opportunity_id ?? item.opportunityId) ?? "—"}</td>
                    <td data-label="추천 확신 정도"><AdminTruth value={readText(item.ai_confidence_score ?? item.aiConfidenceScore)} /></td>
                    <td data-label="추천 결과"><AdminTruth value={recommendationLabel(item.is_ai_pick ?? item.isAiPick)} /></td>
                    <td data-label="판단 기록" className="admin-mono">{readText(item.feature_vector_hash ?? item.featureVectorHash) ?? "—"}</td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          ) : <AdminTruth value={null} />}
        </section>
      )}

      {tab === "eval" && (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-panel="eval_gate" data-testid="ai-logs-eval-panel" data-eval-api={evalApi}>
          <h2 className="text-lg font-bold">서비스에 쓰기 전 확인</h2>
          <p className="mt-1 text-sm text-lux-text-muted" data-auto-learning="false" data-forbid="auto_learning_on">안전 확인을 마친 답변 기준만 서비스에 반영합니다.</p>
          {!evalStatus ? <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !evalStatus.ok ? <AdminFetchNote failure={evalStatus.failure} /> : (
            <div className="admin-stat-grid mt-4">
              <div className="admin-stat-card"><p className="admin-stat-label">스스로 답변 기준 바꾸기</p><p className="admin-stat-value text-base"><AdminTruth value={enabledLabel(evalStatus.data.autoLearningEnabled)} /></p></div>
              <div className="admin-stat-card"><p className="admin-stat-label">운영 원칙</p><p className="admin-stat-value text-base">검증 후 반영</p></div>
            </div>
          )}
        </section>
      )}

      {tab === "coach" && (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-panel="coach" data-testid="ai-logs-coach-panel" data-coach-api={coachApi}>
          <h2 className="text-lg font-bold">퍼뜩 답변 기준</h2>
          <p className="mt-1 text-sm text-lux-text-muted">개발자 내부 이름 대신 관리자가 이해할 수 있는 실제 확인 항목을 보여 줍니다.</p>
          {!coach ? <p className="mt-4 text-sm text-lux-text-muted">{T.admin.state.loading}</p> : !coach.ok ? <AdminFetchNote failure={coach.failure} /> : (
            <>
              <div className="admin-stat-grid mt-4">
                <div className="admin-stat-card"><p className="admin-stat-label">스스로 기준 변경</p><p className="admin-stat-value text-base"><AdminTruth value={enabledLabel(coach.data.autoLearningEnabled)} /></p></div>
                <div className="admin-stat-card" data-forbid="money_hallucination"><p className="admin-stat-label">근거 없는 수익 숫자 허용 한도</p><p className="admin-stat-value"><AdminTruth value={readText(coach.data.moneyHallucinationRateMax)} /></p></div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-lux-border p-4">
                  <h3 className="font-bold">사실 확인에 쓰는 정보</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {asList(coach.data.factTools).map((tool) => (
                      <li key={tool} data-field="factTools" className="rounded-xl border border-lux-border/70 px-3 py-2">
                        <strong>{friendlyToolLabel(tool)}</strong>
                        <details className="mt-1 text-xs text-lux-text-muted"><summary>기술 이름 보기</summary><code>{tool}</code></details>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-lux-border p-4">
                  <h3 className="font-bold">서비스 반영 전 시험</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    {asList(coach.data.evalSets).map((set) => (
                      <li key={set} data-field="eval_sets" className="rounded-xl border border-lux-border/70 px-3 py-2">
                        <strong>{friendlyEvalLabel(set)}</strong>
                        <details className="mt-1 text-xs text-lux-text-muted"><summary>기술 이름 보기</summary><code>{set}</code></details>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {tab === "spotcheck" && (
        <section className="mt-6 rounded-2xl border border-lux-border p-5" data-panel="spotcheck" data-testid="ai-logs-spotcheck-panel">
          <h2 className="text-lg font-bold">사람 사용성 점검</h2>
          <p className="mt-1 text-sm text-lux-text-muted">사람이 직접 확인한 결과만 표시합니다. 자동 점검 결과를 사람 확인으로 꾸미지 않습니다.</p>
          <div className="admin-empty-state mt-4" data-testid="ai-logs-empty-spotcheck">
            <strong className="text-lux-text">아직 사람이 직접 확인한 결과가 없습니다.</strong>
            <p className="mt-1 text-sm">실제 사람 점검 결과가 연결되기 전까지 PASS로 표시하지 않습니다.</p>
          </div>
        </section>
      )}
    </main>
  );
}

export default function Page() {
  return <SearchParamsBoundary><AiLogsContent /></SearchParamsBoundary>;
}
